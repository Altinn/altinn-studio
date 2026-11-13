using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Validates that every registered service task composes a pipeline and that no app service task reuses a built-in
/// task type.
/// <see cref="Process.ProcessTaskConfigurationValidationService"/> validates BPMN task configuration.
/// </summary>
internal sealed class ServiceTaskRegistrationValidator : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ServiceTaskRegistrationValidator> _logger;
    private readonly ServiceRegistrations _registrations;

    public ServiceTaskRegistrationValidator(
        IServiceScopeFactory scopeFactory,
        ILogger<ServiceTaskRegistrationValidator> logger,
        ServiceRegistrations registrations
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _registrations = registrations;
    }

    /// <summary>
    /// The app's service registrations, so tasks can be resolved one by one when resolving them all together fails.
    /// </summary>
    internal sealed record ServiceRegistrations(IEnumerable<ServiceDescriptor> Descriptors);

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

        ValidateNoBuiltInTypeReused(tasks, errors);

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                "One or more service task registrations are invalid:"
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

    /// <summary>
    /// Which of two tasks with the same type runs depends on registration order, so an app task may not share a type
    /// with a built-in (a task declared in one of the app libraries that ship service tasks).
    /// </summary>
    private static void ValidateNoBuiltInTypeReused(List<IServiceTask> tasks, List<string> errors)
    {
        IEnumerable<IGrouping<string, Type>> byType = tasks.GroupBy(
            t => t.Type,
            t => t.GetType(),
            StringComparer.Ordinal
        );

        foreach (IGrouping<string, Type> sameType in byType)
        {
            Type? builtIn = sameType.FirstOrDefault(IsBuiltIn);
            if (builtIn is null)
                continue;

            foreach (Type appTask in sameType.Where(t => !IsBuiltIn(t)))
            {
                errors.Add(
                    $"  - {appTask.FullName}: has task type '{sameType.Key}', which belongs to the built-in "
                        + $"{builtIn.Name}. A built-in service task cannot be replaced. Give the task its own type "
                        + "and use that type in process.bpmn."
                );
            }
        }
    }

    // The same libraries BuiltInTaskTypesTests pins the built-in task types to; Core cannot reference Clients.Fiks.
    private static bool IsBuiltIn(Type task) =>
        task.Assembly == typeof(ServiceTaskRegistrationValidator).Assembly
        || task.Assembly.GetName().Name == "Altinn.App.Clients.Fiks";

    /// <summary>
    /// Returns registered <typeparamref name="THandler"/> implementations. If constructing them all together fails,
    /// resolves each registration on its own and returns those that construct, so one failing task does not hide
    /// the others from validation.
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
                "Could not resolve all {HandlerType} implementations to validate service tasks at startup; "
                    + "validating each registration that can be constructed instead.",
                typeof(THandler).Name
            );
        }

        var resolved = new List<THandler>();
        foreach (
            ServiceDescriptor descriptor in _registrations.Descriptors.Where(d =>
                d.ServiceType == typeof(THandler) && !d.IsKeyedService
            )
        )
        {
            try
            {
                object? instance =
                    descriptor.ImplementationInstance
                    ?? descriptor.ImplementationFactory?.Invoke(serviceProvider)
                    ?? (
                        descriptor.ImplementationType is { } type
                            ? ActivatorUtilities.CreateInstance(serviceProvider, type)
                            : null
                    );
                if (instance is THandler handler)
                    resolved.Add(handler);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Could not construct {HandlerType} registration {Implementation} to validate it at startup; "
                        + "it will be validated when first used instead.",
                    typeof(THandler).Name,
                    descriptor.ImplementationType?.FullName ?? "(factory)"
                );
            }
        }
        return resolved;
    }
}
