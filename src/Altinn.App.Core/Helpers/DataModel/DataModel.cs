using System.Collections;
using System.Text.RegularExpressions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;

namespace Altinn.App.Core.Helpers.DataModel;

/// <summary>
/// Get data fields from a model, using string keys (like "Bedrifter[1].Ansatte[1].Alder")
/// </summary>
public class DataModel
{
    private readonly IInstanceDataAccessor _dataAccessor;
    private readonly Dictionary<string, DataElementId> _dataIdsByType = new();

    /// <summary>
    /// Constructor that wraps a POCO data model, and gives extra tool for working with the data
    /// </summary>
    public DataModel(IInstanceDataAccessor dataAccessor)
    {
        _dataAccessor = dataAccessor;
        foreach (var dataElement in dataAccessor.Instance.Data)
        {
            // TODO: only add data elements with maxCount == 1
            //       for now only add the first one as this requires reading appMetadata
            _dataIdsByType.TryAdd(dataElement.DataType, dataElement);
        }
    }

    private async Task<object> ServiceModel(ModelBinding key, DataElementId defaultDataElementId)
    {
        if (key.DataType == null)
        {
            return await _dataAccessor.GetData(defaultDataElementId);
        }

        if (_dataIdsByType.TryGetValue(key.DataType, out var dataElementId))
        {
            return await _dataAccessor.GetData(dataElementId);
        }

        throw new InvalidOperationException("Data model with type " + key.DataType + " not found");
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

    private static readonly Regex _rowIndexRegex = new Regex(
        @"^([^[\]]+(\[(\d+)])?)+$",
        RegexOptions.None,
        TimeSpan.FromMilliseconds(10)
    );

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
    public async Task<DataReference> AddIndexes(ModelBinding key, DataElementId dataElementId, int[]? rowIndexes)
    {
        if (rowIndexes?.Length < 0)
        {
            return new DataReference() { Field = key.Field, DataElementId = dataElementId };
        }
        var serviceModel = await ServiceModel(key, dataElementId);
        if (serviceModel is null)
        {
            throw new DataModelException("Could not find service model for dataType " + key.DataType);
        }

        var modelWrapper = new DataModelWrapper(serviceModel);
        var field = modelWrapper.AddIndicies(key.Field, rowIndexes);
        return new DataReference() { Field = field, DataElementId = dataElementId };
    }

    /// <summary>
    /// Set the value of a field in the model to default (null)
    /// </summary>
    public async void RemoveField(
        ModelBinding key,
        DataElementId defaultDataElementId,
        RowRemovalOption rowRemovalOption
    )
    {
        var serviceModel = await ServiceModel(key, defaultDataElementId);
        if (serviceModel is null)
        {
            throw new DataModelException("Could not find service model for dataType " + key.DataType);
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
