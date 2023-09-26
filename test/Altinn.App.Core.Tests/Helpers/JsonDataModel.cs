#nullable enable
using System.Text.Json;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;

namespace Altinn.App.Core.Tests.Helpers;

/// <summary>
/// Implementation of <see cref="IDataModelAccessor" /> for data models based on JsonElement (mainliy for testing )
/// </summary>
/// <remarks>
/// This class is written to enable the use of shared tests (with frontend) where the datamodel is defined
/// in json. It's hard to IL generate proper C# classes to use the normal <see cref="DataModel" /> in tests
/// </remarks>
public class JsonDataModel : IDataModelAccessor
{
    private readonly JsonElement? _modelRoot;

    /// <summary>
    /// Constructor that creates a JsonDataModel based on a JsonElement
    /// </summary>
    public JsonDataModel(JsonElement? modelRoot)
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

        return GetModelDataRecursive(key.Split('.'), 0, _modelRoot.Value, indicies);
    }

    private object? GetModelDataRecursive(string[] keys, int index, JsonElement currentModel, ReadOnlySpan<int> indicies)
    {
        if (index == keys.Length)
        {
            return currentModel.ValueKind switch
            {
                JsonValueKind.String => currentModel.GetString(),
                JsonValueKind.Number => currentModel.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Object => null,
                JsonValueKind.Array => null,
                JsonValueKind.Null => null,
                _ => throw new NotImplementedException($"Get Data is not implemented for {currentModel.ValueKind}"),
            };
        }

        var (key, groupIndex) = DataModel.ParseKeyPart(keys[index]);

        if (currentModel.ValueKind != JsonValueKind.Object || !currentModel.TryGetProperty(key, out JsonElement childModel))
        {
            return null;
        }

        if (childModel.ValueKind == JsonValueKind.Array)
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

            var arrayElement = childModel.EnumerateArray().ElementAt((int)groupIndex);
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

        return GetModelDataCountRecurs(key.Split('.'), 0, _modelRoot.Value, indicies);
    }

    private int? GetModelDataCountRecurs(string[] keys, int index, JsonElement currentModel, ReadOnlySpan<int> indicies)
    {
        if (index == keys.Length)
        {
            return null; // Last key part was not an JsonValueKind.Array
        }

        var (key, groupIndex) = DataModel.ParseKeyPart(keys[index]);

        if (currentModel.ValueKind != JsonValueKind.Object || !currentModel.TryGetProperty(key, out JsonElement childModel))
        {
            return null;
        }

        if (childModel.ValueKind == JsonValueKind.Array)
        {
            if (index == keys.Length - 1)
            {
                return childModel.GetArrayLength();
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

            var arrayElement = childModel.EnumerateArray().ElementAt((int)groupIndex);
            return GetModelDataCountRecurs(keys, index + 1, arrayElement, indicies.Length > 0 ? indicies.Slice(1) : indicies);
        }

        return GetModelDataCountRecurs(keys, index + 1, childModel, indicies);
    }

    /// <inheritdoc />
    public string AddIndicies(string key, ReadOnlySpan<int> indicies = default)
    {
        // We don't have a schema for the datamodel in Json
        throw new NotImplementedException();
    }

    /// <inheritdoc />
    public void RemoveField(string key, RowRemovalOption rowRemovalOption)
    {
        throw new NotImplementedException("Impossible to remove fields in a json model");
    }

    /// <inheritdoc />
    public bool VerifyKey(string key)
    {
        throw new NotImplementedException("Impossible to verify keys in a json model");
    }
}
