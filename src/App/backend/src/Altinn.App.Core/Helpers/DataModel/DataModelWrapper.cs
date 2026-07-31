using System.Globalization;
using System.Reflection;
using System.Text.RegularExpressions;

namespace Altinn.App.Core.Helpers.DataModel;

/// <summary>
/// Get data fields from a model, using string keys (like "Bedrifter[1].Ansatte[1].Alder")
/// </summary>
[Obsolete("Will be removed in v9 use Altinn.App.Core.Helpers.DataModel.FormDataWrapperFactory instead")]
public class DataModelWrapper
{
    private readonly object _dataModel;

    /// <summary>
    /// Constructor that wraps a POCO data model, and gives extra tools for working with the data in an object using json like keys and reflection
    /// </summary>
    public DataModelWrapper(object dataModel)
    {
        _dataModel = dataModel;
    }

    /// <summary>
    /// Get model data based on key and optionally indexes
    /// </summary>
    /// <remarks>
    /// Inline indexes in the key "Bedrifter[1].Ansatte[1].Alder" will override
    /// normal indexes, and if both "Bedrifter" and "Ansatte" is lists,
    /// "Bedrifter[1].Ansatte.Alder", will fail, because the indexes will be reset
    /// after an inline index is used
    /// </remarks>
    public object? GetModelData(string field, ReadOnlySpan<int> rowIndexes = default)
    {
        return GetModelDataRecursive(field.Split('.'), 0, _dataModel, rowIndexes);
    }

    /// <summary>
    /// Get the count of data elements set in a group (enumerable)
    /// </summary>
    public int? GetModelDataCount(string field, ReadOnlySpan<int> rowIndexes = default)
    {
        if (
            GetModelDataRecursive(field.Split('.'), 0, _dataModel, rowIndexes)
            is System.Collections.IEnumerable childEnum
        )
        {
            int retCount = 0;
            foreach (var _ in childEnum)
            {
                retCount++;
            }
            return retCount;
        }

        return null;
    }

    private static object? GetModelDataRecursive(
        string[] keys,
        int index,
        object currentModel,
        ReadOnlySpan<int> rowIndexes
    )
    {
        if (index == keys.Length)
        {
            return currentModel;
        }

        var (key, groupIndex, _) = ParseKeyPart(keys[index]);
        var prop = Array.Find(currentModel.GetType().GetProperties(), p => IsPropertyWithJsonName(p, key));
        var childModel = prop?.GetValue(currentModel);
        if (childModel is null)
        {
            return null;
        }

        // Strings are enumerable in C#
        // Other enumerable types is treated as a collection
        if (!(childModel is not string && childModel is System.Collections.IEnumerable childModelList))
        {
            return GetModelDataRecursive(keys, index + 1, childModel, rowIndexes);
        }

        if (groupIndex is null)
        {
            if (index == keys.Length - 1)
            {
                return childModelList;
            }

            if (rowIndexes.Length == 0)
            {
                return null; // Error index for collection not specified
            }

            groupIndex = rowIndexes[0];
        }
        else
        {
            rowIndexes = default; //when you use a literal index, the context indecies are not to be used later.
        }

        var elementAt = GetElementAt(childModelList, groupIndex.Value);
        if (elementAt is null)
        {
            return null; // Error condition, no value at index
        }

        return GetModelDataRecursive(keys, index + 1, elementAt, rowIndexes.Length > 0 ? rowIndexes[1..] : rowIndexes);
    }

    /// <summary>
    /// Get all valid indexed keys for the field, depending on the number of rows in repeating groups.
    /// A collection in the middle of the path is always expanded over its rows. For a collection at
    /// the end of the path, "group" refers to the collection itself, "group[]" enumerates every row,
    /// and "group[n]" refers to a single row.
    /// </summary>
    /// <example>
    /// GetResolvedKeys("data.bedrifter.styre.medlemmer") =>
    /// [
    ///     "data.bedrifter[0].styre.medlemmer",
    ///     "data.bedrifter[1].styre.medlemmer"
    ///     ...
    /// ]
    /// GetResolvedKeys("data.bedrifter[].styre.medlemmer[]") =>
    /// [
    ///     "data.bedrifter[0].styre.medlemmer[0]",
    ///     "data.bedrifter[0].styre.medlemmer[1]",
    ///     "data.bedrifter[1].styre.medlemmer[0]",
    ///     ...
    /// ]
    /// </example>
    public string[] GetResolvedKeys(string field)
    {
        if (_dataModel is null)
        {
            return [];
        }

        var fieldParts = field.Split('.');
        return GetResolvedKeysRecursive(fieldParts, _dataModel, _dataModel.GetType(), currentIndex: 0, currentKey: "")
            .ToArray();
    }

    private static string JoinFieldKeyParts(string? currentKey, string? key)
    {
        if (string.IsNullOrEmpty(currentKey))
        {
            return key ?? "";
        }
        if (string.IsNullOrEmpty(key))
        {
            return currentKey;
        }

        return currentKey + "." + key;
    }

