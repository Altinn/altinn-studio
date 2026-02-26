using System.Globalization;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.Expressions;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Get data fields from a model, using string keys (like "Bedrifter[1].Ansatte[1].Alder")
/// </summary>
internal class ReflectionFormDataWrapper : IFormDataWrapper
{
    private readonly object _dataModel;

    /// <summary>
    /// Constructor that wraps a POCO data model, and gives extra tools for working with the data in an object using json like keys and reflection
    /// </summary>
    public ReflectionFormDataWrapper(object dataModel)
    {
        _dataModel = dataModel;
    }

    /// <inheritdoc />
    public Type BackingDataType => _dataModel.GetType();

    /// <inheritdoc />
    public T BackingData<T>()
        where T : class
    {
        return (T)_dataModel;
    }

    /// <inheritdoc />
    public object? Get(ReadOnlySpan<char> path)
    {
        if (path.IsEmpty)
        {
            return null;
        }
        var field = path.ToString();
        if (string.IsNullOrEmpty(field))
        {
            throw new ArgumentException("Field cannot be empty");
        }
        return GetModelDataRecursive(field.Split('.'), 0, _dataModel);
    }

    /// <inheritdoc />
    public bool Set(ReadOnlySpan<char> path, ExpressionValue value)
    {
        if (path.IsEmpty)
        {
            return false;
        }
        var field = path.ToString();
        if (string.IsNullOrEmpty(field))
        {
            return false;
        }
        return SetModelDataRecursive(field.Split('.'), 0, _dataModel, value);
    }

    /// <inheritdoc />
    public void RemoveField(ReadOnlySpan<char> path, RowRemovalOption rowRemovalOption)
    {
        RemoveField(path.ToString(), rowRemovalOption);
    }

    /// <inheritdoc />
    public ReadOnlySpan<char> AddIndexToPath(ReadOnlySpan<char> path, ReadOnlySpan<int> rowIndexes, Span<char> buffer)
    {
        string tmp = AddIndexes(path.ToString(), rowIndexes);
        if (tmp.Length > buffer.Length)
        {
            throw new ArgumentException("Buffer too small");
        }
        tmp.AsSpan().CopyTo(buffer);
        return buffer.Slice(0, tmp.Length);
    }

    /// <inheritdoc />
    public IFormDataWrapper Copy()
    {
        return new ReflectionFormDataWrapper(
            JsonSerializer.Deserialize(JsonSerializer.SerializeToUtf8Bytes(_dataModel), _dataModel.GetType())
                ?? throw new InvalidOperationException("Failed to copy data model")
        );
    }

    /// <inheritdoc />
    public void RemoveAltinnRowIds()
    {
        ObjectUtils.RemoveAltinnRowId(_dataModel);
    }

    /// <inheritdoc />
    public void InitializeAltinnRowIds()
    {
        ObjectUtils.InitializeAltinnRowId(_dataModel);
    }

    /// <inheritdoc />
    public void PrepareModelForXmlStorage()
    {
        ObjectUtils.PrepareModelForXmlStorage(_dataModel);
    }

