using System.Reflection;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Validates BPMN task types, the BPMN element each task uses, task configuration, and that at most one process
/// hook of each kind runs for each task, at startup.
/// </summary>
/// <remarks>
/// Creates a dependency injection scope so task implementations can use scoped services.
/// Stops startup if configuration cannot be read. A hook that cannot be created at startup is skipped with a
/// warning, and the hook step checks for duplicates when it runs.
/// </remarks>
internal sealed class ProcessTaskConfigurationValidationService(
    IServiceScopeFactory scopeFactory,
    ILogger<ProcessTaskConfigurationValidationService> logger
) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
        IServiceProvider services = scope.ServiceProvider;

        List<ProcessTask> bpmnTasks;
        List<IProcessTask> processTasks;
        List<IPipelineServiceTask> serviceTasks;
        ApplicationMetadata appMetadata;
        HostingEnvironment environment;
        var factory = new AppImplementationFactory(services);
        try
        {
            bpmnTasks = services.GetRequiredService<IProcessReader>().GetProcessTasks();
            appMetadata = services.GetRequiredService<IAppMetadata>().ApplicationMetadata;
            environment = AltinnEnvironments.GetHostingEnvironment(services.GetRequiredService<IHostEnvironment>());
            serviceTasks = factory.GetServiceTasks().ToList();
            processTasks = factory.GetAll<IProcessTask>().ToList();
        }
        catch (Exception e) when (e is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            logger.LogError(e, "Could not load the process configuration or task registrations.");
            throw new ApplicationConfigException("Could not validate the process configuration: " + e.Message, e);
        }

        var findings = new List<string>();
        bool listRegisteredTypes = false;

        foreach (ProcessTask bpmnTask in bpmnTasks)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string? taskType = bpmnTask.ExtensionElements?.TaskExtension?.TaskType;
            if (string.IsNullOrWhiteSpace(taskType))
            {
                listRegisteredTypes = true;
                findings.Add(
                    $"Task '{bpmnTask.Id}' has no task type: its <altinn:taskType> is missing or blank. "
                        + "Set it to a built-in task type or to the Type of a registered "
                        + $"{nameof(IProcessTask)}, {nameof(IServiceTask)} or {nameof(IPipelineServiceTask)} implementation."
                );
                continue;
            }

            // Use the same lookup rules as task execution: prefer service tasks, then use the last exact
            // type match.
            IPipelineServiceTask? serviceTask = serviceTasks.ResolveByTaskType(taskType);
            IProcessTask? task = serviceTask ?? processTasks.ResolveByTaskType(taskType);
            if (task is null)
            {
                listRegisteredTypes = true;
                findings.Add(
                    $"Task '{bpmnTask.Id}' declares <altinn:taskType>{taskType}</altinn:taskType>, "
                        + (
                            taskType == AltinnTaskTypes.FiksArkiv
                                ? "a built-in task type this app has not enabled. Call services.AddFiksArkiv() "
                                    + "when configuring services, or correct the task type."
                                : "which no registered implementation answers to. Register one "
                                    + $"(services.AddTransient<{nameof(IServiceTask)}, MyTask>()) or correct the task type."
                        )
                );
                continue;
            }

            // The frontend chooses how to show a task from its element, so the element must match the type.
            // The task's own configuration is still validated, so one run reports every problem.
            bool isServiceTaskElement = bpmnTask is ServiceTask;
            if (serviceTask is not null && !isServiceTaskElement)
            {
                findings.Add(ElementMismatch(bpmnTask.Id, taskType, "a service task", "bpmn:task", "bpmn:serviceTask"));
            }
            else if (serviceTask is null && isServiceTaskElement)
            {
                findings.Add(
                    ElementMismatch(bpmnTask.Id, taskType, "not a service task", "bpmn:serviceTask", "bpmn:task")
                );
            }

            try
            {
                findings.AddRange(
                    task.ValidateConfiguration(
                            new ProcessTaskValidationContext
                            {
                                TaskId = bpmnTask.Id,
                                Environment = environment,
                                ApplicationMetadata = appMetadata,
                            }
                        )
                        .Select(finding => $"Task '{bpmnTask.Id}': {finding}")
                );
            }
            catch (Exception e) when (e is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
            {
                findings.Add($"Task '{bpmnTask.Id}': validating its configuration failed: {e.Message}");
            }
        }

        List<IOnTaskStartingHandler> taskStartingHooks = ResolveHooks<IOnTaskStartingHandler>(factory);
        List<IOnTaskEndingHandler> taskEndingHooks = ResolveHooks<IOnTaskEndingHandler>(factory);
        List<IOnTaskAbandonHandler> taskAbandonHooks = ResolveHooks<IOnTaskAbandonHandler>(factory);
        List<IOnProcessEndedHandler> processEndedHooks = ResolveHooks<IOnProcessEndedHandler>(factory);

        foreach (ProcessTask bpmnTask in bpmnTasks)
        {
            AddMultipleTaskHooksFinding(findings, bpmnTask.Id, taskStartingHooks, h => h.ShouldRunForTask(bpmnTask.Id));
            AddMultipleTaskHooksFinding(findings, bpmnTask.Id, taskEndingHooks, h => h.ShouldRunForTask(bpmnTask.Id));
            AddMultipleTaskHooksFinding(findings, bpmnTask.Id, taskAbandonHooks, h => h.ShouldRunForTask(bpmnTask.Id));
        }

        if (processEndedHooks.Count > 1)
        {
            findings.Add(
                $"{processEndedHooks.Count} {nameof(IOnProcessEndedHandler)} implementations are registered "
                    + $"({ImplementationNames(processEndedHooks)}). Register only one."
            );
        }

        WarnAboutUnreferencedServiceTasks(bpmnTasks, serviceTasks);

        if (listRegisteredTypes)
        {
            string[] types = processTasks
                .Concat(serviceTasks)
                .Select(task => $"'{task.Type}'")
                .Distinct(StringComparer.Ordinal)
                .Order(StringComparer.Ordinal)
                .ToArray();
            findings.Add(
                types.Length == 0
                    ? "No task type implementations are registered at all."
                    : $"Registered task types: {string.Join(", ", types)}. A task type is matched exactly, including case."
            );
        }

        if (findings.Count > 0)
        {
            throw new ApplicationConfigException(
                "Process task configuration is not valid:"
                    + Environment.NewLine
                    + string.Join(Environment.NewLine, findings.Select(finding => "  - " + finding))
            );
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    /// <summary>
    /// Returns the registered <typeparamref name="THook"/> implementations, or none if they cannot be created at
    /// startup, for example because one needs request state.
    /// </summary>
    private List<THook> ResolveHooks<THook>(AppImplementationFactory factory)
        where THook : class
    {
        try
        {
            return factory.GetAll<THook>().ToList();
        }
        catch (Exception e)
        {
            logger.LogWarning(
                e,
                "Could not create the {HookType} implementations at startup to check that at most one runs for each "
                    + "task. The hook step checks this when it runs.",
                typeof(THook).Name
            );
            return [];
        }
    }

    private static void AddMultipleTaskHooksFinding<THook>(
        List<string> findings,
        string taskId,
        List<THook> hooks,
        Func<THook, bool> runsForTask
    )
        where THook : class
    {
        List<THook> running = hooks.Where(runsForTask).ToList();
        if (running.Count > 1)
        {
            findings.Add(
                $"Task '{taskId}' has {running.Count} {typeof(THook).Name} implementations that run for it "
                    + $"({ImplementationNames(running)}). Only one may run for a task: combine them, or change "
                    + "ShouldRunForTask so that only one returns true."
            );
        }
    }

    private static string ImplementationNames<T>(IEnumerable<T> implementations)
        where T : class =>
        string.Join(", ", implementations.Select(implementation => implementation.GetType().FullName));

    /// <summary>
    /// Warns once per service task type that is registered on purpose but that no BPMN task declares.
    /// </summary>
    /// <remarks>
    /// Altinn.App.Core registers its own service tasks for every app, so an unused one says nothing about the app.
    /// A service task declared in any other assembly was registered by the app or by an opt-in builder call such as
    /// <c>AddFiksArkiv()</c>.
    /// </remarks>
    private void WarnAboutUnreferencedServiceTasks(List<ProcessTask> bpmnTasks, List<IPipelineServiceTask> serviceTasks)
    {
        HashSet<string> declaredTypes = bpmnTasks
            .Select(task => task.ExtensionElements?.TaskExtension?.TaskType)
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);
        Assembly libraryAssembly = typeof(ProcessTaskConfigurationValidationService).Assembly;

        IEnumerable<IPipelineServiceTask> unreferenced = serviceTasks
            .Where(task => task.GetType().Assembly != libraryAssembly && !declaredTypes.Contains(task.Type))
            .GroupBy(task => task.Type, StringComparer.Ordinal)
            // Name the registration the lookup would use: the last one.
            .Select(registrations => registrations.Last());
        foreach (IPipelineServiceTask task in unreferenced)
        {
            logger.LogWarning(
                "Service task type '{TaskType}' is registered ({ServiceTaskImplementation}), but no task in the process definition declares it.",
                task.Type,
                task.GetType().FullName
            );
        }
    }

    private static string ElementMismatch(
        string taskId,
        string taskType,
        string typeKind,
        string actualElement,
        string requiredElement
    ) =>
        $"Task '{taskId}' declares <altinn:taskType>{taskType}</altinn:taskType>, which is {typeKind}, "
        + $"but is a <{actualElement}> element. Change it to a <{requiredElement}> element.";
}
