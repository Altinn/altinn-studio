using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
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
/// make that enumeration require the whole graph to be constructible. A check that cannot read what it needs
/// stands down with a warning rather than taking the app with it; only a real finding fails boot.
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
        await using AsyncServiceScope scope = _scopeFactory.CreateAsyncScope();
        IServiceProvider services = scope.ServiceProvider;

        List<ProcessTask> bpmnTasks;
        ApplicationMetadata appMetadata;
        HostingEnvironment environment;
        ProcessTaskResolver resolver;
        IReadOnlyList<IProcessTaskCommand> registeredCommands;
        try
        {
            bpmnTasks = services.GetRequiredService<IProcessReader>().GetProcessTasks().ToList();
            appMetadata = await services.GetRequiredService<IAppMetadata>().GetApplicationMetadata();
            environment = AltinnEnvironments.GetHostingEnvironment(services.GetRequiredService<IHostEnvironment>());
            resolver = services.GetRequiredService<ProcessTaskResolver>();
            registeredCommands = new AppImplementationFactory(services).GetAll<IProcessTaskCommand>().ToList();
        }
        catch (Exception e)
        {
            _logger.LogWarning(
                e,
                "Could not read the process definition, application metadata or process task registrations; "
                    + "skipping process task configuration validation."
            );
            return;
        }

        var findings = new List<string>();

        List<string> duplicateKeys = registeredCommands
            .GroupBy(command => command.Key, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => $"'{group.Key}' ({string.Join(", ", group.Select(c => c.GetType().FullName))})")
            .ToList();
        if (duplicateKeys.Count > 0)
        {
            findings.Add(
                "More than one process task command is registered with the same key: "
                    + string.Join("; ", duplicateKeys)
                    + ". Keys must be unique among the app's task commands."
            );
        }

        HashSet<string> registeredKeys = registeredCommands
            .Select(command => command.Key)
            .ToHashSet(StringComparer.Ordinal);

        foreach (ProcessTask bpmnTask in bpmnTasks)
        {
            string? taskType = bpmnTask.ExtensionElements?.TaskExtension?.TaskType;

            IProcessTask processTask;
            try
            {
                processTask = resolver.GetProcessTaskInstance(taskType);
            }
            catch (Exception e)
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
            catch (Exception e)
            {
                findings.Add($"Task '{bpmnTask.Id}': validating its configuration threw: {e.Message}");
                continue;
            }

            CollectDeclaredKeyFindings(
                bpmnTask.Id,
                "start",
                () => processTask.GetStartCommands(bpmnTask.Id),
                registeredKeys,
                findings
            );
            CollectDeclaredKeyFindings(
                bpmnTask.Id,
                "end",
                () => processTask.GetEndCommands(bpmnTask.Id),
                registeredKeys,
                findings
            );
            CollectDeclaredKeyFindings(
                bpmnTask.Id,
                "abandon",
                () => processTask.GetAbandonCommands(bpmnTask.Id),
                registeredKeys,
                findings
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
        Func<IReadOnlyList<ProcessTaskCommandRef>> declare,
        HashSet<string> registeredKeys,
        List<string> findings
    )
    {
        IReadOnlyList<ProcessTaskCommandRef> commands;
        try
        {
            commands = declare();
        }
        catch (Exception e)
        {
            findings.Add($"Task '{taskId}': declaring its {phase} commands threw: {e.Message}");
            return;
        }

        foreach (ProcessTaskCommandRef command in commands)
        {
            if (!registeredKeys.Contains(command.Key))
            {
                findings.Add(
                    $"Task '{taskId}' declares the {phase} command '{command.Key}', but no "
                        + $"{nameof(IProcessTaskCommand)} with that key is registered."
                );
            }
        }
    }
}