    private static object? GetModelDataRecursive(string[] keys, int index, object currentModel)
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
            if (groupIndex is not null)
            {
                // Error, trying to index a non-collection
                return null;
            }
            return GetModelDataRecursive(keys, index + 1, childModel);
        }

        if (groupIndex is null)
        {
            if (index == keys.Length - 1)
            {
                // Return the full list if the last key is missing index
                return childModelList;
            }

            return null; // Error index for collection not specified
        }

        if (!TryGetElementAt(childModelList, groupIndex.Value, out var elementAt))
        {
            return null; // Error condition, no value at index
        }

        if (elementAt is null)
        {
            return null;
        }

        return GetModelDataRecursive(keys, index + 1, elementAt);
    }

    private static bool TryGetElementAt(System.Collections.IEnumerable enumerable, int index, out object? element)
    {
        // Return the element with index = groupIndex (could not find another way to get the n'th element in non-generic enumerable)
        foreach (var arrayElement in enumerable)
        {
            if (index-- < 1)
            {
                element = arrayElement;
                return true;
            }
        }

        element = null;
        return false;
    }

    private static readonly Regex _keyPartRegex = new(
        @"^([^\s\[\]\.]+)\[(\d*)\]?$",
        RegexOptions.Compiled,
        TimeSpan.FromMilliseconds(2)
    );

    private static (string key, int? index) ParseKeyPart(string keyPart)
    {
        if (keyPart.Length == 0)
        {
            return (keyPart, null);
        }
        if (keyPart[^1] != ']')
        {
            return (keyPart, null);
        }
        var match = _keyPartRegex.Match(keyPart);
        if (!match.Success)
        {
            throw new DataModelException($"Invalid key part {keyPart}");
        }

        var indexString = match.Groups[2].Value;

        if (indexString.Length == 0)
        {
            return (match.Groups[1].Value, null);
        }
        return (match.Groups[1].Value, int.Parse(indexString, CultureInfo.InvariantCulture));
    }

    private static bool SetModelDataRecursive(string[] keys, int index, object currentModel, ExpressionValue value)
    {
        if (index == keys.Length - 1)
        {
            // We're at the last key, set the value
            var (key, groupIndex) = ParseKeyPart(keys[index]);
            var prop = Array.Find(currentModel.GetType().GetProperties(), p => IsPropertyWithJsonName(p, key));
            if (prop is null)
            {
                return false;
            }

            if (groupIndex is null)
            {
                // Setting a simple property
                if (!value.TryDeserialize(prop.PropertyType, out var convertedValue))
                {
                    return false;
                }
                if (
                    convertedValue is null
                    && prop.PropertyType.IsValueType
                    && Nullable.GetUnderlyingType(prop.PropertyType) is null
                )
                {
                    // Can't set a non-nullable value type to null
                    return false;
                }
                try
                {
                    prop.SetValue(currentModel, convertedValue);
                    return true;
                }
                catch (TargetException)
                {
                    return false;
                }
            }
            else
            {
                // Setting an element in a list
                var listProperty = prop.GetValue(currentModel);
                if (listProperty is not System.Collections.IList list)
                {
                    return false;
                }

                if (groupIndex.Value < 0 || groupIndex.Value >= list.Count)
                {
                    return false;
                }

                var elementType = list.GetType().GetGenericArguments().FirstOrDefault();
                if (elementType is null)
                {
                    return false;
                }

                if (value.TryDeserialize(elementType, out var deserializedValue))
                {
                    list[groupIndex.Value] = deserializedValue;
                    return true;
                }

                return false;
            }
        }

        // Navigate to the next level
        var (currentKey, currentGroupIndex) = ParseKeyPart(keys[index]);
        var currentProp = Array.Find(
            currentModel.GetType().GetProperties(),
            p => IsPropertyWithJsonName(p, currentKey)
        );
        if (currentProp is null)
        {
            return false;
        }

        var childModel = currentProp.GetValue(currentModel);
        if (childModel is null)
        {
            // Create an instance of the property type if it's null
            childModel = Activator.CreateInstance(currentProp.PropertyType);
            if (childModel is null)
            {
                return false;
            }
            currentProp.SetValue(currentModel, childModel);
        }

        // Strings are enumerable in C#
        // Other enumerable types is treated as a collection
        if (!(childModel is not string && childModel is System.Collections.IEnumerable childModelList))
        {
            if (currentGroupIndex is not null)
            {
                // Error, trying to index a non-collection
                return false;
            }
            return SetModelDataRecursive(keys, index + 1, childModel, value);
        }

        if (currentGroupIndex is null)
        {
            return false; // Error: index for collection not specified
        }

        if (!TryGetElementAt(childModelList, currentGroupIndex.Value, out var elementAt))
        {
            return false;
        }

        if (elementAt is null)
        {
            // The list had an item at the index, but it was null
            // We might consider creating a new instance and replacing it in the list
            // For now, just return false
            return false;
        }

        return SetModelDataRecursive(keys, index + 1, elementAt, value);
    }

    private static void AddIndexesRecursive(
        List<string> ret,
        Type currentModelType,
        ReadOnlySpan<string> keys,
        ReadOnlySpan<int> rowIndexes
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
            // Looking up something that does not exist is currently not an error, but should return null
            ret.Clear();
            return;
        }

        var childType = prop.PropertyType;

        // Everything that is an System.Collections.ICollection<> can be mapped to a repeating group
        // Other types are treated as a single value (no index[])
        var childTypeEnumerableParameter = childType.GetInterface("ICollection`1")?.GenericTypeArguments[0];
        if (childTypeEnumerableParameter is not null)
        {
            if (groupIndex is null)
            {
                if (rowIndexes.Length != 0)
                {
                    ret.Add($"{key}[{rowIndexes[0]}]");
                    rowIndexes = rowIndexes.Slice(1);
                }
                else
                {
                    if (keys.Length == 1)
                    {
                        ret.Add(key);
                        return;
                    }
                    // We don't have an index, but the path continues, so return empty to indicate failure
                    ret.Clear();
                    return;
                }
            }
            else
            {
                rowIndexes = default; //when you use a literal index, the context indexes are not to be used later.
                ret.Add($"{key}[{groupIndex}]");
            }

            AddIndexesRecursive(ret, childTypeEnumerableParameter, keys[1..], rowIndexes);
        }
        else
        {
            if (groupIndex is not null)
            {
                throw new DataModelException("Index on non indexable property");
            }

            ret.Add(key);
            AddIndexesRecursive(ret, childType, keys.Slice(1), rowIndexes);
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
    private string AddIndexes(string field, ReadOnlySpan<int> rowIndexes = default)
    {
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
    private void RemoveField(string field, RowRemovalOption rowRemovalOption)
    {
        var fieldSplit = field.Split('.');
        var keys = fieldSplit[0..^1];
        var (lastKey, lastGroupIndex) = ParseKeyPart(fieldSplit[^1]);

        var containingObject = GetModelDataRecursive(keys, 0, _dataModel);
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
            if (propertyValue is null)
            {
                // Trying to remove row from a property that is already null
                return;
            }

            if (propertyValue is not System.Collections.IList listValue)
            {
                throw new ArgumentException(
                    $"Tried to remove row {field}, ended in a non-list ({propertyValue?.GetType()})"
                );
            }
            if (listValue.Count < lastGroupIndex)
            {
                throw new ArgumentException(
                    $"Tried to remove item at index {lastGroupIndex} but {field} only has {listValue.Count} elements"
                );
            }

            switch (rowRemovalOption)
            {
                case RowRemovalOption.DeleteRow:
                    if (lastGroupIndex.Value < 0 || lastGroupIndex.Value >= listValue.Count)
                    {
                        // Index out of range, nothing to remove
                        return;
                    }
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
