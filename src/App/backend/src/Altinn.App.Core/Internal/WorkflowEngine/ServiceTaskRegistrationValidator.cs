using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Validates every registered service task's declared steps, once at startup. Anything caught here
/// — a throwing <c>Steps</c> property, a duplicate or empty step name, invalid per-step options —
/// would otherwise surface only when a citizen first advances the affected task, as a failed
/// transition in production. Validating at boot turns that into a fast, unmissable startup failure.
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

        foreach (IServiceTask task in Resolve<IServiceTask>(sp))
        {
            ValidateSteps(task, errors);
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

    private static void ValidateSteps(IServiceTask task, List<string> errors)
    {
        string taskName = task.GetType().FullName ?? task.GetType().Name;

        List<IServiceTaskStep> steps;
        try
        {
            // Materializes Steps — a throwing property lands here.
            steps = task.GetSteps().ToList();
        }
        catch (Exception ex)
        {
            errors.Add($"  - {taskName}: reading {nameof(IServiceTask.Steps)} threw: {ex.Message}");
            return;
        }

        var names = new HashSet<string>(StringComparer.Ordinal);
        for (int i = 0; i < steps.Count; i++)
        {
            IServiceTaskStep step = steps[i];
            if (step is null)
            {
                errors.Add($"  - {taskName}: step {i} is null.");
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
                        + "unique within the task."
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
