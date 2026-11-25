using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Validates that every registered service task and action pipeline task composes a pipeline.
/// <see cref="Process.ProcessTaskConfigurationValidationService"/> validates BPMN task configuration.
/// </summary>
internal sealed class ServiceTaskRegistrationValidator : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ServiceTaskRegistrationValidator> _logger;

    public ServiceTaskRegistrationValidator(
        IServiceScopeFactory scopeFactory,
        ILogger<ServiceTaskRegistrationValidator> logger
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        IServiceProvider sp = scope.ServiceProvider;

        // Resolve tasks in this scope so they can use scoped dependencies.
        List<IServiceTask> tasks = Resolve<IServiceTask>(sp);

        var errors = new List<string>();

        foreach (IServiceTask task in tasks)
        {
            ValidatePipeline(task, errors);
        }

        foreach (IActionPipelineTask task in Resolve<IProcessTask>(sp).OfType<IActionPipelineTask>())
        {
            ValidateActionPipeline(task, errors);
        }

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                "One or more service task pipelines are invalid:"
                    + Environment.NewLine
                    + string.Join(Environment.NewLine, errors)
            );
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static void ValidatePipeline(IServiceTask task, List<string> errors)
    {
        string taskName = task.GetType().FullName ?? task.GetType().Name;

        try
        {
            // Runs DefineExecute — a throwing or null-returning implementation lands here, as do the
            // builder's own eager rejections (invalid options, a foreign or duplicate-answered
            // mailbox handle, a mailbox left unanswered when a terminal ends the composition).
            _ = task.ResolvePipeline();
        }
        catch (Exception ex)
        {
            errors.Add($"  - {taskName}: defining the pipeline failed: {ex.Message}");
        }
    }

    private static void ValidateActionPipeline(IActionPipelineTask task, List<string> errors)
    {
        string taskName = task.GetType().FullName ?? task.GetType().Name;

        // process/next keeps the way back from the task, so reject cannot start the pipeline.
        if (string.IsNullOrWhiteSpace(task.StartAction) || task.StartAction == "reject")
        {
            errors.Add($"  - {taskName}: the action pipeline cannot be started by the action '{task.StartAction}'.");
        }

        ServiceTaskPipeline pipeline;
        try
        {
            pipeline = task.ResolveActionPipeline();
        }
        catch (Exception ex)
        {
            errors.Add($"  - {taskName}: defining the action pipeline failed: {ex.Message}");
            return;
        }

        if (pipeline.Items.OfType<ReplySegment>().Any())
        {
            errors.Add(
                $"  - {taskName}: an action pipeline cannot answer messages with HandleReplies. The conclusion that "
                    + "follows it would move the process as the caller that started the pipeline, not as the sender "
                    + "of the message that led to it. Answer with ConcludeOnReplies instead."
            );
        }
    }

    /// <summary>
    /// Returns registered <typeparamref name="THandler"/> implementations, or an empty list if construction fails.
    /// </summary>
    private List<THandler> Resolve<THandler>(IServiceProvider serviceProvider)
        where THandler : class
    {
        try
        {
            return serviceProvider.GetServices<THandler>().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Could not resolve {HandlerType} implementations to validate service tasks at startup; "
                    + "they will be validated when first used instead.",
                typeof(THandler).Name
            );
            return [];
        }
    }
}
