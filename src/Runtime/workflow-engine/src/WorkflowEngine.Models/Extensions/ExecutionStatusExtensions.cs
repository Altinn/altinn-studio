namespace WorkflowEngine.Models.Extensions;

public static class ExecutionStatusExtensions
{
    extension(ExecutionResult result)
    {
        /// <summary>
        /// Determines if the execution result indicates a successful execution.
        /// </summary>
        public bool IsSuccess() => result.Status == ExecutionStatus.Success;

        /// <summary>
        /// Determines if the execution result indicates a retryable error.
        /// </summary>
        public bool IsRetryableError() => result.Status == ExecutionStatus.RetryableError;

        /// <summary>
        /// Determines if the execution result indicates a critical error.
        /// </summary>
        public bool IsCriticalError() => result.Status == ExecutionStatus.CriticalError;
    }
}
