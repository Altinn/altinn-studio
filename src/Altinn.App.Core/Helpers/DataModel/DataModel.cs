using System.Collections;
using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Helpers.DataModel;

/// <summary>
/// Get data fields from a model, using string keys (like "Bedrifter[1].Ansatte[1].Alder")
/// </summary>
public class DataModel
{
    private readonly object _defaultServiceModel;
    private readonly Dictionary<string, object> _dataModels = [];

    /// <summary>
    /// Constructor that wraps a POCO data model, and gives extra tool for working with the data
    /// </summary>
    public DataModel(IEnumerable<KeyValuePair<DataElement, object>> dataModels)
    {
        var count = 0;
        foreach (var (dataElement, data) in dataModels)
        {
            if (count++ == 0)
            {
                DefaultDataElement = dataElement;
                _defaultServiceModel = data;
            }
            _dataModels.Add(dataElement.DataType, data);
        }
        Debug.Assert(DefaultDataElement is not null, "DataModel initialized with no data elements");
        Debug.Assert(_defaultServiceModel is not null, "DataModel initialized with no data");
    }

    private object? ServiceModel(ModelBinding key)
    {
        if (key.DataType == null)
        {
            return _defaultServiceModel;
        }

        if (_dataModels.TryGetValue(key.DataType, out var dataModel))
        {
            Debug.Assert(dataModel is not null);
            return dataModel;
        }

        return null;
    }

    /// <summary>
    /// Get model data based on key and optionally indicies
    /// </summary>
    /// <remarks>
    /// Inline indicies in the key "Bedrifter[1].Ansatte[1].Alder" will override
    /// normal indicies, and if both "Bedrifter" and "Ansatte" is lists,
    /// "Bedrifter[1].Ansatte.Alder", will fail, because the indicies will be reset
    /// after an inline index is used
    /// </remarks>
    public object? GetModelData(ModelBinding key, ReadOnlySpan<int> indicies = default)
    {
        return GetModelDataRecursive(key.Field.Split('.'), 0, ServiceModel(key), indicies);
    }

