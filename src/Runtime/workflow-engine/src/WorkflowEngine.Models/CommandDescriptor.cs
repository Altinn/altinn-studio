namespace WorkflowEngine.Models;

/// <summary>
/// Base class for command descriptors that need both typed command data and typed workflow context.
/// The engine deserializes the raw JSON into <typeparamref name="TData"/> and <typeparamref name="TContext"/>
/// before calling <see cref="Validate"/> or <see cref="ExecuteAsync"/>.
/// </summary>
/// <typeparam name="TData">The type to deserialize <see cref="Command.Data"/> into.</typeparam>
/// <typeparam name="TContext">The type to deserialize <see cref="Workflow.Context"/> into.</typeparam>
public abstract class CommandDescriptor<TData, TContext> : ICommandDescriptor
    where TData : class
    where TContext : class
{
    public abstract string CommandType { get; }

    public Type CommandDataType => typeof(TData);

    public Type WorkflowContextType => typeof(TContext);

    CommandValidationResult ICommandDescriptor.Validate(object? commandData, object? workflowContext) =>
        Validate(commandData as TData, workflowContext as TContext);

    Task<ExecutionResult> ICommandDescriptor.ExecuteAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    ) => ExecuteAsync(context, cancellationToken);

    /// <summary>
    /// Validates the deserialized command data and workflow context.
    /// Called at enqueue time before the workflow is persisted.
    /// </summary>
    protected abstract CommandValidationResult Validate(TData? commandData, TContext? workflowContext);

    /// <summary>
    /// Executes the command. Use <see cref="CommandExecutionContext.GetCommandData{T}"/>
    /// and <see cref="CommandExecutionContext.GetWorkflowContext{T}"/> to access typed data.
    /// </summary>
    protected abstract Task<ExecutionResult> ExecuteAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    );
}

/// <summary>
/// Base class for command descriptors that need typed command data but no workflow context.
/// The engine deserializes the raw JSON into <typeparamref name="TData"/>
/// before calling <see cref="Validate"/> or <see cref="ExecuteAsync"/>.
/// </summary>
/// <typeparam name="TData">The type to deserialize <see cref="Command.Data"/> into.</typeparam>
public abstract class CommandDescriptor<TData> : ICommandDescriptor
    where TData : class
{
    public abstract string CommandType { get; }

    public Type CommandDataType => typeof(TData);

    public Type? WorkflowContextType => null;

    CommandValidationResult ICommandDescriptor.Validate(object? commandData, object? workflowContext) =>
        Validate(commandData as TData);

    Task<ExecutionResult> ICommandDescriptor.ExecuteAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    ) => ExecuteAsync(context, cancellationToken);

    /// <summary>
    /// Validates the deserialized command data.
    /// Called at enqueue time before the workflow is persisted.
    /// </summary>
    protected abstract CommandValidationResult Validate(TData? commandData);

    /// <summary>
    /// Executes the command. Use <see cref="CommandExecutionContext.GetCommandData{T}"/>
    /// to access typed data.
    /// </summary>
    protected abstract Task<ExecutionResult> ExecuteAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    );
}
