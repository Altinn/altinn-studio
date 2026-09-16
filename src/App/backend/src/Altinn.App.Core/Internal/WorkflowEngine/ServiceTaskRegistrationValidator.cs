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
/// Validates both halves of one invariant once at startup: that every registered service task composes a
/// usable pipeline, and that every task in the process definition names an implementation this app can
/// actually resolve. Either failure would otherwise surface only when a citizen first advances the
/// affected task; validating at boot turns that into an unmissable startup failure.
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

    /// <summary>
    /// Built-in task types an app enables with a dedicated builder call rather than by writing an
    /// implementation of its own. Telling the developer to register a class the platform already ships
    /// would send them to write the wrong thing, and this is the likeliest way to reach the check at
    /// all: the process is drawn in Studio first and the client wired up afterwards, or never.
    /// </summary>
    private static readonly Dictionary<string, string> _optInBuiltInTaskTypes = new(StringComparer.Ordinal)
    {
        [AltinnTaskTypes.FiksArkiv] = "services.AddFiksArkiv()",
    };

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

        // Resolved once, here, in this validator's own scope. Everything below reads these lists rather
        // than asking AppImplementationFactory again: outside a request the factory falls back to the
        // root provider, where a task whose constructor needs a scoped dependency cannot be built at
        // all — so the check would stand down on a developer machine (where ValidateScopes catches it)
        // and arm in the deployed environments, which is exactly backwards. Reading the lists also
        // spares the process loop from reconstructing every registered task once per BPMN element.
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

        // A set that could not be resolved leaves its half null, and only the checks that need that
        // half stand down.
        List<IPipelineServiceTask>? serviceTasks =
            simpleTasks is null || pipelineTasks is null ? null : [.. simpleTasks, .. pipelineTasks];
        RegisteredTasks? registered =
            serviceTasks is null || processTasks is null ? null : new RegisteredTasks(serviceTasks, processTasks);

        WarnAboutDuplicateServiceTaskTypes(serviceTasks);
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
    /// The other half of the invariant: every task in the process definition must name an
    /// implementation this app resolves.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Two rules, neither of which looks at the BPMN element type — the runtime never does either.
    /// <c>ProcessTaskResolver.GetProcessTaskInstance</c> decides what a task is purely from its
    /// <c>altinn:taskType</c>: a registered service task first, then a registered
    /// <see cref="IProcessTask"/>. A <c>&lt;bpmn:serviceTask&gt;</c> typed <c>data</c> therefore runs
    /// as an ordinary data task today, and the service tasks in this repository's own scenarios are
    /// plain <c>&lt;bpmn:task&gt;</c> elements with a custom type.
    /// </para>
    /// <para>
    /// A blank task type is rejected outright: it passes the guard in <c>ProcessEngine</c> only to
    /// reach <c>ArgumentException.ThrowIfNullOrWhiteSpace</c> inside the authorization client, so the
    /// first advance is an HTTP 500 rather than a verdict anyone can act on. A type that resolves to
    /// nothing is rejected for the matching reason: no <c>ExecuteServiceTask</c> is scheduled, the
    /// transition commits and comes to rest on the task, and the advance that follows throws. An app
    /// that cannot run its own process should not boot.
    /// </para>
    /// </remarks>
    private void ValidateProcessDefinition(
        IServiceProvider serviceProvider,
        RegisteredTasks? registered,
        List<string> errors
    )
    {
        List<ProcessTask> tasks;

        try
        {
            // Only the read is guarded, as in EFormidlingConfigValidationService: a definition this
            // validator cannot open is not a violation, while everything after it is pure inspection
            // of what was read and cannot fail for a reason worth standing down over. A findings loop
            // inside the try would throw away findings already collected — blank task types above all,
            // which need nothing from DI and cannot be false positives.
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

        bool anyUnresolved = false;

        foreach (ProcessTask task in tasks)
        {
            string? taskType = task.ExtensionElements?.TaskExtension?.TaskType;

            if (string.IsNullOrWhiteSpace(taskType))
            {
                errors.Add(
                    $"  - task '{task.Id}' in the process definition has no task type: its "
                        + "<altinn:taskType> is missing or blank. Set it to the Type of a registered "
                        + $"{nameof(IProcessTask)}, {nameof(IServiceTask)} or {nameof(IPipelineServiceTask)} "
                        + "implementation."
                );
                continue;
            }

            // The registered sets are what decide whether a type resolves, so a set that could not be
            // constructed (null, already warned about) stands this half of the check down rather than
            // reporting every task in the process as unregistered. The blank-type half above needs
            // nothing from DI and always runs.
            if (registered is null || registered.Resolves(taskType))
            {
                continue;
            }

            anyUnresolved = true;
            errors.Add(
                $"  - task '{task.Id}' in the process definition declares "
                    + $"<altinn:taskType>{taskType}</altinn:taskType>, "
                    + (
                        _optInBuiltInTaskTypes.TryGetValue(taskType, out string? builderCall)
                            ? $"a built-in task type this app has not enabled. Call {builderCall} when configuring "
                                + "services, or correct the task type."
                            : "which no registered implementation answers to. Register one "
                                + $"(services.AddTransient<{nameof(IServiceTask)}, MyTask>()) or correct the task type."
                    )
            );
        }

        if (anyUnresolved && registered is not null)
        {
            // Once, as a trailing entry rather than repeated on every error: it is the same list each
            // time, and it is what turns "unknown type" into "you typed 'pfd'".
            errors.Add(registered.Describe());
        }
    }

    /// <summary>
    /// The task implementations this validator resolved in its own scope, and the one question the
    /// process definition asks of them. Exists as a pair because either half can answer it — a
    /// registered service task wins, then a registered <see cref="IProcessTask"/> — which is
    /// <c>ProcessTaskResolver.GetProcessTaskInstance</c>'s own rule.
    /// </summary>
    private sealed record RegisteredTasks(
        IReadOnlyList<IPipelineServiceTask> ServiceTasks,
        IReadOnlyList<IProcessTask> ProcessTasks
    )
    {
        public bool Resolves(string altinnTaskType) =>
            ServiceTasks.ResolveByTaskType(altinnTaskType) is not null
            || ProcessTasks.ResolveByTaskType(altinnTaskType) is not null;

        public string Describe()
        {
            List<string> types =
            [
                .. ServiceTasks
                    .Concat<IProcessTask>(ProcessTasks)
                    .Select(task => $"'{task.Type}'")
                    .Distinct(StringComparer.Ordinal)
                    .Order(StringComparer.Ordinal),
            ];

            return types.Count == 0
                ? "  - No task type implementations are registered at all."
                : $"  - Registered task types: {string.Join(", ", types)}. A task type is matched exactly, "
                    + "including case.";
        }
    }

    /// <summary>
    /// Two service tasks answering to one type is not a startup failure — registering after a built-in
    /// to replace it is a legitimate thing to do, and the last registration is what
    /// <c>ProcessTaskResolver</c> dispatches to. It is worth a warning because the other lookup,
    /// <c>ServiceTaskLookupExtensions.FindServiceTask</c>, takes the <em>first</em> match and ignores
    /// case, so the enqueue path and the dispatch path can pick different implementations for one
    /// process task.
    /// </summary>
    private void WarnAboutDuplicateServiceTaskTypes(IReadOnlyList<IPipelineServiceTask>? serviceTasks)
    {
        if (serviceTasks is null)
        {
            return;
        }

        // Grouped ignoring case, because that is the width of the disagreement: 'PDF' and 'pdf' are one
        // task to the enqueue path and two to the dispatch path.
        foreach (
            IGrouping<string, IPipelineServiceTask> group in serviceTasks
                .GroupBy(task => task.Type, StringComparer.OrdinalIgnoreCase)
                .Where(group => group.Count() > 1)
        )
        {
            _logger.LogWarning(
                "Service task type '{ServiceTaskType}' is registered by more than one implementation ({Implementations}). "
                    + "Which one runs depends on the code path, so keep only the one that should.",
                group.Key,
                string.Join(", ", group.Select(task => task.GetType().FullName))
            );
        }
    }

    /// <summary>
    /// The registered implementations of <typeparamref name="THandler"/>, or <c>null</c> when they
    /// could not be constructed — which is a reason to stand a check down, never to fail one.
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
