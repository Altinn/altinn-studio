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
/// Validates BPMN task types and task configuration at startup.
/// </summary>
/// <remarks>
/// Resolve dependencies in a startup scope so app implementations can use scoped services without
/// an HTTP request. Failure to read configuration must not skip validation.
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
        try
        {
            bpmnTasks = services.GetRequiredService<IProcessReader>().GetProcessTasks();
            appMetadata = await services.GetRequiredService<IAppMetadata>().GetApplicationMetadata();
            environment = AltinnEnvironments.GetHostingEnvironment(services.GetRequiredService<IHostEnvironment>());
            var factory = new AppImplementationFactory(services);
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

            // Match dispatch: service tasks take precedence, and the last exact match wins within each set.
            IProcessTask? task = serviceTasks.ResolveByTaskType(taskType) ?? processTasks.ResolveByTaskType(taskType);
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
}
