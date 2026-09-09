using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Signing.Services;

/// <summary>
/// Projects independent notification jobs for the current signing entry. Durable delivery facts remain in
/// signee state; execution failures and retry counters are read from the engine rather than copied to Storage.
/// </summary>
internal sealed class SigningNotificationWorkflowService(
    IWorkflowEngineClient client,
    ISigneeContextsManager signeeContextsManager
)
{
    public async Task<IReadOnlyList<SigningNotificationWorkflow>> List(
        IInstanceDataAccessor accessor,
        AltinnSignatureConfiguration configuration,
        string taskId,
        CancellationToken ct
    )
    {
        if (accessor.Instance.Process?.CurrentTask?.ElementId != taskId)
        {
            return [];
        }

        var element = signeeContextsManager.FindTaskSigneeStateElement(accessor, configuration, taskId);
        if (element is null || !Guid.TryParse(element.Id, out Guid initializationId))
        {
            return [];
        }

        var signees = await signeeContextsManager.LoadSigneeContexts(accessor, configuration, element);
        var recipients = signees
            .Where(signee => signee.SigneeId.HasValue)
            .ToDictionary(signee => signee.SigneeId.GetValueOrDefault());
        if (recipients.Count == 0)
        {
            // Existing instances created before workflows keep their persisted notification status.
            return [];
        }

        string collectionKey = ProcessNextRequestFactory.CreateCollectionKey(new InstanceIdentifier(accessor.Instance));
        var labels = new Dictionary<string, string>
        {
            [SigningWorkflowLabels.SigningNotificationLabel] = "true",
            [SigningWorkflowLabels.SigningInitializationLabel] = initializationId.ToString("D"),
            [SigningWorkflowLabels.SigningTaskLabel] = taskId,
        };
        var workflows = await client.ListWorkflows(accessor.Instance.AppId, collectionKey, labels, ct: ct);
        List<SigningNotificationWorkflow> result = [];
        foreach (var workflow in workflows)
        {
            // Validate returned scope as well as sending filters. Never let a foreign or superseded job become
            // an app-authorized resume target, even if a client or engine changes its filtering behavior.
            // ASP.NET preserves escaped slashes in route values, and the engine lowercases the namespace.
            if (
                !string.Equals(
                    Uri.UnescapeDataString(workflow.Namespace),
                    accessor.Instance.AppId,
                    StringComparison.OrdinalIgnoreCase
                )
                || workflow.CollectionKey != collectionKey
                || workflow.IsHead != false
                || workflow.Steps.Count != 1
                || workflow.Steps[0].OperationId != NotifySigneeCommand.Key
                || workflow.Steps[0].Command.Type != "app"
                || workflow.Labels is not { } actual
                || labels.Any(label => !actual.TryGetValue(label.Key, out string? value) || value != label.Value)
                || !actual.TryGetValue(SigningWorkflowLabels.SigningSigneeLabel, out string? signeeLabel)
                || !Guid.TryParse(signeeLabel, out Guid signeeId)
                || !recipients.TryGetValue(signeeId, out var signee)
            )
            {
                continue;
            }

            var step = workflow.Steps[0];
            // WasRetryable records whether the engine scheduled another attempt, so it is false on
            // the final attempt even when a transient HTTP failure exhausted the retry allowance.
            var lastError = step.ErrorHistory?.LastOrDefault();
            bool transientFailure =
                lastError?.WasRetryable == true || lastError?.HttpStatusCode is 408 or 429 or >= 500;
            string? errorCode =
                workflow.OverallStatus == PersistentItemStatus.Failed
                    ? transientFailure
                        ? "NotificationRetryExhausted"
                        : "NotificationFailed"
                    : null;
            result.Add(
                new SigningNotificationWorkflow(
                    workflow.DatabaseId,
                    signeeId,
                    signee.Signee.GetParty().PartyId,
                    workflow.OverallStatus,
                    step.RetryCount,
                    errorCode
                )
            );
        }

        return result;
    }

    public Task<ResumeWorkflowResponse> Resume(string appId, Guid workflowId, CancellationToken ct) =>
        client.ResumeWorkflow(appId, workflowId, cascade: false, ct);
}

internal sealed record SigningNotificationWorkflow(
    Guid WorkflowId,
    Guid SigneeId,
    int PartyId,
    PersistentItemStatus Status,
    int RetryCount,
    string? ErrorCode
)
{
    public bool CanResume => Status is PersistentItemStatus.Failed or PersistentItemStatus.Canceled;
}
