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

        var (key, groupIndex) = ParseKeyPart(keys[index]);
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
    /// Get all valid indexed keys for the field, depending on the number of rows in repeating groups
    /// </summary>
    /// <example>
    /// GetResolvedKeys("data.bedrifter.styre.medlemmer") =>
    /// [
    ///     "data.bedrifter[0].styre.medlemmer",
    ///     "data.bedrifter[1].styre.medlemmer"
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
        return GetResolvedKeysRecursive(fieldParts, _dataModel);
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

    private static string[] GetResolvedKeysRecursive(
        string[] keyParts,
        object currentModel,
        int currentIndex = 0,
        string currentKey = ""
    )
    {
        if (currentModel is null)
        {
            return [];
        }

        if (currentIndex == keyParts.Length)
        {
            return [currentKey];
        }

        var (key, groupIndex) = ParseKeyPart(keyParts[currentIndex]);
        var prop = Array.Find(currentModel.GetType().GetProperties(), p => IsPropertyWithJsonName(p, key));
        var childModel = prop?.GetValue(currentModel);
        if (childModel is null)
        {
            return [];
        }

        if (childModel is not string && childModel is System.Collections.IEnumerable childModelList)
        {
            // childModel is a list
            if (groupIndex is null)
            {
                // Index not specified, recurse on all elements
                int i = 0;
                var resolvedKeys = new List<string>();
                foreach (var child in childModelList)
                {
                    var newResolvedKeys = GetResolvedKeysRecursive(
                        keyParts,
                        child,
                        currentIndex + 1,
                        JoinFieldKeyParts(currentKey, key + "[" + i + "]")
                    );
                    resolvedKeys.AddRange(newResolvedKeys);
                    i++;
                }
                return resolvedKeys.ToArray();
            }
            // Index specified, recurse on that element
            return GetResolvedKeysRecursive(
                keyParts,
                childModel,
                currentIndex + 1,
                JoinFieldKeyParts(currentKey, key + "[" + groupIndex + "]")
            );
        }

        // Otherwise, just recurse
        return GetResolvedKeysRecursive(keyParts, childModel, currentIndex + 1, JoinFieldKeyParts(currentKey, key));
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

    private static (string key, int? index) ParseKeyPart(string keyPart)
    {
        if (keyPart.Length == 0)
        {
            throw new DataModelException("Tried to parse empty part of dataModel key");
        }
        if (keyPart.Last() != ']')
        {
            return (keyPart, null);
        }
        var match = _keyPartRegex.Match(keyPart);
        return (match.Groups[1].Value, int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture));
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
        var (key, groupIndex) = ParseKeyPart(keys[0]);
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
        var (lastKey, lastGroupIndex) = ParseKeyPart(fieldSplit[^1]);

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
