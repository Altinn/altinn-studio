namespace WorkflowEngine.Models;

/// <summary>
/// Outcome of <see cref="Abstractions.ICommand.Validate"/>.
/// A closed hierarchy with two cases: <see cref="Valid"/> and <see cref="Invalid"/>.
/// </summary>
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
