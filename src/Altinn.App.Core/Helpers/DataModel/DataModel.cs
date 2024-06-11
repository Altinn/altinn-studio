using System.Globalization;
using System.Reflection;
using System.Text.RegularExpressions;

namespace Altinn.App.Core.Helpers.DataModel;

/// <summary>
/// Get data fields from a model, using string keys (like "Bedrifter[1].Ansatte[1].Alder")
/// </summary>
public class DataModel : IDataModelAccessor
{
    private readonly object _serviceModel;

    /// <summary>
    /// Constructor that wraps a PCOC data model, and gives extra tool for working with the data
    /// </summary>
    public DataModel(object serviceModel)
    {
        _serviceModel = serviceModel;
    }

    /// <inheritdoc />
    public object? GetModelData(string key, ReadOnlySpan<int> indicies = default)
    {
        return GetModelDataRecursive(key.Split('.'), 0, _serviceModel, indicies);
    }

    /// <inheritdoc />
    public int? GetModelDataCount(string key, ReadOnlySpan<int> indicies = default)
    {
        if (
            GetModelDataRecursive(key.Split('.'), 0, _serviceModel, indicies)
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

    private object? GetModelDataRecursive(string[] keys, int index, object currentModel, ReadOnlySpan<int> indicies)
    {
        if (index == keys.Length)
        {
            return currentModel;
        }

        var (key, groupIndex) = ParseKeyPart(keys[index]);
        var prop = currentModel.GetType().GetProperties().FirstOrDefault(p => IsPropertyWithJsonName(p, key));
        var childModel = prop?.GetValue(currentModel);
        if (childModel is null)
        {
            return null;
        }

        // Strings are enumerable in C#
        // Other enumerable types is treated as an collection
        if (!(childModel is not string && childModel is System.Collections.IEnumerable childModelList))
        {
            return GetModelDataRecursive(keys, index + 1, childModel, indicies);
        }

        if (groupIndex is null)
        {
            if (index == keys.Length - 1)
            {
                return childModelList;
            }

            if (indicies.Length == 0)
            {
                return null; // Error index for collection not specified
            }

            groupIndex = indicies[0];
        }
        else
        {
            indicies = default; //when you use a literal index, the context indecies are not to be used later.
        }

        var elementAt = GetElementAt(childModelList, groupIndex.Value);
        if (elementAt is null)
        {
            return null; // Error condition, no value at index
        }

        return GetModelDataRecursive(keys, index + 1, elementAt, indicies.Length > 0 ? indicies.Slice(1) : indicies);
    }

    /// <inheritdoc />
    public string[] GetResolvedKeys(string key)
    {
        if (_serviceModel is null)
        {
            return [];
        }

        var keyParts = key.Split('.');
        return GetResolvedKeysRecursive(keyParts, _serviceModel);
    }

    internal static string JoinFieldKeyParts(string? currentKey, string? key)
    {
        if (String.IsNullOrEmpty(currentKey))
        {
            return key ?? "";
        }
        if (String.IsNullOrEmpty(key))
        {
            return currentKey ?? "";
        }

        return currentKey + "." + key;
    }

    private static readonly Regex _rowIndexRegex = new Regex(
        @"^([^[\]]+(\[(\d+)])?)+$",
        RegexOptions.None,
        TimeSpan.FromSeconds(1)
    );

    /// <summary>
    /// Get the row indices from a key
    /// </summary>
    public static int[]? GetRowIndices(string key)
    {
        var match = _rowIndexRegex.Match(key);
        var rowIndices = match.Groups[3].Captures.Select(c => c.Value).Select(int.Parse).ToArray();
        return rowIndices.Length == 0 ? null : rowIndices;
    }

    private string[] GetResolvedKeysRecursive(
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
        var prop = currentModel?.GetType().GetProperties().FirstOrDefault(p => IsPropertyWithJsonName(p, key));
        var childModel = prop?.GetValue(currentModel);
        if (childModel is null)
        {
            return [];
        }

        if (childModel is not string && childModel is System.Collections.IEnumerable childModelList)
        {
            // childModel is an array
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
            else
            {
                // Index specified, recurse on that element
                return GetResolvedKeysRecursive(
                    keyParts,
                    childModel,
                    currentIndex + 1,
                    JoinFieldKeyParts(currentKey, key + "[" + groupIndex + "]")
                );
            }
        }

        // Otherwise, just recurse
        return GetResolvedKeysRecursive(keyParts, childModel, currentIndex + 1, JoinFieldKeyParts(currentKey, key));
    }

    private static object? GetElementAt(System.Collections.IEnumerable enumerable, int index)
    {
        // Return the element with index = groupIndex (could not find anohter way to get the n'th element in non generic enumerable)
        foreach (var arrayElement in enumerable)
        {
            if (index-- < 1)
            {
                return arrayElement;
            }
        }

        return null;
    }

    private static readonly Regex _keyPartRegex = new Regex(@"^([^\s\[\]\.]+)\[(\d+)\]?$");

    internal static (string key, int? index) ParseKeyPart(string keypart)
    {
        if (keypart.Length == 0)
        {
            throw new DataModelException("Tried to parse empty part of dataModel key");
        }
        if (keypart.Last() != ']')
        {
            return (keypart, null);
        }
        var match = _keyPartRegex.Match(keypart);
        return (match.Groups[1].Value, int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture));
    }

    private static void AddIndiciesRecursive(
        List<string> ret,
        Type currentModelType,
        ReadOnlySpan<string> keys,
        string fullKey,
        ReadOnlySpan<int> indicies,
        ReadOnlySpan<int> originalIndicies
    )
    {
        if (keys.Length == 0)
        {
            return;
        }
        var (key, groupIndex) = ParseKeyPart(keys[0]);
        var prop = currentModelType.GetProperties().FirstOrDefault(p => IsPropertyWithJsonName(p, key));
        if (prop is null)
        {
            throw new DataModelException($"Unknown model property {key} in {string.Join(".", ret)}.{key}");
        }

        var currentIndex = groupIndex ?? (indicies.Length > 0 ? indicies[0] : null);

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
            if (indicies.Length > 0)
            {
                indicies = indicies.Slice(1);
            }

            AddIndiciesRecursive(ret, childTypeEnumerableParameter, keys.Slice(1), fullKey, indicies, originalIndicies);
        }
        else
        {
            if (groupIndex is not null)
            {
                throw new DataModelException("Index on non indexable property");
            }

            ret.Add(key);
            AddIndiciesRecursive(ret, childType, keys.Slice(1), fullKey, indicies, originalIndicies);
        }
    }

