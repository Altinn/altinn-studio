#nullable enable
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;

namespace Altinn.App.Core.Tests.Helpers;

/// <summary>
/// Implementation of <see cref="IDataModelAccessor" /> for data models based on JsonObject (mainliy for testing )
/// </summary>
/// <remarks>
/// This class is written to enable the use of shared tests (with frontend) where the datamodel is defined
/// in json. It's hard to IL generate proper C# classes to use the normal <see cref="DataModel" /> in tests
/// </remarks>
public class JsonDataModel : IDataModelAccessor
{
    private readonly JsonObject? _modelRoot;

    /// <summary>
    /// Constructor that creates a JsonDataModel based on a JsonObject
    /// </summary>
    public JsonDataModel(JsonObject? modelRoot)
    {
        _modelRoot = modelRoot;
    }

    /// <inheritdoc />
    public object? GetModelData(string key, ReadOnlySpan<int> indicies = default)
    {
        if (_modelRoot is null)
        {
            return null;
        }

        return GetModelDataRecursive(key.Split('.'), 0, _modelRoot, indicies);
    }

    private object? GetModelDataRecursive(string[] keys, int index, JsonNode? currentModel, ReadOnlySpan<int> indicies)
    {
        if (currentModel is null)
        {
            return null;
        }

        if (index == keys.Length)
        {
            return currentModel switch
            {
                JsonValue jsonValue => jsonValue.GetValue<JsonElement>().ValueKind switch
                {
                    JsonValueKind.String => jsonValue.GetValue<string>(),
                    JsonValueKind.Number => jsonValue.GetValue<double>(),
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Null => null,
                    _ => throw new NotImplementedException($"Get Data is not implemented for {jsonValue.GetType()}"),
                },
                JsonObject obj => obj,
                JsonArray arr => arr,
                _ => throw new NotImplementedException($"Get Data is not implemented for {currentModel.GetType()}"),
            };
        }

        var (key, groupIndex) = DataModel.ParseKeyPart(keys[index]);

        if (currentModel is not JsonObject || !currentModel.AsObject().TryGetPropertyValue(key, out JsonNode? childModel))
        {
            return null;
        }

        if (childModel is JsonArray childArray)
        {
            if (groupIndex is null)
            {
                if (indicies.Length == 0)
                {
                    return null; // Don't know index 
                }

                groupIndex = indicies[0];
            }
            else
            {
                indicies = default; // when you use a literal index, the context indecies are not to be used later.
            }

            var arrayElement = childArray.ElementAt((int)groupIndex);
            return GetModelDataRecursive(keys, index + 1, arrayElement, indicies.Length > 0 ? indicies.Slice(1) : indicies);
        }

        return GetModelDataRecursive(keys, index + 1, childModel, indicies);
    }

    /// <inheritdoc />
    public int? GetModelDataCount(string key, ReadOnlySpan<int> indicies = default)
    {
        if (_modelRoot is null)
        {
            return null;
        }

        return GetModelDataCountRecurs(key.Split('.'), 0, _modelRoot, indicies);
    }

    private int? GetModelDataCountRecurs(string[] keys, int index, JsonNode? currentModel, ReadOnlySpan<int> indicies)
    {
        if (index == keys.Length || currentModel is null)
        {
            return null; // Last key part was not an JsonValueKind.Array
        }

        var (key, groupIndex) = DataModel.ParseKeyPart(keys[index]);

        if (currentModel is not JsonObject || !currentModel.AsObject().TryGetPropertyValue(key, out JsonNode? childModel))
        {
            return null;
        }

        if (childModel is JsonArray childArray)
        {
            if (index == keys.Length - 1)
            {
                return childArray.Count;
            }

            if (groupIndex is null)
            {
                if (indicies.Length == 0)
                {
                    return null; // Error index for collection not specified
                }

                groupIndex = indicies[0];
            }
            else
            {
                indicies = default; // when you use a literal index, the context indecies are not to be used later.
            }

            var arrayElement = childArray.ElementAt((int)groupIndex);
            return GetModelDataCountRecurs(keys, index + 1, arrayElement, indicies.Length > 0 ? indicies.Slice(1) : indicies);
        }

        return GetModelDataCountRecurs(keys, index + 1, childModel, indicies);
    }

    /// <inheritdoc />
    public string[] GetResolvedKeys(string key)
    {
        if (_modelRoot is null)
        {
            return new string[0];
        }

        var keyParts = key.Split('.');
        return GetResolvedKeysRecursive(keyParts, _modelRoot);
    }

