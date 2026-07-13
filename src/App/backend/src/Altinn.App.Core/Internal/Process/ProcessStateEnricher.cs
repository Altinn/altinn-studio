using System.Security.Claims;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using IAuthorizationService = Altinn.App.Core.Internal.Auth.IAuthorizationService;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Enriches a <see cref="ProcessState"/> into an <see cref="AppProcessState"/>
/// with authorized actions, read/write access, element types, and process task metadata.
/// </summary>
public sealed class ProcessStateEnricher
{
    private readonly IProcessReader _processReader;
    private readonly IAuthorizationService _authorization;

    // Resolved lazily via the service provider: IWorkflowEngineService is internal, and this type
    // is public because the (public) process controllers inject it, so it cannot appear in a public
    // constructor signature.
    private readonly IServiceProvider _serviceProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessStateEnricher"/>
    /// </summary>
    /// <param name="processReader"></param>
    /// <param name="authorization"></param>
    /// <param name="serviceProvider"></param>
    public ProcessStateEnricher(
        IProcessReader processReader,
        IAuthorizationService authorization,
        IServiceProvider serviceProvider
    )
    {
        _processReader = processReader;
        _authorization = authorization;
        _serviceProvider = serviceProvider;
    }

    /// <summary>
    /// Enriches a <see cref="ProcessState"/> with authorized actions, access info, and process task metadata.
    /// </summary>
    /// <param name="instance">The instance to authorize actions against.</param>
    /// <param name="processState">The process state to enrich.</param>
    /// <param name="user">The current user's claims principal.</param>
    /// <param name="includeWorkflowStatus">
    /// Whether to resolve the live <see cref="AppProcessState.Workflow"/> annotation from the
    /// workflow engine. When false the annotation is omitted entirely (null, distinguishable from
    /// idle) and the read does not touch the engine - an opt-out for bulk/machine-to-machine
    /// consumers that don't need liveness and don't want the engine as a read dependency.
    /// </param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>An enriched <see cref="AppProcessState"/>.</returns>
    public async Task<AppProcessState> Enrich(
        Instance instance,
        ProcessState? processState,
        ClaimsPrincipal user,
        bool includeWorkflowStatus = true,
        CancellationToken ct = default
    )
    {
        var appProcessState = new AppProcessState(processState);

        if (appProcessState.CurrentTask?.ElementId != null)
        {
            var flowElement = _processReader.GetFlowElement(appProcessState.CurrentTask.ElementId);
            if (flowElement is ProcessTask processTask)
            {
                appProcessState.CurrentTask.Actions = new Dictionary<string, bool>();
                var actions = new List<AltinnAction> { new("read"), new("write") };
                actions.AddRange(
                    processTask.ExtensionElements?.TaskExtension?.AltinnActions ?? new List<AltinnAction>()
                );
                actions = actions.DistinctBy(a => a.Value, StringComparer.Ordinal).ToList();
                var authDecisions = await _authorization.AuthorizeActions(instance, user, actions);
                appProcessState.CurrentTask.Actions = authDecisions
                    .Where(a => a.ActionType == ActionType.ProcessAction)
                    .ToDictionary(a => a.Id, a => a.Authorized);
                appProcessState.CurrentTask.HasReadAccess = authDecisions.Single(a => a.Id == "read").Authorized;
                appProcessState.CurrentTask.HasWriteAccess = authDecisions.Single(a => a.Id == "write").Authorized;
                appProcessState.CurrentTask.UserActions = authDecisions;
                appProcessState.CurrentTask.ElementType = flowElement.ElementType();
            }
        }

        var processTasks = new List<AppProcessTaskTypeInfo>();
        foreach (var processElement in _processReader.GetAllFlowElements().OfType<ProcessTask>())
        {
            processTasks.Add(
                new AppProcessTaskTypeInfo
                {
                    ElementId = processElement.Id,
                    ElementType = processElement.ElementType(),
                    AltinnTaskType = processElement.ExtensionElements?.TaskExtension?.TaskType,
                }
            );
        }

        appProcessState.ProcessTasks = processTasks;

        if (includeWorkflowStatus)
        {
            appProcessState.Workflow = await ResolveWorkflowStatus(instance, ct);
        }

        return appProcessState;
    }

    /// <summary>
    /// Upper bound on the live status lookup. The lookup runs on every process/instance read (and
    /// every frontend poll tick), so a slow engine must fail fast instead of holding the read
    /// hostage for the HTTP client's full timeout. Generous compared to a healthy engine round-trip.
    /// Internal-settable for tests.
    /// </summary>
    internal TimeSpan WorkflowStatusResolutionBudget { get; set; } = TimeSpan.FromSeconds(5);

    /// <summary>
    /// Resolves the live workflow status for enrichment. A v9 app is codependent on the workflow
    /// engine, so a failure to communicate with it is a systemic fault that must surface, not be
    /// masked: any communication error - including the resolution budget elapsing - propagates to
    /// the caller (a 500 on the read). Definitive negative findings (no collection, no active or
    /// failed head) are resolved to <see cref="WorkflowActivityStatus.Idle"/> inside
    /// <see cref="IWorkflowEngineService.ResolveWorkflowTaskStatus"/> and never throw.
    /// </summary>
    private async Task<AppProcessWorkflowStatus> ResolveWorkflowStatus(Instance instance, CancellationToken ct)
    {
        var workflowEngineService = _serviceProvider.GetRequiredService<IWorkflowEngineService>();
        using var budgetCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        budgetCts.CancelAfter(WorkflowStatusResolutionBudget);
        try
        {
            WorkflowTaskStatus workflowStatus = await workflowEngineService.ResolveWorkflowTaskStatus(
                instance,
                budgetCts.Token
            );
            return new AppProcessWorkflowStatus
            {
                Status = workflowStatus.Status,
                TargetTask = workflowStatus.TargetTask,
                Failure = workflowStatus.Failure is { } failure
                    ? new AppProcessWorkflowFailure { Kind = failure.Kind }
                    : null,
            };
        }
        catch (OperationCanceledException e) when (!ct.IsCancellationRequested)
        {
            // The resolution budget elapsed or the HTTP client timed out (the caller's own token
            // is untouched either way): translate the bare cancellation into an actionable error
            // instead of letting it read as a client abort.
            throw new TimeoutException(
                $"Live workflow status resolution for instance {instance.Id} timed out "
                    + $"(resolution budget {WorkflowStatusResolutionBudget.TotalSeconds:0.#}s).",
                e
            );
        }
    }
}
