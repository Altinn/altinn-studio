using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
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
    private readonly IEFormidlingService? _eFormidlingService;

    /// <summary>
    /// Initializes a new instance of the <see cref="EFormidlingServiceTask"/> class.
    /// </summary>
    public EFormidlingServiceTask(
        ILogger<EFormidlingServiceTask> logger,
        IProcessReader processReader,
        IHostEnvironment hostEnvironment,
        IEFormidlingService? eFormidlingService = null
    )
    {
        _logger = logger;
        _processReader = processReader;
        _hostEnvironment = hostEnvironment;
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

        if (context.WorkflowId is not { } workflowId)
        {
            throw new ProcessException(
                "The eFormidling service task requires the executing workflow id to guarantee idempotent shipments."
            );
        }

        if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            throw new ProcessException(
                "The eFormidling service task requires callback state restored into an InstanceDataUnitOfWork to record shipment ownership."
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
        if (shipmentOwner is not null && shipmentOwner != workflowId.ToString())
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
            await _eFormidlingService.SendEFormidlingShipment(instance, configuration, context.InstanceDataMutator);
        }
        catch (EformidlingDeliveryException e)
        {
            return ServiceTaskResult.FailedPermanent(e.Message);
        }
        _logger.LogDebug(
            "Successfully called eFormidlingService for eFormidling Service Task {TaskId}.",
            LogSanitizer.Sanitize(taskId)
        );

        // Record ownership after the send: the value is staged on the unit of work and commits with
        // this callback's version-fenced workflow-owned save. If that save fails the step retries,
        // and the retry resumes/no-ops the already-sent message before staging the owner again.
        unitOfWork.UpdateInstanceDataValue(
            EformidlingConstants.ShipmentOwnerWorkflowIdDataValueKey,
            workflowId.ToString()
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
