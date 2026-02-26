using System.Globalization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Implementation;

/// <summary>
/// Default handling of instance events
/// </summary>
public class DefaultAppEvents : IAppEvents
{
    private readonly ILogger<DefaultAppEvents> _logger;
    private readonly IAppMetadata _appMetadata;
    private readonly IInstanceClient _instanceClient;
    private readonly IDataClient _dataClient;

    /// <summary>
    /// Constructor with services from DI
    /// </summary>
    public DefaultAppEvents(
        ILogger<DefaultAppEvents> logger,
        IAppMetadata appMetadata,
        IInstanceClient instanceClient,
        IDataClient dataClient
    )
    {
        _logger = logger;
        _appMetadata = appMetadata;
        _instanceClient = instanceClient;
        _dataClient = dataClient;
    }

    /// <inheritdoc />
    public async Task OnStartAppEvent(string startEvent, Instance instance)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task OnEndAppEvent(string endEvent, Instance instance)
    {
        await AutoDeleteDataElements(instance);

        _logger.LogInformation("OnEndProcess for {Id}, endEvent: {EndEvent}", instance.Id, endEvent);
    }

    private async Task AutoDeleteDataElements(Instance instance)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        List<string> typesToDelete = applicationMetadata
            .DataTypes.Where(dt => dt?.AppLogic?.AutoDeleteOnProcessEnd == true)
            .Select(dt => dt.Id)
            .ToList();
        if (typesToDelete.Count == 0)
        {
            return;
        }

        instance = await _instanceClient.GetInstance(instance);
        List<DataElement> elementsToDelete = instance.Data.Where(e => typesToDelete.Contains(e.DataType)).ToList();

        List<Task> deleteTasks = new();
        foreach (DataElement item in elementsToDelete)
        {
            deleteTasks.Add(
                _dataClient.DeleteData(
                    int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture),
                    Guid.Parse(item.InstanceGuid),
                    Guid.Parse(item.Id),
                    true
                )
            );
        }

        await Task.WhenAll(deleteTasks);
    }
}