    private string[] GetResolvedKeysRecursive(string[] keyParts, JsonNode? currentModel, int currentIndex = 0, string currentKey = "")
    {
        if (currentModel is null)
        {
            return new string[0];
        }

        if (currentIndex == keyParts.Length)
        {
            return new[] { currentKey };
        }

        var (key, groupIndex) = DataModel.ParseKeyPart(keyParts[currentIndex]);
        if (currentModel is not JsonObject || !currentModel.AsObject().TryGetPropertyValue(key, out JsonNode? childModel))
        {
            return new string[0];
        }

        if (childModel is JsonArray childArray)
        {
            // childModel is an array
            if (groupIndex is null)
            {
                // Index not specified, recurse on all elements
                int i = 0;
                var resolvedKeys = new List<string>();
                foreach (var child in childArray)
                {
                    var newResolvedKeys = GetResolvedKeysRecursive(keyParts, child, currentIndex + 1, DataModel.JoinFieldKeyParts(currentKey, key + "[" + i + "]"));
                    resolvedKeys.AddRange(newResolvedKeys);
                    i++;
                }

                return resolvedKeys.ToArray();
            }
            else
            {
                // Index specified, recurse on that element
                return GetResolvedKeysRecursive(keyParts, childModel, currentIndex + 1, DataModel.JoinFieldKeyParts(currentKey, key + "[" + groupIndex + "]"));
            }
        }

        // Otherwise, just recurse
        return GetResolvedKeysRecursive(keyParts, childModel, currentIndex + 1, DataModel.JoinFieldKeyParts(currentKey, key));

    }

    /// <inheritdoc />
    public string AddIndicies(string key, ReadOnlySpan<int> indicies = default)
    {
        if (indicies.Length == 0)
        {
            return key;
        }

        var keys = key.Split('.');
        var outputKey = string.Empty;
        JsonNode? currentModel = _modelRoot;

        foreach (var keyPart in keys)
        {
            var (currentKey, groupIndex) = DataModel.ParseKeyPart(keyPart);
            var currentIndex = groupIndex ?? (indicies.Length > 0 ? indicies[0] : null);

            if (currentModel is not JsonObject currentObject)
            {
                throw new DataModelException("Cannot access property of a JsonValue or JsonArray");
            }

            if (!currentObject.TryGetPropertyValue(currentKey, out JsonNode? childModel))
            {
                throw new DataModelException($"Cannot find property {currentKey} in {currentObject}");
            }

            if (childModel is JsonArray childArray && currentIndex is not null)
            {
                outputKey = DataModel.JoinFieldKeyParts(outputKey, currentKey + "[" + currentIndex + "]");
                currentModel = childArray.ElementAt((int)currentIndex);
                if (indicies.Length > 0)
                {
                    indicies = indicies.Slice(1);
                }
            }
            else
            {
                if (groupIndex is not null)
                {
                    throw new DataModelException("Index on non indexable property");
                }

                outputKey = DataModel.JoinFieldKeyParts(outputKey, currentKey);
                currentModel = childModel;
            }
        }

        return outputKey;
    }

    /// <inheritdoc />
    public void RemoveField(string key, RowRemovalOption rowRemovalOption)
    {
        var keys_split = key.Split('.');
        var keys = keys_split[0..^1];
        var (lastKey, lastGroupIndex) = DataModel.ParseKeyPart(keys_split[^1]);

        object? modelData = GetModelDataRecursive(keys, 0, _modelRoot, default);
        if (modelData is not JsonObject containingObject)
        {
            return;
        }

        if (lastGroupIndex is not null)
        {
            // Remove row from list
            if (!(containingObject.TryGetPropertyValue(lastKey, out JsonNode? childModel) && childModel is JsonArray childArray))
            {
                throw new ArgumentException($"Tried to remove row {key}, ended in a non-list");
            }

            switch (rowRemovalOption)
            {
                case RowRemovalOption.DeleteRow:
                    childArray.RemoveAt((int)lastGroupIndex);
                    break;
                case RowRemovalOption.SetToNull:
                    childArray[(int)lastGroupIndex] = null;
                    break;
                case RowRemovalOption.Ignore:
                    return;
            }
        }
        else
        {
            // Set the property to null
            containingObject[lastKey] = null;
        }

    }

    /// <inheritdoc />
    public bool VerifyKey(string key)
    {
        throw new NotImplementedException("Impossible to verify keys in a json model");
    }
}
