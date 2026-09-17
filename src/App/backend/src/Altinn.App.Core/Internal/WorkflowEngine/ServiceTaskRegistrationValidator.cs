using System.Reflection;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Validates once at startup that every registered service task composes a usable pipeline, and that every
/// task in the process definition names a task type this app resolves. Either failure would otherwise
/// surface only when a citizen first advances the affected task; validating at boot turns that into an
/// unmissable startup failure.
/// </summary>
/// <remarks>
/// Mirrors <see cref="WorkflowStepOptionsValidator"/>: handlers whose constructors cannot run at
/// startup are skipped with a warning — only an actual contract violation fails the app. The
/// sealed-<c>Define</c> check is itself a backstop for the compile-time analyzer rule. The process
/// definition check uses the same matching rule as dispatch (<see cref="ServiceTaskLookupExtensions.ResolveByTaskType{T}"/>:
/// exact match on the task type, ignoring which BPMN element carries it), so it agrees with what will
/// actually run.
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

        // Resolved once, in this validator's own scope, so a task needing a scoped dependency can be built.
        List<IServiceTask>? simpleTasks = Resolve<IServiceTask>(sp);
        List<IPipelineServiceTask>? pipelineTasks = Resolve<IPipelineServiceTask>(sp);
        List<IProcessTask>? processTasks = Resolve<IProcessTask>(sp);

        var errors = new List<string>();

        foreach (IPipelineServiceTask task in simpleTasks ?? [])
        {
            ValidateSealedDefine(task, errors);
            ValidatePipeline(task, errors);
        }

        foreach (IPipelineServiceTask task in pipelineTasks ?? [])
        {
            ValidatePipeline(task, errors);
        }

        // A set that could not be resolved stands down only the checks that need it.
        List<IProcessTask>? registered =
            simpleTasks is null || pipelineTasks is null || processTasks is null
                ? null
                : [.. simpleTasks, .. pipelineTasks, .. processTasks];

        ValidateProcessDefinition(sp, registered, errors);

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                "One or more service tasks or process definition tasks are invalid:"
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

    /// <summary>
    /// Every task in the process definition must carry a non-blank <c>altinn:taskType</c> that resolves to
    /// a registered implementation. A type resolving to nothing would otherwise deploy quietly and strand
    /// the first instance to reach it.
    /// </summary>
    private void ValidateProcessDefinition(
        IServiceProvider serviceProvider,
        List<IProcessTask>? registered,
        List<string> errors
    )
    {
        List<ProcessTask> tasks;

        try
        {
            tasks = serviceProvider.GetRequiredService<IProcessReader>().GetProcessTasks();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Could not read the process definition to validate the tasks it declares; a task type no "
                    + "implementation answers to would surface when the process first reaches it instead."
            );
            return;
        }

        bool listRegistered = false;

        foreach (ProcessTask task in tasks)
        {
            string? taskType = task.ExtensionElements?.TaskExtension?.TaskType;

            if (string.IsNullOrWhiteSpace(taskType))
            {
                listRegistered = true;
                errors.Add(
                    $"  - task '{task.Id}' in the process definition has no task type: its "
                        + "<altinn:taskType> is missing or blank. Set it to a built-in task type or to the Type of "
                        + $"a registered {nameof(IProcessTask)}, {nameof(IServiceTask)} or "
                        + $"{nameof(IPipelineServiceTask)} implementation."
                );
                continue;
            }

            // The blank-type check needs nothing from DI; this one stands down when a set could not be built.
            if (registered is null || registered.ResolveByTaskType(taskType) is not null)
            {
                continue;
            }

            listRegistered = true;
            errors.Add(
                $"  - task '{task.Id}' in the process definition declares "
                    + $"<altinn:taskType>{taskType}</altinn:taskType>, "
                    + (
                        // A built-in the app enables with a builder call rather than by writing an implementation.
                        taskType switch
                        {
                            AltinnTaskTypes.FiksArkiv =>
                                "a built-in task type this app has not enabled. Call services.AddFiksArkiv() "
                                    + "when configuring services, or correct the task type.",
                            _ => "which no registered implementation answers to. Register one "
                                + $"(services.AddTransient<{nameof(IServiceTask)}, MyTask>()) or correct the task type.",
                        }
                    )
            );
        }

        if (listRegistered && registered is not null)
        {
            errors.Add(DescribeRegistered(registered));
        }
    }

    private static string DescribeRegistered(List<IProcessTask> registered)
    {
        List<string> types =
        [
            .. registered
                .Select(task => $"'{task.Type}'")
                .Distinct(StringComparer.Ordinal)
                .Order(StringComparer.Ordinal),
        ];

        return types.Count == 0
            ? "  - No task type implementations are registered at all."
            : $"  - Registered task types: {string.Join(", ", types)}. A task type is matched exactly, "
                + "including case.";
    }

    /// <summary>
    /// The registered implementations of <typeparamref name="THandler"/>, or <c>null</c> when they could
    /// not be constructed.
    /// </summary>
    private List<THandler>? Resolve<THandler>(IServiceProvider serviceProvider)
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
            return null;
        }
    }
}
