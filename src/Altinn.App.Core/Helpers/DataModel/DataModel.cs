using System.Text.RegularExpressions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Helpers.DataModel;

/// <summary>
/// Get data fields from a model, using string keys (like "Bedrifter[1].Ansatte[1].Alder")
/// </summary>
public class DataModel
{
    private readonly IInstanceDataAccessor _dataAccessor;
    private readonly Dictionary<string, DataElementId?> _dataIdsByType = [];

    /// <summary>
    /// Constructor that wraps a POCO data model, and gives extra tool for working with the data
    /// </summary>
    public DataModel(IInstanceDataAccessor dataAccessor, ApplicationMetadata appMetadata)
    {
        _dataAccessor = dataAccessor;
        foreach (var dataElement in dataAccessor.Instance.Data)
        {
            var dataTypeId = dataElement.DataType;
            var dataType = appMetadata.DataTypes.Find(d => d.Id == dataTypeId);
            if (dataType is { MaxCount: 1, AppLogic.ClassRef: not null })
            {
                _dataIdsByType.TryAdd(dataElement.DataType, dataElement);
            }
            else
            {
                _dataIdsByType.TryAdd(dataElement.Id, null);
            }
        }
    }

    /// <summary>
    /// Get access to the instance object
    /// </summary>
    public Instance Instance => _dataAccessor.Instance;

    private async Task<object> ServiceModel(ModelBinding key, DataElementId defaultDataElementId)
    {
        return (await ServiceModelAndDataElementId(key, defaultDataElementId)).model;
    }

    private async Task<(DataElementId dataElementId, object model)> ServiceModelAndDataElementId(
        ModelBinding key,
        DataElementId defaultDataElementId
    )
    {
        if (key.DataType == null)
        {
            return (defaultDataElementId, await _dataAccessor.GetData(defaultDataElementId));
        }

        if (_dataIdsByType.TryGetValue(key.DataType, out var dataElementId))
        {
            if (dataElementId is null)
            {
                throw new InvalidOperationException(
                    $"{key.DataType} has maxCount different from 1 in applicationmetadata.json or don't have a classRef in appLogic"
                );
            }
            return (dataElementId.Value, await _dataAccessor.GetData(dataElementId.Value));
        }

        throw new InvalidOperationException(
            $"Data model with type {key.DataType} not found in applicationmetadata.json"
        );
    }

    /// <summary>
    /// Get model data based on key and optionally indexes
    /// </summary>
    /// <remarks>
    /// Inline indicies in the key "Bedrifter[1].Ansatte[1].Alder" will override
    /// normal indicies, and if both "Bedrifter" and "Ansatte" is lists,
    /// "Bedrifter[1].Ansatte.Alder", will fail, because the indicies will be reset
    /// after an inline index is used
    /// </remarks>
    public async Task<object?> GetModelData(ModelBinding key, DataElementId defaultDataElementId, int[]? rowIndexes)
    {
        var model = await ServiceModel(key, defaultDataElementId);
        var modelWrapper = new DataModelWrapper(model);
        return modelWrapper.GetModelData(key.Field, rowIndexes);
    }

    /// <summary>
    /// Get the count of data elements set in a group (enumerable)
    /// </summary>
    public async Task<int?> GetModelDataCount(ModelBinding key, DataElementId defaultDataElementId, int[]? rowIndexes)
    {
        var model = await ServiceModel(key, defaultDataElementId);
        var modelWrapper = new DataModelWrapper(model);
        return modelWrapper.GetModelDataCount(key.Field, rowIndexes);
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
    public async Task<DataReference[]> GetResolvedKeys(DataReference reference)
    {
        var model = await ServiceModel(reference.Field, reference.DataElementId);
        var modelWrapper = new DataModelWrapper(model);
        return modelWrapper
            .GetResolvedKeys(reference.Field)
            .Select(k => new DataReference { Field = k, DataElementId = reference.DataElementId })
            .ToArray();
    }

    private static readonly Regex _rowIndexRegex =
        new(@"^([^[\]]+(\[(\d+)])?)+$", RegexOptions.Compiled, TimeSpan.FromMilliseconds(10));

    /// <summary>
    /// Get the row indices from a key
    /// </summary>
    public static int[]? GetRowIndices(string field)
    {
        var match = _rowIndexRegex.Match(field);
        var rowIndices = match.Groups[3].Captures.Select(c => c.Value).Select(int.Parse).ToArray();
        return rowIndices.Length == 0 ? null : rowIndices;
    }

    /// <summary>
    /// Return a full dataModelBiding from a context aware binding by adding indicies
    /// </summary>
    /// <example>
    /// key = "bedrift.ansatte.navn"
    /// indicies = [1,2]
    /// => "bedrift[1].ansatte[2].navn"
    /// </example>
    public async Task<DataReference> AddIndexes(ModelBinding key, DataElementId defaultDataElementId, int[]? rowIndexes)
    {
        var (dataElementId, serviceModel) = await ServiceModelAndDataElementId(key, defaultDataElementId);
        if (serviceModel is null)
        {
            throw new DataModelException($"Could not find service model for dataType {key.DataType}");
        }

        var modelWrapper = new DataModelWrapper(serviceModel);
        var field = modelWrapper.AddIndicies(key.Field, rowIndexes);
        return new DataReference() { Field = field, DataElementId = dataElementId };
    }

    /// <summary>
    /// Set the value of a field in the model to default (null)
    /// </summary>
    public async Task RemoveField(
        ModelBinding key,
        DataElementId defaultDataElementId,
        RowRemovalOption rowRemovalOption
    )
    {
        var serviceModel = await ServiceModel(key, defaultDataElementId);
        if (serviceModel is null)
        {
            throw new DataModelException($"Could not find service model for dataType {key.DataType}");
        }

        var modelWrapper = new DataModelWrapper(serviceModel);
        modelWrapper.RemoveField(key.Field, rowRemovalOption);
    }

    // /// <summary>
    // /// Verify that a key is valid for the model
    // /// </summary>
    // public async Task<bool> VerifyKey(ModelBinding key, DataElementId defaultDataElementId)
    // {
    //     var serviceModel = await ServiceModel(key, defaultDataElementId);
    //     if (serviceModel is null)
    //     {
    //         return false;
    //     }
    //     var modelWrapper = new DataModelWrapper(serviceModel);
    //     return modelWrapper.VerifyKey(key.Field);
    // }
}
