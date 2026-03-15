namespace WorkflowEngine.Models;

public abstract record CommandValidationResult
{
    private CommandValidationResult() { }

    /// <summary>
    /// Indicates that the command has passed validation.
    /// </summary>
    public sealed record Valid : CommandValidationResult;

    /// <summary>
    /// Indicates that the command has <b>not</b> passed validation.
    /// </summary>
    public sealed record Invalid(string Message) : CommandValidationResult;
}
