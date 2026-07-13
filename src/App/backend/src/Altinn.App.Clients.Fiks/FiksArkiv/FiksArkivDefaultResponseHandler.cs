using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivDefaultResponseHandler : IFiksArkivResponseHandler
{
    private readonly FiksArkivSettings _fiksArkivSettings;
    private readonly IFiksArkivInstanceClient _fiksArkivInstanceClient;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<FiksArkivDefaultResponseHandler> _logger;

    public FiksArkivDefaultResponseHandler(
        IOptions<FiksArkivSettings> fiksArkivSettings,
        IFiksArkivInstanceClient fiksArkivInstanceClient,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<FiksArkivDefaultResponseHandler> logger
    )
    {
        _fiksArkivSettings = fiksArkivSettings.Value;
        _fiksArkivInstanceClient = fiksArkivInstanceClient;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task HandleSuccess(
        Instance instance,
        FiksIOReceivedMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation(
            "Received message {MessageType}:{MessageId} is a successful response: {MessageContent}",
            message.Message.MessageType,
            message.Message.MessageId,
            payloads?.Select(x => x.Content) ?? ["Message contains no content."]
        );

        if (message.Message.MessageType != FiksArkivConstants.MessageTypes.ArchiveRecordCreationReceipt)
        {
            _logger.LogInformation(
                "We are only interested in {TargetMessageType} messages. Skipping further processing for message of type {MessageType}.",
                FiksArkivConstants.MessageTypes.ArchiveRecordCreationReceipt,
                message.Message.MessageType
            );
            return;
        }

        if (payloads?.Count > 1)
            _logger.LogWarning(
                "Message contains multiple responses. This is unexpected and possibly warrants further investigation."
            );

        if (_fiksArkivSettings.SuccessHandling is null)
        {
            _logger.LogInformation("Success handling is disabled, skipping further processing.");
            return;
        }

        ArgumentNullException.ThrowIfNull(instance);
        InstanceIdentifier instanceIdentifier = new(instance);

        // Move the instance process forward if configured
        if (_fiksArkivSettings.SuccessHandling.MoveToNextTask)
            await MoveProcessNext(instance, _fiksArkivSettings.SuccessHandling.GetActionOrDefault(), cancellationToken);

        // Mark the instance as completed if configured
        if (_fiksArkivSettings.SuccessHandling.MarkInstanceComplete)
            await _fiksArkivInstanceClient.MarkInstanceComplete(instanceIdentifier, cancellationToken);
    }

    /// <inheritdoc />
    public async Task HandleError(
        Instance instance,
        FiksIOReceivedMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogError(
            "Received message {MessageType}:{MessageId} is an error response: {MessageContent}",
            message.Message.MessageType,
            message.Message.MessageId,
            payloads?.Select(x => x.Content) ?? ["Message contains no content."]
        );

        if (_fiksArkivSettings.ErrorHandling is null)
        {
            _logger.LogInformation("Error handling is disabled, skipping further processing.");
            return;
        }

        ArgumentNullException.ThrowIfNull(instance);

        // Move the instance process forward if configured
        if (_fiksArkivSettings.ErrorHandling.MoveToNextTask)
            await MoveProcessNext(instance, _fiksArkivSettings.ErrorHandling.GetActionOrDefault(), cancellationToken);
    }

    /// <summary>
    /// Advances the instance parked on the Fiks Arkiv service task by enqueuing a process-next directly on the
    /// in-process <see cref="IProcessEngine"/> as the service owner — no self HTTP call, no Maskinporten. The
    /// engine auto-appends the workflow onto the collection's current heads (running it immediately when idle,
    /// or chaining after an in-flight advance), so there is nothing to gate on here; it returns as soon as the
    /// engine has durably accepted the enqueue. Requiring the current task to still be the Fiks Arkiv service
    /// task makes redelivered FiksIO messages a safe no-op after the advance has committed.
    /// </summary>
    private async Task MoveProcessNext(Instance instance, string? action, CancellationToken cancellationToken)
    {
        await using AsyncServiceScope scope = _serviceScopeFactory.CreateAsyncScope();
        var processEngine = scope.ServiceProvider.GetRequiredService<IProcessEngine>();
        await processEngine.EnqueueProcessNext(
            instance,
            new Actor { OrgId = instance.Org },
            action,
            requiredCurrentTaskType: AltinnTaskTypes.FiksArkiv,
            ct: cancellationToken
        );
    }
}