    private static IEnumerable<string> GetResolvedKeysRecursive(
        string[] keyParts,
        object? currentModel,
        Type currentType,
        int currentIndex,
        string currentKey
    )
    {
        if (currentIndex == keyParts.Length)
        {
            return [currentKey];
        }

        var (key, groupIndex, emptyIndex) = ParseKeyPart(keyParts[currentIndex]);
        var lookupType = currentModel?.GetType() ?? currentType;
        var prop = Array.Find(lookupType.GetProperties(), p => IsPropertyWithJsonName(p, key));
        if (prop is null)
        {
            return [];
        }

        var childType = prop.PropertyType;
        bool isLastPart = currentIndex == keyParts.Length - 1;

        // Collection (but not string)
        if (childType != typeof(string) && childType.IsAssignableTo(typeof(System.Collections.IEnumerable)))
        {
            // A bare collection as the last part of the path (e.g. "group") refers to the
            // collection itself, not its rows, so we return the key without enumerating (just
            // like a non-collection leaf). Use "group[]" to enumerate every row, or "group[0]"
            // to refer to a single row.
            if (isLastPart && groupIndex is null && !emptyIndex)
            {
                return [JoinFieldKeyParts(currentKey, key)];
            }

            // Indexing into, or descending through, the collection requires the instance.
            var childModel = currentModel is not null ? prop.GetValue(currentModel) : null;
            if (childModel is not System.Collections.IEnumerable childModelList)
            {
                // Null collection: there are no rows to descend into, so nothing resolves.
                return [];
            }

            if (groupIndex is not null)
            {
                var elementAt = GetElementAt(childModelList, groupIndex.Value);
                if (elementAt is null)
                    return [];
                return GetResolvedKeysRecursive(
                    keyParts,
                    elementAt,
                    elementAt.GetType(),
                    currentIndex + 1,
                    JoinFieldKeyParts(currentKey, $"{key}[{groupIndex.Value}]")
                );
            }

            // Enumerate every row: either an unindexed collection in the middle of the path
            // (descending towards the rest of the path), or "group[]" at the end.
            var resolvedKeys = new List<string>();
            int i = 0;
            foreach (var child in childModelList)
            {
                if (child is not null) // null rows can't be set/resolved, skip them
                {
                    resolvedKeys.AddRange(
                        GetResolvedKeysRecursive(
                            keyParts,
                            child,
                            child.GetType(),
                            currentIndex + 1,
                            JoinFieldKeyParts(currentKey, $"{key}[{i}]")
                        )
                    );
                }
                i++;
            }
            return resolvedKeys;
        }

        // Non-collection: resolve the key (even if the value is null) ...
        if (isLastPart)
        {
            return [JoinFieldKeyParts(currentKey, key)];
        }
        // ... otherwise traverse, falling back to the declared type when the value is null
        var childValue = currentModel is not null ? prop.GetValue(currentModel) : null;
        return GetResolvedKeysRecursive(
            keyParts,
            childValue,
            childType,
            currentIndex + 1,
            JoinFieldKeyParts(currentKey, key)
        );
    }

    private static object? GetElementAt(System.Collections.IEnumerable enumerable, int index)
    {
        // Return the element with index = groupIndex (could not find another way to get the n'th element in non-generic enumerable)
        foreach (var arrayElement in enumerable)
        {
            if (index-- < 1)
            {
                return arrayElement;
            }
        }

        return null;
    }

    private static readonly Regex _keyPartRegex = new(
        @"^([^\s\[\]\.]+)\[(\d+)\]?$",
        RegexOptions.Compiled,
        TimeSpan.FromMilliseconds(2)
    );

