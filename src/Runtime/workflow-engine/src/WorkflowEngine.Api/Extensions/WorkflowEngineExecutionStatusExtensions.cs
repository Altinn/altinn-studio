using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Extensions;

internal static class WorkflowEngineExecutionStatusExtensions
{
    extension(ExecutionResult result)
    {
        public bool IsSuccess() => result.Status == ExecutionStatus.Success;

        public bool IsError() => result.Status == ExecutionStatus.Error;
    }
}
