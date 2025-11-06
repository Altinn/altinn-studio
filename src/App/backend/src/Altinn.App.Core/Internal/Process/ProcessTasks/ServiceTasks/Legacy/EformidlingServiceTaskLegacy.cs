using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.Legacy;

/// <summary>
/// Service task that sends eFormidling shipment, if EFormidling is enabled in config and EFormidling.SendAfterTaskId matches the current task.
/// </summary>
/// <remarks>Planned to be replaced by <see cref="EFormidlingServiceTask"/>, but kept for now for backwards compatibility. Called inline in <see cref="EndTaskEventHandler"/> instead of through the service task system.</remarks>
internal interface IEFormidlingServiceTaskLegacy
{
    /// <summary>
    /// Executes the service task.
    /// </summary>
    Task Execute(string taskId, Instance instance);
}

/// <inheritdoc />
internal class EformidlingServiceTaskLegacy : IEFormidlingServiceTaskLegacy
{
    private readonly ILogger<EformidlingServiceTaskLegacy> _logger;
    private readonly IAppMetadata _appMetadata;
    private readonly IInstanceClient _instanceClient;
    private readonly IEFormidlingService? _eFormidlingService;
    private readonly IOptions<AppSettings>? _appSettings;

    /// <summary>
    /// Initializes a new instance of the <see cref="EformidlingServiceTaskLegacy"/> class.
    /// </summary>
    public EformidlingServiceTaskLegacy(
        ILogger<EformidlingServiceTaskLegacy> logger,
        IAppMetadata appMetadata,
        IInstanceClient instanceClient,
        IEFormidlingService? eFormidlingService = null,
        IOptions<AppSettings>? appSettings = null
    )
    {
        _logger = logger;
        _appMetadata = appMetadata;
        _instanceClient = instanceClient;
        _eFormidlingService = eFormidlingService;
        _appSettings = appSettings;
    }

    /// <inheritdoc />
    public async Task Execute(string taskId, Instance instance)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        if (
            _appSettings?.Value?.EnableEFormidling == true
            && applicationMetadata.EFormidling?.SendAfterTaskId == taskId
        )
        {
            if (_eFormidlingService != null)
            {
                Instance updatedInstance = await _instanceClient.GetInstance(instance);
                await _eFormidlingService.SendEFormidlingShipment(updatedInstance);
            }
            else
            {
                _logger.LogError("EformidlingService is not configured. No eFormidling shipment will be sent.");
            }
        }
    }
}