    private static (string key, int? index, bool emptyIndex) ParseKeyPart(string keyPart)
    {
        if (keyPart.Length == 0)
        {
            throw new DataModelException("Tried to parse empty part of dataModel key");
        }
        if (keyPart[^1] != ']')
        {
            return (keyPart, null, false);
        }
        // "group[]" refers to every row of the collection (as opposed to "group", which refers
        // to the collection itself, or "group[n]", which refers to a single row).
        if (keyPart.EndsWith("[]", StringComparison.Ordinal))
        {
            return (keyPart[..^2], null, true);
        }
        var match = _keyPartRegex.Match(keyPart);
        return (match.Groups[1].Value, int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture), false);
    }

    private static void AddIndexesRecursive(
        List<string> ret,
        Type currentModelType,
        ReadOnlySpan<string> keys,
        ReadOnlySpan<int> indexes
    )
    {
        if (keys.Length == 0)
        {
            return;
        }
        var (key, groupIndex, _) = ParseKeyPart(keys[0]);
        var prop = Array.Find(currentModelType.GetProperties(), p => IsPropertyWithJsonName(p, key));
        if (prop is null)
        {
            throw new DataModelException($"Unknown model property {key} in {string.Join(".", ret)}.{key}");
        }

        var currentIndex = groupIndex ?? (indexes.Length > 0 ? indexes[0] : null);

        var childType = prop.PropertyType;
        // Strings are enumerable in C#
        // Other enumerable types is treated as an collection
        if (
            childType != typeof(string)
            && childType.IsAssignableTo(typeof(System.Collections.IEnumerable))
            && currentIndex is not null
        )
        {
            // Hope the first generic argument is tied to the IEnumerable implementation
            var childTypeEnumerableParameter = childType.GetGenericArguments().FirstOrDefault();

            if (childTypeEnumerableParameter is null)
            {
                throw new DataModelException("DataModels must have generic IEnumerable<> implementation for list");
            }

            ret.Add($"{key}[{currentIndex}]");
            if (indexes.Length > 0)
            {
                indexes = indexes.Slice(1);
            }

            AddIndexesRecursive(ret, childTypeEnumerableParameter, keys.Slice(1), indexes);
        }
        else
        {
            if (groupIndex is not null)
            {
                throw new DataModelException("Index on non indexable property");
            }

            ret.Add(key);
            AddIndexesRecursive(ret, childType, keys.Slice(1), indexes);
        }
    }

    /// <summary>
    /// Return a full dataModelBinding from a context aware binding by adding indexes
    /// </summary>
    /// <example>
    /// key = "bedrift.ansatte.navn"
    /// indexes = [1,2]
    /// => "bedrift[1].ansatte[2].navn"
    /// </example>
    public string AddIndicies(string field, ReadOnlySpan<int> rowIndexes = default)
    {
        if (rowIndexes.Length == 0)
        {
            return field;
        }

        var ret = new List<string>();
        AddIndexesRecursive(ret, _dataModel.GetType(), field.Split('.'), rowIndexes);
        return string.Join('.', ret);
    }

    private static bool IsPropertyWithJsonName(PropertyInfo propertyInfo, string key)
    {
        var ca = propertyInfo.CustomAttributes;

        // Read [JsonPropertyName("propName")] from System.Text.Json
        var system_text_json_attribute = (
            ca.FirstOrDefault(attr =>
                    attr.AttributeType == typeof(System.Text.Json.Serialization.JsonPropertyNameAttribute)
                )
                ?.ConstructorArguments.FirstOrDefault()
                .Value as string
        );
        if (system_text_json_attribute is not null)
        {
            return system_text_json_attribute == key;
        }

        // Read [JsonProperty("propName")] from Newtonsoft.Json
        var newtonsoft_json_attribute = (
            ca.FirstOrDefault(attr => attr.AttributeType == typeof(Newtonsoft.Json.JsonPropertyAttribute))
                ?.ConstructorArguments.FirstOrDefault()
                .Value as string
        );
        // To remove dependency on Newtonsoft, while keeping compatibility
        // var newtonsoft_json_attribute = (ca.FirstOrDefault(attr => attr.AttributeType.FullName == "Newtonsoft.Json.JsonPropertyAttribute")?.ConstructorArguments.FirstOrDefault().Value as string);
        if (newtonsoft_json_attribute is not null)
        {
            return newtonsoft_json_attribute == key;
        }

        // Fallback to property name if all attributes could not be found
        var keyName = propertyInfo.Name;
        return keyName == key;
    }

    /// <summary>
    /// Set the value of a field in the model to default (null)
    /// </summary>
    public void RemoveField(string field, RowRemovalOption rowRemovalOption)
    {
        var fieldSplit = field.Split('.');
        var keys = fieldSplit[0..^1];
        var (lastKey, lastGroupIndex, _) = ParseKeyPart(fieldSplit[^1]);

        var containingObject = GetModelDataRecursive(keys, 0, _dataModel, default);
        if (containingObject is null)
        {
            // Already empty field
            return;
        }

        if (containingObject is System.Collections.IEnumerable)
        {
            throw new NotImplementedException($"Tried to remove field {field}, ended in an enumerable");
        }

        var property = Array.Find(containingObject.GetType().GetProperties(), p => IsPropertyWithJsonName(p, lastKey));
        if (property is null)
        {
            return;
        }

        if (lastGroupIndex is not null)
        {
            // Remove row from list
            var propertyValue = property.GetValue(containingObject);
            if (propertyValue is not System.Collections.IList listValue)
            {
                throw new ArgumentException(
                    $"Tried to remove row {field}, ended in a non-list ({propertyValue?.GetType()})"
                );
            }

            switch (rowRemovalOption)
            {
                case RowRemovalOption.DeleteRow:
                    listValue.RemoveAt(lastGroupIndex.Value);
                    break;
                case RowRemovalOption.SetToNull:
                    var genericType = listValue.GetType().GetGenericArguments().FirstOrDefault();
                    var nullValue = genericType?.IsValueType == true ? Activator.CreateInstance(genericType) : null;
                    listValue[lastGroupIndex.Value] = nullValue;
                    break;
                case RowRemovalOption.Ignore:
                    return;
            }
        }
        else
        {
            // Set property to null
            var nullValue = property.PropertyType.GetTypeInfo().IsValueType
                ? Activator.CreateInstance(property.PropertyType)
                : null;
            property.SetValue(containingObject, nullValue);
        }
    }
}