    /// <summary>
    /// Get the count of data elements set in a group (enumerable)
    /// </summary>
    public int? GetModelDataCount(ModelBinding key, ReadOnlySpan<int> indicies = default)
    {
        if (GetModelDataRecursive(key.Field.Split('.'), 0, ServiceModel(key), indicies) is IEnumerable childEnum)
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

    private object? GetModelDataRecursive(string[] keys, int index, object? currentModel, ReadOnlySpan<int> indicies)
    {
        if (index == keys.Length || currentModel is null)
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
        if (!(childModel is not string && childModel is IEnumerable childModelList))
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

    /// <summary>
    /// Get an array of all keys in repeating groups that match this key
    /// </summary>
    /// <example>
    /// GetResolvedKeys("data.bedrifter.styre.medlemmer") =>
    /// [
    ///     "data.bedrifter[0].styre.medlemmer",
    ///     "data.bedrifter[1].styre.medlemmer"
    /// ]
    /// </example>
    public ModelBinding[] GetResolvedKeys(ModelBinding key)
    {
        var keyParts = key.Field.Split('.');
        return GetResolvedKeysRecursive(key, keyParts, ServiceModel(key));
    }

    private static string JoinFieldKeyParts(string? currentKey, string? key)
    {
        if (String.IsNullOrEmpty(currentKey))
        {
            return key ?? "";
        }
        if (String.IsNullOrEmpty(key))
        {
            return currentKey;
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
    public static int[]? GetRowIndices(ModelBinding key)
    {
        var match = _rowIndexRegex.Match(key.Field);
        var rowIndices = match.Groups[3].Captures.Select(c => c.Value).Select(int.Parse).ToArray();
        return rowIndices.Length == 0 ? null : rowIndices;
    }

    private static ModelBinding[] GetResolvedKeysRecursive(
        ModelBinding fullKey,
        string[] keyParts,
        object? currentModel,
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
            return [fullKey with { Field = currentKey }];
        }

        var (key, groupIndex) = ParseKeyPart(keyParts[currentIndex]);
        var prop = currentModel.GetType().GetProperties().FirstOrDefault(p => IsPropertyWithJsonName(p, key));
        var childModel = prop?.GetValue(currentModel);
        if (childModel is null)
        {
            return [];
        }

        if (childModel is not string && childModel is IEnumerable childModelList)
        {
            // childModel is a list
            if (groupIndex is null)
            {
                // Index not specified, recurse on all elements
                int i = 0;
                var resolvedKeys = new List<ModelBinding>();
                foreach (var child in childModelList)
                {
                    var newResolvedKeys = GetResolvedKeysRecursive(
                        fullKey,
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
                fullKey,
                keyParts,
                childModel,
                currentIndex + 1,
                JoinFieldKeyParts(currentKey, key + "[" + groupIndex + "]")
            );
        }

        // Otherwise, just recurse
        return GetResolvedKeysRecursive(
            fullKey,
            keyParts,
            childModel,
            currentIndex + 1,
            JoinFieldKeyParts(currentKey, key)
        );
    }

    private static object? GetElementAt(IEnumerable enumerable, int index)
    {
        // Return the element with index = groupIndex (could not find another way to get the nth element in non-generic enumerable)
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

    private static void AddIndiciesRecursive(
        List<string> ret,
        Type currentModelType,
        ReadOnlySpan<string> keys,
        ReadOnlySpan<int> indicies
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
        // Other enumerable types is treated as a collection
        if (childType != typeof(string) && childType.IsAssignableTo(typeof(IEnumerable)) && currentIndex is not null)
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

            AddIndiciesRecursive(ret, childTypeEnumerableParameter, keys.Slice(1), indicies);
        }
        else
        {
            if (groupIndex is not null)
            {
                throw new DataModelException("Index on non indexable property");
            }

            ret.Add(key);
            AddIndiciesRecursive(ret, childType, keys.Slice(1), indicies);
        }
    }

    /// <summary>
    /// Return a full dataModelBiding from a context aware binding by adding indicies
    /// </summary>
    /// <example>
    /// key = "bedrift.ansatte.navn"
    /// indicies = [1,2]
    /// => "bedrift[1].ansatte[2].navn"
    /// </example>
    public ModelBinding AddIndicies(ModelBinding key, ReadOnlySpan<int> indicies = default)
    {
        if (indicies.Length == 0)
        {
            return key with { DataType = key.DataType ?? DefaultDataElement.DataType };
        }
        var serviceModel = ServiceModel(key);
        if (serviceModel is null)
        {
            throw new DataModelException("Could not find service model for dataType " + key.DataType);
        }

        var ret = new List<string>();
        AddIndiciesRecursive(ret, serviceModel.GetType(), key.Field.Split('.'), indicies);
        return new ModelBinding
        {
            Field = string.Join('.', ret),
            DataType = key.DataType ?? DefaultDataElement.DataType
        };
    }

    private static bool IsPropertyWithJsonName(PropertyInfo propertyInfo, string key)
    {
        var ca = propertyInfo.CustomAttributes;

        // Read [JsonPropertyName("propName")] from System.Text.Json
        if (
            ca.FirstOrDefault(attr => attr.AttributeType == typeof(JsonPropertyNameAttribute))
                ?.ConstructorArguments.FirstOrDefault()
                .Value
            is string systemTextJsonAttribute
        )
        {
            return systemTextJsonAttribute == key;
        }

        // Read [JsonProperty("propName")] from Newtonsoft.Json
        // To remove dependency on Newtonsoft, while keeping compatibility
        // var newtonsoft_json_attribute = (ca.FirstOrDefault(attr => attr.AttributeType.FullName == "Newtonsoft.Json.JsonPropertyAttribute")?.ConstructorArguments.FirstOrDefault().Value as string);
        if (
            ca.FirstOrDefault(attr => attr.AttributeType == typeof(Newtonsoft.Json.JsonPropertyAttribute))
                ?.ConstructorArguments.FirstOrDefault()
                .Value
            is string newtonsoftJsonAttribute
        )
        {
            return newtonsoftJsonAttribute == key;
        }

        // Fallback to property name if all attributes could not be found
        var keyName = propertyInfo.Name;
        return keyName == key;
    }

    /// <summary>
    /// Set the value of a field in the model to default (null)
    /// </summary>
    public void RemoveField(ModelBinding key, RowRemovalOption rowRemovalOption)
    {
        var keysSplit = key.Field.Split('.');
        var keys = keysSplit[0..^1];
        var (lastKey, lastGroupIndex) = ParseKeyPart(keysSplit[^1]);

        var containingObject = GetModelDataRecursive(keys, 0, ServiceModel(key), default);
        if (containingObject is null)
        {
            // Already empty field
            return;
        }

        if (containingObject is IEnumerable)
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
            if (propertyValue is not IList listValue)
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

    /// <summary>
    /// Verify that a key is valid for the model
    /// </summary>
    public bool VerifyKey(ModelBinding key)
    {
        var serviceModel = ServiceModel(key);
        if (serviceModel is null)
        {
            return false;
        }
        return VerifyKeyRecursive(key.Field.Split('.'), 0, serviceModel.GetType());
    }

    /// <summary>
    /// The default data element when <see cref="ModelBinding.DataType"/> is not set
    /// </summary>
    public DataElement DefaultDataElement { get; }

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
        // Other enumerable types is treated as a collection
        if (childType != typeof(string) && childType.IsAssignableTo(typeof(IEnumerable)))
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
