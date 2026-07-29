using System.Diagnostics;
using System.Text.Json;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Models;

/// <summary>
/// Everything a command descriptor needs to execute a step.
/// </summary>
public sealed record CommandExecutionContext
{
    /// <summary>
    /// The parent workflow.
    /// </summary>
    public required Workflow Workflow { get; init; }

    /// <summary>
    /// The step being executed.
    /// </summary>
    public required Step Step { get; init; }

    /// <summary>
    /// The raw command configuration (from <see cref="CommandDefinition.Data"/>), for logging/diagnostics.
    /// </summary>
    public JsonElement? RawCommandData { get; init; }

    /// <summary>
    /// The deserialized command data, typed according to the descriptor's <see cref="ICommand.CommandDataType"/>.
    /// </summary>
    public object? TypedCommandData { get; init; }

    /// <summary>
    /// The deserialized workflow context, typed according to the descriptor's <see cref="ICommand.WorkflowContextType"/>.
    /// </summary>
    public object? TypedWorkflowContext { get; init; }

    /// <summary>
    /// State output from the previous step (or <see cref="Workflow.InitialState"/> for the first step).
    /// </summary>
    public string? StateIn { get; init; }

    /// <summary>
    /// The absolute instant this step's wait budget runs out, or <c>null</c> before its first deferral.
    /// Lets a deferring command pace itself against the budget it actually has — and give up early,
    /// deliberately, rather than being failed by the engine when the budget expires.
    /// </summary>
    /// <remarks>
    /// A deadline rather than a remaining duration: a duration starts aging the instant it is computed,
    /// and a command that hands it across a network boundary (as the app callback does) cannot tell how
    /// much of it has already been spent. Pair with <see cref="Step.DeferCount"/> on <see cref="Step"/>.
    /// </remarks>
    public DateTimeOffset? WaitDeadline { get; init; }

    /// <summary>
    /// Parent trace context for distributed tracing.
    /// </summary>
    public ActivityContext? ParentTraceContext { get; init; }

    /// <summary>
    /// Gets the pre-deserialized command data, cast to <typeparamref name="T"/>.
    /// </summary>
    public T GetCommandData<T>()
        where T : class =>
        TypedCommandData as T
        ?? throw new CommandDataTypeMismatchException(
            $"Command data is not of type {typeof(T).Name}. Actual: {TypedCommandData?.GetType().Name ?? "null"}"
        );

    /// <summary>
    /// Gets the pre-deserialized workflow context, cast to <typeparamref name="T"/>.
    /// </summary>
    public T GetWorkflowContext<T>()
        where T : class =>
        TypedWorkflowContext as T
        ?? throw new CommandDataTypeMismatchException(
            $"Workflow context is not of type {typeof(T).Name}. Actual: {TypedWorkflowContext?.GetType().Name ?? "null"}"
        );
}
