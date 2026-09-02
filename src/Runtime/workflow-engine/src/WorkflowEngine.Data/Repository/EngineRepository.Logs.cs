using Microsoft.Extensions.Logging;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

internal static partial class EngineRepositoryLogs
{
    [LoggerMessage(LogLevel.Debug, "Fetching {WorkflowType} workflows from database")]
    internal static partial void FetchingWorkflows(this ILogger<EngineRepository> logger, string workflowType);

    [LoggerMessage(LogLevel.Debug, "Counting {WorkflowType} workflows from database")]
    internal static partial void CountingWorkflows(this ILogger<EngineRepository> logger, string workflowType);

    [LoggerMessage(LogLevel.Debug, "Fetched {WorkflowCount} workflows from database")]
    internal static partial void SuccessfullyFetchedWorkflows(this ILogger<EngineRepository> logger, int workflowCount);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to fetch workflows from database due to task cancellation or after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToFetchWorkflows(
        this ILogger<EngineRepository> logger,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Fetching workflow by ID {WorkflowId}")]
    internal static partial void FetchingWorkflowById(this ILogger<EngineRepository> logger, Guid workflowId);

    [LoggerMessage(LogLevel.Debug, "Workflow with ID {WorkflowId} not found")]
    internal static partial void WorkflowNotFound(this ILogger<EngineRepository> logger, Guid workflowId);

    [LoggerMessage(LogLevel.Debug, "Updating workflow in database: {Workflow}")]
    internal static partial void UpdatingWorkflow(this ILogger<EngineRepository> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Debug, "Successfully updated workflow in database: {Workflow}")]
    internal static partial void SuccessfullyUpdatedWorkflow(this ILogger<EngineRepository> logger, Workflow workflow);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update workflow {WorkflowIdentifier} (ID: {DatabaseId}) in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateWorkflow(
        this ILogger<EngineRepository> logger,
        string workflowIdentifier,
        Guid databaseId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Successfully updated {StepCount} steps in database")]
    internal static partial void SuccessfullyUpdatedSteps(this ILogger<EngineRepository> logger, int stepCount);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update {StepCount} steps in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateSteps(
        this ILogger<EngineRepository> logger,
        int stepCount,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Updating step in database: {Step}")]
    internal static partial void UpdatingStep(this ILogger<EngineRepository> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Successfully updated step in database: {Step}")]
    internal static partial void SuccessfullyUpdatedStep(this ILogger<EngineRepository> logger, Step step);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update step {StepIdentifier} (ID: {DatabaseId}) in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateStep(
        this ILogger<EngineRepository> logger,
        string stepIdentifier,
        Guid databaseId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Failed to batch enqueue workflows: {message}")]
    internal static partial void FailedToBatchEnqueueWorkflows(
        this ILogger<EngineRepository> logger,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Failed to batch update workflow statuses: {message}")]
    internal static partial void FailedToBatchUpdateWorkflowStatuses(
        this ILogger<EngineRepository> logger,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Failed to batch update {workflowCount} workflows and steps: {message}")]
    internal static partial void FailedToBatchUpdateWorkflowsAndSteps(
        this ILogger<EngineRepository> logger,
        int workflowCount,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Failed to batch update heartbeats for {workflowCount} workflows: {message}")]
    internal static partial void FailedToBatchUpdateHeartbeats(
        this ILogger<EngineRepository> logger,
        int workflowCount,
        string message,
        Exception ex
    );

    [LoggerMessage(
        LogLevel.Warning,
        "Lease lost on {LostCount} of {TotalCount} workflows during batch write-back — another host has reclaimed them; updates for those workflows are skipped"
    )]
    internal static partial void BatchUpdateLeaseLost(
        this ILogger<EngineRepository> logger,
        int lostCount,
        int totalCount
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failed to {Operation} mailbox {MailboxId} after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedMailboxOperation(
        this ILogger<EngineRepository> logger,
        string operation,
        Guid mailboxId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Failed to mint a batch of {MailboxCount} mailbox(es): {Message}")]
    internal static partial void FailedToBatchMintMailboxes(
        this ILogger<EngineRepository> logger,
        int mailboxCount,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Failed to close a batch of {MailboxCount} mailbox(es): {Message}")]
    internal static partial void FailedToBatchCloseMailboxes(
        this ILogger<EngineRepository> logger,
        int mailboxCount,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Failed to deliver a batch of {DeliveryCount} mailbox message(s): {Message}")]
    internal static partial void FailedToBatchDeliverToMailboxes(
        this ILogger<EngineRepository> logger,
        int deliveryCount,
        string message,
        Exception ex
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failed to read the mailbox receipt for receive workflow {WorkflowId} after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedMailboxReceiptRead(
        this ILogger<EngineRepository> logger,
        Guid workflowId,
        string message,
        Exception ex
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failed to {Operation} after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedMailboxRead(
        this ILogger<EngineRepository> logger,
        string operation,
        string message,
        Exception ex
    );

    [LoggerMessage(
        LogLevel.Warning,
        "Mailbox {MailboxId} closed at its deadline holding {UnpairedDeliveries} delivered message(s) no receiver was ever enqueued for; they stay readable until retention purges the mailbox"
    )]
    internal static partial void MailboxClosedWithUnpairedDeliveries(
        this ILogger<EngineRepository> logger,
        Guid mailboxId,
        long unpairedDeliveries
    );
}
