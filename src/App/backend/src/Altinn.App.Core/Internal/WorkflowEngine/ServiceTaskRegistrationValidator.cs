using System.Reflection;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Validates every registered service task's pipeline once at startup. A <c>Define</c> that
/// throws, returns null, or is replaced on an <c>IServiceTask</c> would otherwise surface only
/// when a citizen first advances the affected task; validating at boot turns that into an
/// unmissable startup failure.
/// </summary>
/// <remarks>
/// Mirrors <see cref="WorkflowStepOptionsValidator"/>: handlers whose constructors cannot run at
/// startup are skipped with a warning — only an actual contract violation fails the app. The
/// sealed-<c>Define</c> check is itself a backstop for the compile-time analyzer rule.
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

        foreach (IPipelineServiceTask task in Resolve<IServiceTask>(sp))
        {
            ValidateSealedDefine(task, errors);
            ValidatePipeline(task, errors);
        }

        foreach (IPipelineServiceTask task in Resolve<IPipelineServiceTask>(sp))
        {
            ValidatePipeline(task, errors);
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
