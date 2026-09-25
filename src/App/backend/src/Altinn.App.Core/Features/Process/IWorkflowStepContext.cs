namespace Altinn.App.Core.Features.Process;

/// <summary>Data access and durable execution identity shared by lifecycle commands and service stages.</summary>
public interface IWorkflowStepContext
{
    /// <summary>Instance data available to this attempt. The callback owns persistence.</summary>
    IInstanceDataMutator InstanceDataMutator { get; }

    /// <summary>The executing workflow, stable across retry and resume. A mailbox continuation may use a new workflow.</summary>
    Guid WorkflowId { get; }

    /// <summary>The executing step, stable across retry and resume.</summary>
    Guid StepId { get; }

    /// <summary>The engine's persisted reference time for this step, stable across attempts.</summary>
    DateTimeOffset ExecutionReferenceTime { get; }

    /// <summary>Cancellation requested for the current attempt.</summary>
    CancellationToken CancellationToken { get; }
}
