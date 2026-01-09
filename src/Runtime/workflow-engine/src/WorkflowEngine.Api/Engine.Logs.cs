using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal static partial class EngineLogs
{
    [LoggerMessage(LogLevel.Debug, "Enqueuing workflow request {Request}")]
    internal static partial void EnqueuingWorkflow(this ILogger<Engine> logger, Request request);

    [LoggerMessage(LogLevel.Debug, "Populating workflows from database")]
    internal static partial void PopulatingWorkflowsFromDb(this ILogger<Engine> logger);

    [LoggerMessage(LogLevel.Debug, "Restored workflow {WorkflowIdentifier} from database")]
    internal static partial void RestoredWorkflowFromDb(this ILogger<Engine> logger, string workflowIdentifier);

    [LoggerMessage(LogLevel.Information, "Populated {WorkflowCount} jobs from database")]
    internal static partial void SuccessfullyPopulatedFromDb(this ILogger<Engine> logger, int workflowCount);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to populate workflows from database after all retries exhausted. Database down?"
    )]
    internal static partial void FailedToPopulateFromFromDb(this ILogger<Engine> logger, Exception ex);

    [LoggerMessage(LogLevel.Debug, "Updating workflow in storage: {Workflow}")]
    internal static partial void UpdatingWorkflowInDb(this ILogger<Engine> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Trace, "Workflow {WorkflowIdentifier} updated in database")]
    internal static partial void WorkflowUpdatedInDb(this ILogger<Engine> logger, string workflowIdentifier);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update workflow {WorkflowIdentifier} in database after all retries exhausted. Database down?"
    )]
    internal static partial void FailedUpdatingWorkflowInDb(
        this ILogger<Engine> logger,
        string workflowIdentifier,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Updating step in storage: {Step}")]
    internal static partial void UpdatingStepInDb(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Trace, "Step {StepIdentifier} updated in database")]
    internal static partial void StepUpdatedInDb(this ILogger<Engine> logger, string stepIdentifier);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update step {StepIdentifier} in database after all retries exhausted. Database down?"
    )]
    internal static partial void FailedUpdatingStepInDb(
        this ILogger<Engine> logger,
        string stepIdentifier,
        Exception ex
    );

    [LoggerMessage(LogLevel.Trace, "Checking if workflow engine should run")]
    internal static partial void CheckShouldRun(this ILogger<Engine> logger);

    [LoggerMessage(LogLevel.Information, "Workflow engine is disabled. Backing off for {BackoffDelay}")]
    internal static partial void EngineIsDisabledBackingOff(this ILogger<Engine> logger, TimeSpan backoffDelay);

    [LoggerMessage(LogLevel.Trace, "Workflow engine is enabled")]
    internal static partial void EngineIsEnabled(this ILogger<Engine> logger);

    [LoggerMessage(LogLevel.Trace, "Workflow engine is disabled")]
    internal static partial void EngineIsDisabled(this ILogger<Engine> logger);

    [LoggerMessage(LogLevel.Trace, "Checking if we have work")]
    internal static partial void CheckHaveWork(this ILogger<Engine> logger);

    [LoggerMessage(LogLevel.Trace, "We have work to process: {InboxCount}")]
    internal static partial void HaveWork(this ILogger<Engine> logger, int inboxCount);

    [LoggerMessage(LogLevel.Trace, "No work, taking a short nap")]
    internal static partial void NoWork(this ILogger<Engine> logger);

    [LoggerMessage(
        LogLevel.Trace,
        "Entering MainLoop. Inbox count: {InboxCount}. Queue slots available: {AvailableQueueSlots}"
    )]
    internal static partial void EnteringMainLoop(this ILogger<Engine> logger, int inboxCount, int availableQueueSlots);

    [LoggerMessage(LogLevel.Trace, "Processing all workflows in queue ({InboxCount})")]
    internal static partial void ProcessingAllWorkflowsInQueue(this ILogger<Engine> logger, int inboxCount);

    [LoggerMessage(LogLevel.Debug, "Processing workflow: {Workflow}")]
    internal static partial void ProcessingWorkflow(this ILogger<Engine> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Debug, "Workflow {Workflow} is waiting for database operation to complete")]
    internal static partial void WaitingForWorkflowDbTask(this ILogger<Engine> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Debug, "Workflow {Workflow} database operation has completed. Cleaning up")]
    internal static partial void CleaningUpWorkflowDbTask(this ILogger<Engine> logger, Workflow workflow);

    [LoggerMessage(
        LogLevel.Debug,
        "Workflow {Workflow} is still has tasks processing. Leaving in queue for next iteration"
    )]
    internal static partial void PendingStepsRemain(this ILogger<Engine> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Debug, "Workflow {Workflow} is done")]
    internal static partial void WorkflowCompleted(this ILogger<Engine> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Debug, "Processing step: {Step}")]
    internal static partial void ProcessingStep(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Trace, "Step {Step} not ready for execution")]
    internal static partial void NotReadyForExecution(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Step {Step} is waiting for database operation to complete")]
    internal static partial void WaitingForStepDbTask(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Step {Step} database operation has completed. Cleaning up")]
    internal static partial void CleaningUpStepDbTask(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Step {Step} is waiting for execution to complete")]
    internal static partial void WaitingForStepExecutionTask(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Step {Step} execution has completed. Need to update database")]
    internal static partial void StepExecutionCompleted(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Step {Step} is new. Starting execution")]
    internal static partial void ExecutingStep(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Step {Step} completed successfully")]
    internal static partial void StepCompletedSuccessfully(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Step {Step} failed")]
    internal static partial void StepFailed(this ILogger<Engine> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Requeuing step {Step} (Retry count: {Retries})")]
    internal static partial void SlatingStepForRetry(this ILogger<Engine> logger, Step step, int retries);

    [LoggerMessage(LogLevel.Error, "Failing step {Step}. No more retries available after {Retries} attempts")]
    internal static partial void FailingStep(this ILogger<Engine> logger, Step step, int retries);

    [LoggerMessage(LogLevel.Information, "Starting workflow engine")]
    internal static partial void StartingEngine(this ILogger<Engine> logger);

    [LoggerMessage(LogLevel.Error, "The workflow engine encountered an unhandled exception: {Message}")]
    internal static partial void UnhandledMainloopException(this ILogger<Engine> logger, string message, Exception ex);

    [LoggerMessage(LogLevel.Information, "Stopping workflow engine")]
    internal static partial void StoppingEngine(this ILogger<Engine> logger);

    [LoggerMessage(LogLevel.Trace, "Acquiring queue slot")]
    internal static partial void AcquiringQueueSlot(this ILogger<Engine> logger);

    [LoggerMessage(LogLevel.Trace, "Status after acquiring slot: {Status}")]
    internal static partial void StatusAfterAcquiringSlot(this ILogger<Engine> logger, EngineHealthStatus status);

    [LoggerMessage(LogLevel.Trace, "Releasing queue slot")]
    internal static partial void ReleasingQueueSlot(this ILogger<Engine> logger);
}
