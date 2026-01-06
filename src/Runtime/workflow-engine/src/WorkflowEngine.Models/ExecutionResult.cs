namespace WorkflowEngine.Models;

public record struct ExecutionResult(ExecutionStatus Status, string? Message = null)
{
    public static ExecutionResult Success() => new(ExecutionStatus.Success);

    public static ExecutionResult Error(string message) => new(ExecutionStatus.Error, message);
};
