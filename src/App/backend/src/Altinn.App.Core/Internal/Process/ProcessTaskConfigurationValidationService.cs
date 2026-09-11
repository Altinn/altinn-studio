using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Checks at startup what a process task would otherwise only discover mid-process: that every BPMN task has an
/// implementation for its type, that each implementation accepts the task's configuration
/// (<see cref="IProcessTask.ValidateConfiguration"/>), and that every command a task declares for any phase is
/// registered exactly once. A finding fails startup; a citizen never meets it as a failed transition.
/// </summary>
/// <remarks>
/// Resolved inside <see cref="StartAsync"/> from a fresh scope rather than injected: a hosted service's
/// constructor runs whenever anything merely enumerates hosted services, and taking process services there would
/// make that enumeration require the whole graph to be constructible. Failure to resolve the registrations or
/// read the configuration fails startup; the app must not silently skip its command validation.
/// </remarks>
internal sealed class ProcessTaskConfigurationValidationService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ProcessTaskConfigurationValidationService> _logger;

    public ProcessTaskConfigurationValidationService(
        IServiceScopeFactory scopeFactory,
        ILogger<ProcessTaskConfigurationValidationService> logger
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await using AsyncServiceScope scope = _scopeFactory.CreateAsyncScope();
        IServiceProvider services = scope.ServiceProvider;

        List<ProcessTask> bpmnTasks;
        ApplicationMetadata appMetadata;
        HostingEnvironment environment;
        ProcessTaskResolver resolver;
        IReadOnlyList<IWorkflowEngineCommand> registeredCommands;
        try
        {
            bpmnTasks = services.GetRequiredService<IProcessReader>().GetProcessTasks().ToList();
            appMetadata = await services.GetRequiredService<IAppMetadata>().GetApplicationMetadata();
            environment = AltinnEnvironments.GetHostingEnvironment(services.GetRequiredService<IHostEnvironment>());
            resolver = services.GetRequiredService<ProcessTaskResolver>();
            registeredCommands = new AppImplementationFactory(services).GetAll<IWorkflowEngineCommand>().ToList();
        }
        catch (Exception e) when (e is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(e, "Could not load the process configuration or workflow command registrations.");
            throw new ApplicationConfigException(
                "Could not validate the process configuration or workflow command registrations: " + e.Message,
                e
            );
        }

        IReadOnlySet<string> registeredKeys = WorkflowEngineCommandValidator.Validate(
            registeredCommands,
            cancellationToken
        );
        var findings = new List<string>();

        foreach (ProcessTask bpmnTask in bpmnTasks)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string? taskType = bpmnTask.ExtensionElements?.TaskExtension?.TaskType;

            IProcessTask processTask;
            try
            {
                processTask = resolver.GetProcessTaskInstance(taskType);
            }
            catch (Exception e) when (e is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
            {
                findings.Add($"Task '{bpmnTask.Id}': {e.Message}");
                continue;
            }

            try
            {
                findings.AddRange(
                    processTask.ValidateConfiguration(
                        new ProcessTaskValidationContext
                        {
                            TaskId = bpmnTask.Id,
                            Environment = environment,
                            ApplicationMetadata = appMetadata,
                        }
                    )
                );
            }
            catch (Exception e) when (e is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
            {
                findings.Add($"Task '{bpmnTask.Id}': validating its configuration threw: {e.Message}");
                continue;
            }

            CollectDeclaredKeyFindings(
                bpmnTask.Id,
                "start",
                () => processTask.GetStartCommands(bpmnTask.Id),
                registeredKeys,
                findings,
                cancellationToken
            );
            CollectDeclaredKeyFindings(
                bpmnTask.Id,
                "end",
                () => processTask.GetEndCommands(bpmnTask.Id),
                registeredKeys,
                findings,
                cancellationToken
            );
            CollectDeclaredKeyFindings(
                bpmnTask.Id,
                "abandon",
                () => processTask.GetAbandonCommands(bpmnTask.Id),
                registeredKeys,
                findings,
                cancellationToken
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

    private static void CollectDeclaredKeyFindings(
        string taskId,
        string phase,
        Func<IReadOnlyList<WorkflowCommandRef>> declare,
        IReadOnlySet<string> registeredKeys,
        List<string> findings,
        CancellationToken cancellationToken
    )
    {
        IReadOnlyList<WorkflowCommandRef> commands;
        try
        {
            commands = declare();
        }
        catch (Exception e) when (e is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            findings.Add($"Task '{taskId}': declaring its {phase} commands threw: {e.Message}");
            return;
        }

        if (commands is null)
        {
            findings.Add($"Task '{taskId}' returned null when declaring its {phase} commands.");
            return;
        }

        foreach (WorkflowCommandRef command in commands)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (command is null || string.IsNullOrWhiteSpace(command.Key))
            {
                findings.Add($"Task '{taskId}' declares an empty {phase} command reference.");
                continue;
            }

            if (!WorkflowEngineCommandValidator.IsValidCommandKey(command.Key))
            {
                findings.Add(
                    $"Task '{taskId}' declares the {phase} command with invalid key '{command.Key}'. Keys must "
                        + "start with an ASCII letter and contain only ASCII letters, digits, dots, underscores or hyphens."
                );
                continue;
            }

            if (WorkflowEngineCommandValidator.FrameworkCommandKeys.Contains(command.Key))
            {
                findings.Add(
                    $"Task '{taskId}' declares the {phase} command '{command.Key}', but framework coordination "
                        + "commands cannot be declared by a task. Their position and payload are owned by the workflow planner."
                );
                continue;
            }

            if (!registeredKeys.Contains(command.Key))
            {
                findings.Add(
                    $"Task '{taskId}' declares the {phase} command '{command.Key}', but no "
                        + $"{nameof(IWorkflowEngineCommand)} with that key is registered."
                );
            }
        }
    }
}
