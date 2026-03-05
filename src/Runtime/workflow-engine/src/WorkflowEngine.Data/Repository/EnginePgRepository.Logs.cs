using Microsoft.Extensions.Logging;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

internal static partial class EnginePgRepositoryLogs
{
    [LoggerMessage(LogLevel.Debug, "Fetching {WorkflowType} workflows from database")]
    internal static partial void FetchingWorkflows(this ILogger<EnginePgRepository> logger, string workflowType);

    [LoggerMessage(LogLevel.Debug, "Counting {WorkflowType} workflows from database")]
    internal static partial void CountingWorkflows(this ILogger<EnginePgRepository> logger, string workflowType);

    [LoggerMessage(LogLevel.Debug, "Fetched {WorkflowCount} workflows from database")]
    internal static partial void SuccessfullyFetchedWorkflows(
        this ILogger<EnginePgRepository> logger,
        int workflowCount
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failed to fetch workflows from database due to task cancellation or after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToFetchWorkflows(
        this ILogger<EnginePgRepository> logger,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Adding workflow to database: {workflowEnqueueRequestOld}")]
    internal static partial void AddingWorkflow(
        this ILogger<EnginePgRepository> logger,
        WorkflowRequest workflowEnqueueRequestOld
    );

    [LoggerMessage(LogLevel.Debug, "Adding batch of {WorkflowCount} workflows to database")]
    internal static partial void AddingWorkflowBatch(this ILogger<EnginePgRepository> logger, int workflowCount);

    [LoggerMessage(LogLevel.Debug, "Successfully added batch of {WorkflowCount} workflows to database")]
    internal static partial void SuccessfullyAddedWorkflowBatch(
        this ILogger<EnginePgRepository> logger,
        int workflowCount
    );

    [LoggerMessage(LogLevel.Debug, "Fetching active workflows for instance {InstanceGuid}")]
    internal static partial void FetchingWorkflowsForInstance(
        this ILogger<EnginePgRepository> logger,
        Guid instanceGuid
    );

    [LoggerMessage(LogLevel.Debug, "Fetching workflow by ID {WorkflowId}")]
    internal static partial void FetchingWorkflowById(this ILogger<EnginePgRepository> logger, Guid workflowId);

    [LoggerMessage(LogLevel.Debug, "Workflow with ID {WorkflowId} not found")]
    internal static partial void WorkflowNotFound(this ILogger<EnginePgRepository> logger, Guid workflowId);

    [LoggerMessage(LogLevel.Debug, "Successfully added workflow to database: {Workflow}")]
    internal static partial void SuccessfullyAddedWorkflow(this ILogger<EnginePgRepository> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Error, "Failed to add workflow to database: {Message}")]
    internal static partial void FailedToAddWorkflows(
        this ILogger<EnginePgRepository> logger,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Updating workflow in database: {Workflow}")]
    internal static partial void UpdatingWorkflow(this ILogger<EnginePgRepository> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Debug, "Successfully updated workflow in database: {Workflow}")]
    internal static partial void SuccessfullyUpdatedWorkflow(
        this ILogger<EnginePgRepository> logger,
        Workflow workflow
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update workflow {WorkflowIdentifier} (ID: {DatabaseId}) in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateWorkflow(
        this ILogger<EnginePgRepository> logger,
        string workflowIdentifier,
        Guid databaseId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Successfully updated {StepCount} steps in database")]
    internal static partial void SuccessfullyUpdatedSteps(this ILogger<EnginePgRepository> logger, int stepCount);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update {StepCount} steps in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateSteps(
        this ILogger<EnginePgRepository> logger,
        int stepCount,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Updating step in database: {Step}")]
    internal static partial void UpdatingStep(this ILogger<EnginePgRepository> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Successfully updated step in database: {Step}")]
    internal static partial void SuccessfullyUpdatedStep(this ILogger<EnginePgRepository> logger, Step step);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update step {StepIdentifier} (ID: {DatabaseId}) in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateStep(
        this ILogger<EnginePgRepository> logger,
        string stepIdentifier,
        Guid databaseId,
        string message,
        Exception ex
    );
}
