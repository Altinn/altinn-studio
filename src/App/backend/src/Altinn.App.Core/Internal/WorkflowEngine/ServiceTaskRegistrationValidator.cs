using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Validates the app's service-task registrations and every staged task's pipeline shape, once at
/// startup. Anything caught here — a task registered against the root interface, a class
/// implementing two kinds, a pipeline with a mismatched handoff seam — would otherwise surface only
/// when a citizen first advances the affected task, as a failed transition in production. Validating
/// at boot turns that into a fast, unmissable startup failure.
/// </summary>
/// <remarks>
/// Mirrors <see cref="WorkflowStepOptionsValidator"/>: handlers are resolved in a fresh DI scope,
/// and a handler whose constructor cannot run at startup is skipped with a warning rather than
/// failing the app — the executor's own guards remain as the backstop. Only an actual contract
/// violation fails startup.
/// </remarks>
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

        var errors = new List<string>();

        foreach (IServiceTaskBase task in Resolve<IServiceTaskBase>(sp))
        {
            errors.Add(
                $"  - {task.GetType().FullName} is registered against {nameof(IServiceTaskBase)}, which the runtime "
                    + $"never resolves. Register it against the kind it implements: {nameof(IServiceTask)} or "
                    + $"{nameof(IStagedServiceTask)}."
            );
        }

        List<IServiceTask> simpleTasks = Resolve<IServiceTask>(sp);
        List<IStagedServiceTask> stagedTasks = Resolve<IStagedServiceTask>(sp);

        foreach (object task in simpleTasks.Cast<object>().Concat(stagedTasks).Distinct())
        {
            if (task is IServiceTask && task is IStagedServiceTask)
            {
                errors.Add(
                    $"  - {task.GetType().FullName} implements both {nameof(IServiceTask)} and "
                        + $"{nameof(IStagedServiceTask)}. A service task must be exactly one kind."
                );
            }
        }

        foreach (IStagedServiceTask staged in stagedTasks)
        {
            ValidatePipeline(staged, errors);
        }

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                "One or more service tasks are invalid:"
                    + Environment.NewLine
                    + string.Join(Environment.NewLine, errors)
            );
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static void ValidatePipeline(IStagedServiceTask task, List<string> errors)
    {
        string taskName = task.GetType().FullName ?? task.GetType().Name;

        List<IServiceTaskStepBase> steps;
        try
        {
            // Materializes both Steps and FinalStep — a throwing property lands here.
            steps = task.GetPipelineSteps().ToList();
        }
        catch (Exception ex)
        {
            errors.Add($"  - {taskName}: reading the pipeline steps threw: {ex.Message}");
            return;
        }

        // GetPipelineSteps always appends FinalStep, so fewer than two steps means Steps was empty.
        if (steps.Count < 2)
        {
            errors.Add(
                $"  - {taskName}: {nameof(IStagedServiceTask.Steps)} is empty — a pipeline needs at least one work "
                    + $"step besides {nameof(IStagedServiceTask.FinalStep)}. A task that does one thing should "
                    + $"implement {nameof(IServiceTask)} instead."
            );
        }

        var names = new HashSet<string>(StringComparer.Ordinal);
        for (int i = 0; i < steps.Count; i++)
        {
            IServiceTaskStepBase step = steps[i];
            if (step is null)
            {
                errors.Add($"  - {taskName}: pipeline step {i} is null.");
                continue;
            }

            string stepName = step.Name;

            if (string.IsNullOrWhiteSpace(stepName))
            {
                errors.Add($"  - {taskName}: step {i} ({step.GetType().FullName}) has an empty name.");
            }
            else if (!names.Add(stepName))
            {
                errors.Add(
                    $"  - {taskName}: duplicate step name '{stepName}'. Names are the steps' identity and must be "
                        + "unique within the pipeline."
                );
            }

            if (step is IServiceTaskStep && step is IFinalServiceTaskStep)
            {
                errors.Add(
                    $"  - {taskName}: step '{stepName}' ({step.GetType().FullName}) implements both "
                        + $"{nameof(IServiceTaskStep)} and {nameof(IFinalServiceTaskStep)}. A step must be exactly "
                        + "one kind."
                );
            }

            if (step.StepOptions is { } options)
            {
                try
                {
                    options.Validate();
                }
                catch (InvalidOperationException ex)
                {
                    errors.Add($"  - {taskName}: step '{stepName}' declares invalid StepOptions: {ex.Message}");
                }
            }
        }
    }

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
