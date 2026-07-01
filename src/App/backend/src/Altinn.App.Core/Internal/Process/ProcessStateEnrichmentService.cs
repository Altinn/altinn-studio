using System.Security.Claims;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Read-path wrapper around <see cref="ProcessStateEnricher"/> that additionally surfaces the current
/// service task's workflow failure (when the backing workflow requires resumption) so that a refreshing
/// or polling client can render the failure without having issued the failing <c>process/next</c> request.
/// </summary>
/// <remarks>
/// This lives separately from <see cref="ProcessStateEnricher"/> because the enricher is public and cannot
/// take a dependency on the internal <see cref="IWorkflowEngineService"/>. The engine is only queried when
/// the current task is a service task, keeping the extra round-trip off the common read path.
/// </remarks>
internal sealed class ProcessStateEnrichmentService
{
    private readonly ProcessStateEnricher _enricher;
    private readonly IWorkflowEngineService _workflowEngineService;
    private readonly AppImplementationFactory _appImplementationFactory;

    public ProcessStateEnrichmentService(
        ProcessStateEnricher enricher,
        IWorkflowEngineService workflowEngineService,
        AppImplementationFactory appImplementationFactory
    )
    {
        _enricher = enricher;
        _workflowEngineService = workflowEngineService;
        _appImplementationFactory = appImplementationFactory;
    }

    /// <summary>
    /// Enriches the process state and, when parked on a failed service task, attaches the workflow failure
    /// to <see cref="AppProcessElementInfo.WorkflowFailure"/>.
    /// </summary>
    public async Task<AppProcessState> EnrichWithWorkflowState(
        Instance instance,
        ProcessState? processState,
        ClaimsPrincipal user,
        CancellationToken ct = default
    )
    {
        AppProcessState appProcessState = await _enricher.Enrich(instance, processState, user);

        AppProcessElementInfo? currentTask = appProcessState.CurrentTask;
        if (currentTask?.ElementId is null || !IsServiceTask(currentTask.AltinnTaskType))
        {
            return appProcessState;
        }

        CurrentTaskWorkflowState workflowState = await _workflowEngineService.GetCurrentTaskWorkflowState(instance, ct);
        if (workflowState is { ProcessNextState: ProcessNextState.ResumeRequired, WorkflowFailure: { } failure })
        {
            currentTask.WorkflowFailure = failure;
        }

        return appProcessState;
    }

    private bool IsServiceTask(string? altinnTaskType)
    {
        if (altinnTaskType is null)
        {
            return false;
        }

        return _appImplementationFactory
            .GetAll<IServiceTask>()
            .Any(x => x.Type.Equals(altinnTaskType, StringComparison.OrdinalIgnoreCase));
    }
}
