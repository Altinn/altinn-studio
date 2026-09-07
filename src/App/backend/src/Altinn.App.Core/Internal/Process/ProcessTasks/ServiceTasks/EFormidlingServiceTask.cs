using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

/// <summary>
/// Service task that sends an eFormidling shipment and then waits for the integrasjonspunkt to
/// confirm its delivery, if eFormidling is enabled in config.
/// </summary>
/// <remarks>
/// Two stages, because sending and waiting have different durability needs: the engine records the
/// send stage's completion, so the shipment is dispatched exactly once per pass through the task no
/// matter how often the wait re-checks, and the concluding step polls until the outcome arrives.
/// </remarks>
internal sealed class EFormidlingServiceTask : IPipelineServiceTask
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

    /// <inheritdoc />
    /// <remarks>
    /// The pipeline's shape is fixed at enqueue time — a workflow enqueued against it dispatches by item
    /// index, so stages must not be inserted, reordered or removed while workflows are in flight.
    /// <para>
    /// The wait budget sits on the conclusion, not the task, because only the poll waits and
    /// task-level options reach every stage. It outlasts the shipment's own two-hour lifetime plus the
    /// integrasjonspunkt's 30-second expiry sweep and one poll interval, so a shipment that dies of old
    /// age fails with its verdict rather than ours.
    /// </para>
    /// </remarks>
    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(SendShipment)
            .Finally(AwaitDelivery, new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(2.5) });

    /// <summary>
    /// Dispatches the shipment to the integrasjonspunkt. Completing this stage is what makes the
    /// send happen once per pass through the task: the engine records it durably, so neither a
    /// failure further along the pipeline nor any number of delivery re-checks brings it back.
    /// </summary>
    private async Task<ServiceTaskStageResult> SendShipment(ServiceTaskContext context)
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
            return ServiceTaskStageResult.Completed();
        }

        IEFormidlingService eFormidlingService = RequireEFormidlingService();

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
        // Our own claim is invisible on a retry of this stage (the blob predates it), but that case
        // converges through the send's duplicate-create self-healing instead.
        string? shipmentOwner = null;
        instance.DataValues?.TryGetValue(EformidlingConstants.ShipmentOwnerWorkflowIdDataValueKey, out shipmentOwner);
        if (shipmentOwner is not null && shipmentOwner != context.WorkflowId.ToString())
        {
            return ServiceTaskStageResult.FailedPermanent(
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
            await eFormidlingService.SendEFormidlingShipment(
                context.InstanceDataMutator,
                configuration,
                context.CancellationToken
            );
        }
        catch (EformidlingDeliveryException e)
        {
            return ServiceTaskStageResult.FailedPermanent(e.Message);
        }
        catch (PlatformHttpException e) when (IsRejection(e))
        {
            return ServiceTaskStageResult.FailedPermanent(
                DescribeRejection(
                    e,
                    "Repeating the request would get the same answer, so the shipment was not retried. "
                        + "Manual follow-up is required."
                )
            );
        }
        _logger.LogDebug(
            "Successfully called eFormidlingService for eFormidling Service Task {TaskId}.",
            LogSanitizer.Sanitize(taskId)
        );

        // Record ownership after the send: the value is staged on the unit of work and commits with
        // this callback's version-fenced workflow-owned save. If that save fails the stage retries,
        // and the retry resumes/no-ops the already-sent message before staging the owner again.
        unitOfWork.UpdateInstanceDataValue(
            EformidlingConstants.ShipmentOwnerWorkflowIdDataValueKey,
            context.WorkflowId.ToString()
        );

        return ServiceTaskStageResult.Completed();
    }

    /// <summary>
    /// Waits for the integrasjonspunkt to confirm delivery, deferring between checks, and concludes
    /// the task once the shipment has arrived (or provably never will).
    /// </summary>
    private async Task<ServiceTaskResult> AwaitDelivery(ServiceTaskContext context)
    {
        Instance instance = context.InstanceDataMutator.Instance;
        string taskId = instance.Process.CurrentTask.ElementId;
        ValidAltinnEFormidlingConfiguration configuration = await GetValidAltinnEFormidlingConfiguration(taskId);

        if (configuration.Disabled)
        {
            // Nothing was sent, so there is nothing to wait for.
            return ServiceTaskResult.Success();
        }

        IEFormidlingService eFormidlingService = RequireEFormidlingService();
        EFormidlingShipmentStatus status;
        try
        {
            status = await eFormidlingService.GetEFormidlingShipmentStatus(
                context.InstanceDataMutator,
                configuration,
                context.CancellationToken
            );
        }
        catch (PlatformHttpException e) when (IsRejection(e))
        {
            return ServiceTaskResult.FailedPermanent(
                DescribeRejection(
                    e,
                    "Repeating the request would get the same answer, so the delivery wait was ended. The "
                        + "shipment may still be delivered; manual follow-up is required."
                )
            );
        }

        switch (status.State)
        {
            case EFormidlingDeliveryState.Delivered:
                RecordShipmentStatus(context, status);

                // The service owner has what it needed from this instance. Staged on the unit of work
                // so it commits with this callback's version-fenced save, ahead of the conclusion: the
                // conclusion may end the process, and an ended process can take the instance with it.
                // Storage keeps this idempotent per stakeholder, so a retried conclusion cannot
                // confirm twice.
                ConfirmComplete(context);

                _logger.LogInformation(
                    "eFormidling shipment for task {TaskId} confirmed delivered with status '{Status}'.",
                    LogSanitizer.Sanitize(taskId),
                    LogSanitizer.Sanitize(status.Status)
                );
                return ServiceTaskResult.Success();

            case EFormidlingDeliveryState.Failed:
                RecordShipmentStatus(context, status);
                return ServiceTaskResult.FailedPermanent(
                    $"The eFormidling shipment for this instance failed with status '{status.Status}' "
                        + $"({status.Description}). eFormidling message ids are bound to the instance id, so the "
                        + "shipment cannot be sent again automatically. Manual follow-up is required."
                );

            default:
                if (context.Wait.IsFinalCheck)
                {
                    // Ending the wait ourselves, so the failure says what never arrived instead of
                    // the engine's generic wait-expiry.
                    RecordShipmentStatus(context, status);
                    return ServiceTaskResult.FailedPermanent(
                        $"eFormidling did not confirm delivery of this instance's shipment. The wait began at "
                            + $"{context.Wait.StartedAt:u} and its allowance is now spent. The last status reported "
                            + $"by the integrasjonspunkt was '{status.Status ?? "none"}'. The shipment may still be "
                            + "delivered; manual follow-up is required."
                    );
                }

                return ServiceTaskResult.Defer(
                    NextPollDelay(context.Wait.DeferCount),
                    status.Status is { } reported
                        ? $"Waiting for eFormidling to confirm delivery (last status: {reported})"
                        : "Waiting for eFormidling to confirm delivery"
                );
        }
    }

    /// <summary>
    /// Whether the integrasjonspunkt's answer is a verdict on the request rather than on the moment.
    /// A 4xx says the request itself is unacceptable — the SBD is malformed, the receiver unknown,
    /// the credentials refused — and repeating it unchanged cannot change the answer. Left to the
    /// engine's default retry strategy, such a request would be re-sent every few minutes for a day,
    /// each attempt another call against the gateway's quota that fails the same way. The exceptions
    /// are the two 4xx codes that describe pressure and timing rather than the request: 408 Request
    /// Timeout and 429 Too Many Requests. Same rule the engine applies to its own callbacks to the
    /// app. Anything else — 5xx, a connection failure — propagates and is retried.
    /// </summary>
    private static bool IsRejection(PlatformHttpException exception) =>
        (int)exception.StatusCode is >= 400 and < 500 and not 408 and not 429;

    /// <summary>
    /// Composes the permanent failure's message: what was asked and what came back (the exception's
    /// own message names the operation and the status), the integrasjonspunkt's explanation, and
    /// what that means for the instance. The explanation is included because the message is what an
    /// operator has to decide from — it lands in the engine's error history, never in a client
    /// response — and the status line alone says only that something about the request was wrong.
    /// </summary>
    private static string DescribeRejection(PlatformHttpException exception, string consequence)
    {
        string? reason = ReadRejectionReason(exception.Response);
        return reason is null
            ? $"{exception.Message} {consequence}"
            : $"{exception.Message} The integrasjonspunkt said: {reason} {consequence}";
    }

    /// <summary>
    /// The integrasjonspunkt explains a rejection in the <c>message</c> field of a JSON error body,
    /// alongside the Java exception name (see <see cref="DefaultEFormidlingService.IsMessageAlreadyExistsError"/>,
    /// which reads the other field). A body of any other shape — the gateway's own JSON uses the same
    /// field name, a proxy's error page does not — is passed through as it is, since it is still the
    /// best explanation there is. Bounded and flattened to one line either way: the body is external
    /// input on its way into a log line and an error history entry.
    /// </summary>
    private static string? ReadRejectionReason(PlatformHttpResponse response)
    {
        const int maxLength = 500;

        string body = response.Content;
        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        string reason = body;
        try
        {
            using JsonDocument document = JsonDocument.Parse(body);
            if (
                document.RootElement.ValueKind is JsonValueKind.Object
                && document.RootElement.TryGetProperty("message", out JsonElement message)
                && message.ValueKind is JsonValueKind.String
                && message.GetString() is { Length: > 0 } text
            )
            {
                reason = text;
            }
        }
        catch (JsonException)
        {
            // Not a JSON body - the raw text is the explanation.
        }

        reason = LogSanitizer.Sanitize(reason);
        if (reason.Length == 0)
        {
            return null;
        }

        return reason.Length <= maxLength ? reason : reason[..maxLength] + "…";
    }

    /// <summary>
    /// How long to wait before the next delivery check: eager at first, since a shipment can be
    /// delivered within seconds, then backing off so a slow one costs a handful of calls rather
    /// than thousands.
    /// </summary>
    /// <remarks>
    /// A pacing signal only. The number of previous checks must never gate the send — an attempt
    /// can dispatch a shipment and crash before answering, and the next attempt sees the same
    /// count.
    /// </remarks>
    private static TimeSpan NextPollDelay(int deferCount) =>
        deferCount switch
        {
            < 2 => TimeSpan.FromSeconds(15),
            < 6 => TimeSpan.FromMinutes(1),
            < 12 => TimeSpan.FromMinutes(5),
            _ => TimeSpan.FromMinutes(15),
        };

    /// <summary>
    /// Records the shipment's last known status on the instance, so what became of a delivery is
    /// still legible after the process has moved on.
    /// </summary>
    /// <remarks>
    /// The value is staged on the unit of work, so it only reaches Storage when the callback concludes
    /// successfully — the controller saves in the successful-result branch alone. The two failing
    /// conclusions in <see cref="AwaitDelivery"/> (a reported delivery failure, and the final check
    /// giving up) stage a status that is then dropped, so a failed shipment leaves no status on the
    /// instance. Writing it straight to Storage instead is not the fix: that bumps the instance
    /// version behind the unit of work's back and breaks the next callback's version fence. Making
    /// the failure status durable needs the save path to cover it, not a write outside the unit of
    /// work.
    /// </remarks>
    private static void RecordShipmentStatus(ServiceTaskContext context, EFormidlingShipmentStatus status)
    {
        if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            throw new ProcessException(
                "The eFormidling service task requires callback state restored into an InstanceDataUnitOfWork to record the shipment status."
            );
        }

        unitOfWork.UpdateInstanceDataValue(
            EformidlingConstants.ShipmentStatusDataValueKey,
            status.Status ?? status.State.ToString()
        );
    }

    /// <summary>
    /// Stages the service owner's complete confirmation, which commits with this callback's
    /// version-fenced save. Writing it straight to Storage instead bumps the instance version behind
    /// the unit of work's back and breaks that save's version fence.
    /// </summary>
    private static void ConfirmComplete(ServiceTaskContext context)
    {
        if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            throw new ProcessException(
                "The eFormidling service task requires callback state restored into an InstanceDataUnitOfWork to confirm completion."
            );
        }

        unitOfWork.AddCompleteConfirmation();
    }

    private IEFormidlingService RequireEFormidlingService() =>
        _eFormidlingService
        ?? throw new ProcessException(
            $"No implementation of {nameof(IEFormidlingService)} has been added to the DI container. Register eFormidling with AddEFormidling().WithMetadata<T>() when configuring services."
        );

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
