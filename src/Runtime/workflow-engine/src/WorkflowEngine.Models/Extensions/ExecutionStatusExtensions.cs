namespace WorkflowEngine.Models.Extensions;

public static class ExecutionStatusExtensions
{
    extension(ExecutionResult result)
    {
        public bool IsSuccess() => result.Status == ExecutionStatus.Success;

        public bool IsError() => result.Status == ExecutionStatus.Error;
    }
}
