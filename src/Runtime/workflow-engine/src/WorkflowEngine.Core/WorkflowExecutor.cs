using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

internal interface IWorkflowExecutor
{
    Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken);
}

internal class WorkflowExecutor : IWorkflowExecutor
{
    private readonly EngineSettings _engineSettings;
    private readonly ICommandRegistry _registry;
    private readonly ILogger<WorkflowExecutor> _logger;

    public WorkflowExecutor(
        IOptions<EngineSettings> engineSettings,
        ICommandRegistry registry,
        ILogger<WorkflowExecutor> logger
    )
    {
        _engineSettings = engineSettings.Value;
        _registry = registry;
        _logger = logger;
    }

    public async Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        using var activity = Metrics.Source.StartActivity(
            "WorkflowExecutor.Execute",
            parentContext: step.EngineActivity?.Context
        );
        _logger.ExecutingStep(step, workflow);

        using CancellationTokenSource cts = CreateExecutionTokenSource(step, cancellationToken);
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var descriptor = _registry.GetCommand(step.Command.Type);

            // Centralized deserialization — commands receive typed data
            object? typedCommandData = null;
            if (descriptor.CommandDataType is not null)
            {
                if (step.Command.Data is not { } rawData)
                {
                    return ExecutionResult.CriticalError(
                        $"Command '{step.Command.Type}' requires command data of type "
                            + $"{descriptor.CommandDataType.Name}, but none was provided"
                    );
                }
                typedCommandData = rawData.Deserialize(descriptor.CommandDataType, CommandSerializerOptions.Default);
            }

            object? typedWorkflowContext = null;
            if (descriptor.WorkflowContextType is not null)
            {
                if (workflow.Context is not { } rawContext)
                {
                    return ExecutionResult.CriticalError(
                        $"Command '{step.Command.Type}' requires workflow context of type "
                            + $"{descriptor.WorkflowContextType.Name}, but none was provided"
                    );
                }
                typedWorkflowContext = rawContext.Deserialize(
                    descriptor.WorkflowContextType,
                    CommandSerializerOptions.Default
                );
            }

            var stateIn = ResolveStateIn(workflow, step);

            var context = new CommandExecutionContext
            {
                Workflow = workflow,
                Step = step,
                RawCommandData = step.Command.Data,
                TypedCommandData = typedCommandData,
                TypedWorkflowContext = typedWorkflowContext,
                StateIn = stateIn,
                ParentTraceContext = activity?.Context ?? step.EngineActivity?.Context,
            };

            var result = await descriptor.ExecuteAsync(context, cts.Token);

            if (result.IsSuccess())
                _logger.SuccessfulExecution(step, stopwatch.Elapsed);
            else
                _logger.FailedExecution(step, stopwatch.Elapsed, result.Message ?? "no details specified");

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw; // handle this gracefully upstream
        }
        catch (CommandHandlerNotFoundException e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, stopwatch.Elapsed, e.Message, e);
            return ExecutionResult.CriticalError(e.Message, e);
        }
        catch (JsonException e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, stopwatch.Elapsed, e.Message, e);
            return ExecutionResult.CriticalError(
                $"Failed to deserialize command data or workflow context: {e.Message}",
                e
            );
        }
        catch (CommandDataTypeMismatchException e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, stopwatch.Elapsed, e.Message, e);
            return ExecutionResult.CriticalError(e.Message, e);
        }
        catch (Exception e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, stopwatch.Elapsed, e.Message, e);
            return ExecutionResult.RetryableError(e);
        }
        finally
        {
            stopwatch.Stop();
        }
    }

    private static string? ResolveStateIn(Workflow workflow, Step step)
    {
        if (step.ProcessingOrder == 0)
            return workflow.InitialState;

        return workflow
            .Steps.Where(s => s.ProcessingOrder < step.ProcessingOrder)
            .OrderByDescending(s => s.ProcessingOrder)
            .Select(s => s.StateOut)
            .FirstOrDefault(s => s is not null);
    }

    private CancellationTokenSource CreateExecutionTokenSource(Step step, CancellationToken cancellationToken)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var timeout = step.Command.MaxExecutionTime ?? _engineSettings.DefaultStepCommandTimeout;
        cts.CancelAfter(timeout);

        return cts;
    }
}

internal static partial class WorkflowExecutorLogs
{
    [LoggerMessage(LogLevel.Information, "Executing step {Step} for workflow {Workflow}")]
    public static partial void ExecutingStep(this ILogger<WorkflowExecutor> logger, Step step, Workflow workflow);

    [LoggerMessage(LogLevel.Information, "Step {Step} executed with success in {Elapsed}")]
    public static partial void SuccessfulExecution(this ILogger<WorkflowExecutor> logger, Step step, TimeSpan elapsed);

    [LoggerMessage(LogLevel.Error, "Step {Step} executed with error in {Elapsed}: {Message}")]
    public static partial void FailedExecution(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        TimeSpan elapsed,
        string message
    );

    [LoggerMessage(LogLevel.Error, "Execution of step {Step} failed after {Elapsed}: {Message}")]
    public static partial void UnhandledExecutionError(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        TimeSpan elapsed,
        string message,
        Exception ex
    );
}
