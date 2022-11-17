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
        if (GetModelDataRecursive(key.Split('.'), 0, _serviceModel, indicies) is System.Collections.IEnumerable childEnum)
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

    private static readonly Regex KeyPartRegex = new Regex(@"^(\w+)\[(\d+)\]?$");
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
        var match = KeyPartRegex.Match(keypart);
        return (match.Groups[1].Value, int.Parse(match.Groups[2].Value));

    }

    private static void AddIndiciesRecursive(List<string> ret, Type currentModelType, ReadOnlySpan<string> keys, string fullKey, ReadOnlySpan<int> indicies, ReadOnlySpan<int> originalIndicies)
    {
        if (keys.Length == 0)
        {
            return;
        }
        var (key, groupIndex) = ParseKeyPart(keys[0]);
        var prop = currentModelType.GetProperties().FirstOrDefault(p => IsPropertyWithJsonName(p, key));
        if (prop is null)
        {
            throw new DataModelException($"Unknown model property {key} in {fullKey}");
        }

        var childType = prop.PropertyType;
        // Strings are enumerable in C#
        // Other enumerable types is treated as an collection
        if (childType != typeof(string) && childType.IsAssignableTo(typeof(System.Collections.IEnumerable)))
        {
            // Hope the first generic argument is tied to the IEnumerable implementation
            var childTypeEnumerableParameter = childType.GetGenericArguments().FirstOrDefault();

            if (childTypeEnumerableParameter is null)
            {
                throw new DataModelException("DataModels must have generic IEnumerable<> implementation for list");
            }

            if (groupIndex is null)
            {
                if (indicies.Length == 0)
                {
                    throw new DataModelException($"Missmatch in indicies in {fullKey} on key {key} and [{string.Join(", ", originalIndicies.ToArray())}]");
                }
                ret.Add($"{key}[{indicies[0]}]");
            }
            else
            {
                ret.Add($"{key}[{groupIndex}]");

                // Ignore indexes after a literal index has been set
                indicies = new int[] { groupIndex.Value };
            }

            AddIndiciesRecursive(ret, childTypeEnumerableParameter, keys.Slice(1), fullKey, indicies.Slice(1), originalIndicies);
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
        var system_text_json_attribute = (ca.FirstOrDefault(attr => attr.AttributeType == typeof(System.Text.Json.Serialization.JsonPropertyNameAttribute))?.ConstructorArguments.FirstOrDefault().Value as string);
        if (system_text_json_attribute is not null)
        {
            return system_text_json_attribute == key;
        }

        // Read [JsonProperty("propName")] from Newtonsoft.Json
        var newtonsoft_json_attribute = (ca.FirstOrDefault(attr => attr.AttributeType == typeof(Newtonsoft.Json.JsonPropertyAttribute))?.ConstructorArguments.FirstOrDefault().Value as string);
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
    public void RemoveField(string key)
    {
        var keys_split = key.Split('.');
        var keys = keys_split[0..^1];
        var (lastKey, lastGroupIndex) = ParseKeyPart(keys_split[^1]);

        if (lastGroupIndex is not null)
        {
            // TODO: Consider implementing. Would be required for rowHidden on groups
            throw new NotImplementedException($"Deleting elements in List is not implemented {key}");
        }

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


        var property = containingObject.GetType().GetProperties().FirstOrDefault(p => IsPropertyWithJsonName(p, lastKey));
        if (property is null)
        {
            return;
        }

        var nullValue = property.PropertyType.GetTypeInfo().IsValueType ? Activator.CreateInstance(property.PropertyType) : null;

        property.SetValue(containingObject, nullValue);
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
            var childTypeEnumerableParameter = childType.GetInterfaces()
               .Where(t => t.IsGenericType && t.GetGenericTypeDefinition() == typeof(IEnumerable<>))
               .Select(t => t.GetGenericArguments()[0]).FirstOrDefault();

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