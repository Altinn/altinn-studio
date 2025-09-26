using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.DataLists;

/// <summary>
/// Service for handling datalists.
/// </summary>
public class DataListsService : IDataListsService
{
    private readonly DataListsFactory _dataListsFactory;
    private readonly InstanceDataListsFactory _instanceDataListsFactory;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="DataListsService"/> class.
    /// </summary>
    public DataListsService(
        DataListsFactory dataListsFactory,
        InstanceDataListsFactory instanceDataListsFactory,
        Telemetry? telemetry = null
    )
    {
        _dataListsFactory = dataListsFactory;
        _instanceDataListsFactory = instanceDataListsFactory;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<DataList> GetDataListAsync(
        string dataListId,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        using var activity = _telemetry?.StartDataListActivity();
        return await _dataListsFactory.GetDataListProvider(dataListId).GetDataListAsync(language, keyValuePairs);
    }

    /// <inheritdoc />
    public async Task<DataList> GetDataListAsync(
        InstanceIdentifier instanceIdentifier,
        string dataListId,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        using var activity = _telemetry?.StartDataListActivity(instanceIdentifier);
        return await _instanceDataListsFactory
            .GetDataListProvider(dataListId)
            .GetInstanceDataListAsync(instanceIdentifier, language, keyValuePairs);
    }
}
