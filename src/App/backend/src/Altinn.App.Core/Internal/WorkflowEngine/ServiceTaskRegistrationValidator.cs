using System.Reflection;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Validates service task pipelines, the sealed forwarding implementation of <see cref="IServiceTask"/>, and
/// side-effect pipelines. <see cref="Process.ProcessTaskConfigurationValidationService"/> validates BPMN task
/// configuration.
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
        List<IServiceTask> simpleTasks = Resolve<IServiceTask>(sp);
        List<IPipelineServiceTask> pipelineTasks = Resolve<IPipelineServiceTask>(sp);
        List<ISideEffect> sideEffects = Resolve<ISideEffect>(sp);

        var errors = new List<string>();

        foreach (IPipelineServiceTask task in simpleTasks)
        {
            ValidateSealedDefine(task, errors);
            ValidatePipeline(task, errors);
        }

        foreach (IPipelineServiceTask task in pipelineTasks)
        {
            ValidatePipeline(task, errors);
        }

        ValidateSideEffects(sideEffects, errors);

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                "One or more service task or side-effect pipelines are invalid:"
                    + Environment.NewLine
                    + string.Join(Environment.NewLine, errors)
            );
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static void ValidatePipeline(IPipelineServiceTask task, List<string> errors)
    {
        string taskName = task.GetType().FullName ?? task.GetType().Name;

        try
        {
            // Runs Define — a throwing or null-returning implementation lands here, as do the
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
    /// Every side effect must have a non-blank name and compose its pipeline without throwing. Like service tasks,
    /// a later registration with the same name replaces an earlier one.
    /// </summary>
    private static void ValidateSideEffects(List<ISideEffect> sideEffects, List<string> errors)
    {
        foreach (ISideEffect sideEffect in sideEffects)
        {
            string typeName = sideEffect.GetType().FullName ?? sideEffect.GetType().Name;
            if (string.IsNullOrWhiteSpace(sideEffect.Name))
            {
                errors.Add($"  - {typeName}: a side effect needs a name.");
                continue;
            }

            try
            {
                _ = sideEffect.ResolvePipeline();
            }
            catch (Exception ex)
            {
                errors.Add($"  - {typeName}: defining the pipeline failed: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// An <see cref="IServiceTask"/> must keep the forwarding default of
    /// <see cref="IPipelineServiceTask.Define"/> (<c>Finally(Execute)</c>) — a class providing its
    /// own would silently turn its <c>Execute</c> into dead code. Backstop for the compile-time
    /// analyzer diagnostic.
    /// </summary>
    private static void ValidateSealedDefine(IPipelineServiceTask task, List<string> errors)
    {
        Type taskType = task.GetType();
        InterfaceMapping map = taskType.GetInterfaceMap(typeof(IPipelineServiceTask));
        for (int i = 0; i < map.InterfaceMethods.Length; i++)
        {
            if (map.InterfaceMethods[i].Name != nameof(IPipelineServiceTask.Define))
                continue;

            // The forwarding default lives on the IServiceTask interface; any non-interface
            // target means the class re-implemented Define.
            if (map.TargetMethods[i].DeclaringType is { IsInterface: false })
            {
                errors.Add(
                    $"  - {taskType.FullName}: implements {nameof(IServiceTask)} but replaces "
                        + $"{nameof(IPipelineServiceTask)}.{nameof(IPipelineServiceTask.Define)}, whose forwarding "
                        + $"default is the contract — its {nameof(IServiceTask.Execute)} would never run. Implement "
                        + $"{nameof(IPipelineServiceTask)} directly instead."
                );
            }
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
