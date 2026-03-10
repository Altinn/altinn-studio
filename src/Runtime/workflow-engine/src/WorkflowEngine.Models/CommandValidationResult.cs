namespace WorkflowEngine.Models;

public abstract record CommandValidationResult
{
    private CommandValidationResult() { }

    public static Valid Accept() => new();

    public static Invalid Reject(string message) => new(message);

    /// <summary>
    /// Indicates that the command has passed validation.
    /// </summary>
    public sealed record Valid : CommandValidationResult { }

    /// <summary>
    /// Indicates that the command has <b>not</b> passed validation.
    /// </summary>
    public sealed record Invalid(string Message) : CommandValidationResult { }
}
