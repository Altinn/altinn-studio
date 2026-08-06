using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

internal interface IEFormidlingServiceTask : IServiceTask { }

/// <summary>
/// Service task that sends eFormidling shipment, if EFormidling is enabled in config.
/// </summary>
internal sealed class EFormidlingServiceTask : IEFormidlingServiceTask
{
    private readonly ILogger<EFormidlingServiceTask> _logger;
    private readonly IProcessReader _processReader;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly IInstanceClient _instanceClient;
    private readonly IEFormidlingService? _eFormidlingService;

    /// <summary>
    /// Initializes a new instance of the <see cref="EFormidlingServiceTask"/> class.
    /// </summary>
    public EFormidlingServiceTask(
        ILogger<EFormidlingServiceTask> logger,
        IProcessReader processReader,
        IHostEnvironment hostEnvironment,
        IInstanceClient instanceClient,
        IEFormidlingService? eFormidlingService = null
    )
    {
        _logger = logger;
        _processReader = processReader;
        _hostEnvironment = hostEnvironment;
        _instanceClient = instanceClient;
        _eFormidlingService = eFormidlingService;
    }

    /// <inheritdoc />
    public string Type => "eFormidling";

    /// <inheritdoc/>
    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        string taskId = context.InstanceDataMutator.Instance.Process.CurrentTask.ElementId;
        Instance instance = context.InstanceDataMutator.Instance;
        ValidAltinnEFormidlingConfiguration configuration = await GetValidAltinnEFormidlingConfiguration(taskId);

        if (configuration.Disabled)
        {
            _logger.LogInformation(
                "EFormidling is disabled for task {TaskId}. No eFormidling shipment will be sent, but the service task will be completed.",
                LogSanitizer.Sanitize(taskId)
            );
            return ServiceTaskResult.Success();
        }

        if (_eFormidlingService is null)
        {
            throw new ProcessException(
                $"No implementation of {nameof(IEFormidlingService)} has been added to the DI container. Remember to add eFormidling services. Use AddEFormidlingServices2<TM,TR> to register eFormidling services."
            );
        }

        // The message id sent to eFormidling is the instance guid, so only one shipment can ever be
        // sent per instance (see docs/adr/2026-07-24-eformidling-shipment-id.md). The workflow id of
        // the pass that sent it is recorded on the instance: a matching (or absent) owner means this
        // execution is the first attempt or a retry of the same transition and may send/resume; a
        // different owner means an earlier pass through this task already sent the shipment, and
        // silently skipping (stale shipment) or re-sending (duplicate id) are both wrong - a human
        // has to decide. The state-blob instance is sufficient for this read: a foreign owner was
        // written before that pass's transition settled, so any later pass's blob (captured at its
        // own process/next entry) contains it.
        // Our own claim is invisible on a retry of this step (the blob predates it), but that case
        // converges through the send's duplicate-create self-healing instead.
        string? shipmentOwner = null;
        instance.DataValues?.TryGetValue(EformidlingConstants.ShipmentOwnerWorkflowIdDataValueKey, out shipmentOwner);
        if (shipmentOwner is not null && shipmentOwner != context.WorkflowId.ToString())
        {
            return ServiceTaskResult.FailedPermanent(
                $"An eFormidling shipment for this instance was already sent by an earlier pass through the "
                    + $"process (workflow {shipmentOwner}). eFormidling message ids are bound to the instance id, "
                    + "so the shipment cannot be sent again automatically. Manual follow-up is required."
            );
        }

        _logger.LogDebug(
            "Calling eFormidlingService for eFormidling Service Task {TaskId}.",
            LogSanitizer.Sanitize(taskId)
        );
        try
        {
            await _eFormidlingService.SendEFormidlingShipment(instance, configuration);
        }
        catch (EformidlingDeliveryException e)
        {
            return ServiceTaskResult.FailedPermanent(e.Message);
        }
        _logger.LogDebug(
            "Successfully called eFormidlingService for eFormidling Service Task {TaskId}.",
            LogSanitizer.Sanitize(taskId)
        );

        // Record ownership after the send: if this write fails the step retries, and the retry
        // resumes/no-ops the already-sent message before writing the owner again.
        await _instanceClient.UpdateDataValue(
            instance,
            EformidlingConstants.ShipmentOwnerWorkflowIdDataValueKey,
            context.WorkflowId.ToString(),
            StorageAuthenticationMethod.ServiceOwner(),
            context.CancellationToken
        );

        return ServiceTaskResult.Success();
    }

    private Task<ValidAltinnEFormidlingConfiguration> GetValidAltinnEFormidlingConfiguration(string taskId)
    {
        ArgumentNullException.ThrowIfNull(taskId);

        AltinnTaskExtension? taskExtension = _processReader.GetAltinnTaskExtension(taskId);
        AltinnEFormidlingConfiguration? eFormidlingConfig = taskExtension?.EFormidlingConfiguration;

        if (eFormidlingConfig is null)
            throw new ApplicationConfigException(
                $"No eFormidling configuration found in BPMN for task {LogSanitizer.Sanitize(taskId)}"
            );

        HostingEnvironment env = AltinnEnvironments.GetHostingEnvironment(_hostEnvironment);
        ValidAltinnEFormidlingConfiguration validConfig = eFormidlingConfig.Validate(env);

        return Task.FromResult(validConfig);
    }
}