    /// <inheritdoc />
    public string AddIndicies(string key, ReadOnlySpan<int> indicies = default)
    {
        if (indicies.Length == 0)
        {
            return key;
        }

        var ret = new List<string>();
        AddIndiciesRecursive(ret, this._serviceModel.GetType(), key.Split('.'), key, indicies, indicies);
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

    /// <inheritdoc />
    public void RemoveField(string key, RowRemovalOption rowRemovalOption)
    {
        var keys_split = key.Split('.');
        var keys = keys_split[0..^1];
        var (lastKey, lastGroupIndex) = ParseKeyPart(keys_split[^1]);

        var containingObject = GetModelDataRecursive(keys, 0, _serviceModel, default);
        if (containingObject is null)
        {
            // Already empty field
            return;
        }

        if (containingObject is System.Collections.IEnumerable)
        {
            throw new NotImplementedException($"Tried to remove field {key}, ended in an enumerable");
        }

        var property = containingObject
            .GetType()
            .GetProperties()
            .FirstOrDefault(p => IsPropertyWithJsonName(p, lastKey));
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
                    $"Tried to remove row {key}, ended in a non-list ({propertyValue?.GetType()})"
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

    /// <inheritdoc />
    public bool VerifyKey(string key)
    {
        return VerifyKeyRecursive(key.Split('.'), 0, _serviceModel.GetType());
    }

    private bool VerifyKeyRecursive(string[] keys, int index, Type currentModel)
    {
        if (index == keys.Length)
        {
            return true;
        }
        if (keys[index].Length == 0)
        {
            return false; // invalid key part
        }

        var (key, groupIndex) = ParseKeyPart(keys[index]);
        var prop = currentModel.GetProperties().FirstOrDefault(p => IsPropertyWithJsonName(p, key));
        if (prop is null)
        {
            return false;
        }

        var childType = prop.PropertyType;

        // Strings are enumerable in C#
        // Other enumerable types is treated as an collection
        if (childType != typeof(string) && childType.IsAssignableTo(typeof(System.Collections.IEnumerable)))
        {
            var childTypeEnumerableParameter = childType
                .GetInterfaces()
                .Where(t => t.IsGenericType && t.GetGenericTypeDefinition() == typeof(IEnumerable<>))
                .Select(t => t.GetGenericArguments()[0])
                .FirstOrDefault();

            if (childTypeEnumerableParameter is not null)
            {
                return VerifyKeyRecursive(keys, index + 1, childTypeEnumerableParameter);
            }
        }
        else if (groupIndex is not null)
        {
            return false; // Key parts with group index must be IEnumerable
        }

        return VerifyKeyRecursive(keys, index + 1, childType);
    }
}
