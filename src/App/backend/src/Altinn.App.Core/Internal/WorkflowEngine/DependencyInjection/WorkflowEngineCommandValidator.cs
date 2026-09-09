using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models.Notifications.Future;

namespace Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;

/// <summary>
/// Validates the app's complete ordinary workflow command registrations after the service provider is built.
/// Factory and scoped registrations are checked in the same way as implementation-type registrations.
/// </summary>
internal static class WorkflowEngineCommandValidator
{
    private static readonly HashSet<string> _frameworkCommandKeys = GetRequiredCommandKeys();

    /// <summary>
    /// Framework coordination commands cannot be placed in a task's lifecycle declarations: the transition
    /// planner owns their position, payload and outcome semantics.
    /// </summary>
    internal static IReadOnlySet<string> FrameworkCommandKeys => _frameworkCommandKeys;

    /// <summary>
    /// Checks every resolved command, including commands that the current process does not declare. Returns
    /// the registered keys for the task-declaration check. Call from an app startup scope, never the root.
    /// </summary>
    internal static IReadOnlySet<string> Validate(
        IReadOnlyList<IWorkflowEngineCommand> commands,
        CancellationToken cancellationToken = default
    )
    {
        var findings = new List<string>();
        var registeredKeys = new HashSet<string>(StringComparer.Ordinal);

        foreach (IWorkflowEngineCommand command in commands)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (command is null)
            {
                findings.Add("A workflow command registration returned null.");
                continue;
            }

            string commandType = command.GetType().FullName ?? command.GetType().Name;
            try
            {
                string key = command.GetKey();
                if (string.IsNullOrWhiteSpace(key))
                {
                    findings.Add($"Workflow command '{commandType}' has an empty key.");
                }
                else if (!IsValidCommandKey(key))
                {
                    findings.Add(
                        $"Workflow command '{commandType}' has an invalid key '{key}'. Keys must start with an "
                            + "ASCII letter and contain only ASCII letters, digits, dots, underscores or hyphens."
                    );
                }
                else if (!registeredKeys.Add(key))
                {
                    findings.Add($"More than one workflow command is registered with the same key: '{key}'.");
                }

                command.DefaultStepOptions?.Validate();
            }
            catch (Exception e) when (e is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
            {
                findings.Add(
                    $"Workflow command '{commandType}' has an invalid key or default step options: {e.Message}"
                );
            }
        }

        IEnumerable<string> requiredKeys = _frameworkCommandKeys;
        if (registeredKeys.Contains(ScheduleSigneeInitialization.Key))
        {
            // The runtime plan expands these keys after ResolveSignees, so they are absent from the
            // static task declarations that startup validation normally walks.
            requiredKeys = requiredKeys.Concat([DelegateSigneeRightsCommand.Key, NotifySigneeCommand.Key]);
        }
        foreach (string missingKey in requiredKeys.Except(registeredKeys).Order(StringComparer.Ordinal))
        {
            findings.Add($"Required workflow command '{missingKey}' is not registered.");
        }

        if (findings.Count > 0)
        {
            throw new ApplicationConfigException(
                "Workflow command configuration is not valid:"
                    + Environment.NewLine
                    + string.Join(Environment.NewLine, findings.Select(finding => "  - " + finding))
            );
        }

        return registeredKeys;
    }

    /// <summary>The command key is one unescaped callback URL segment in the workflow engine.</summary>
    internal static bool IsValidCommandKey(string? key) =>
        !string.IsNullOrEmpty(key)
        && char.IsAsciiLetter(key[0])
        && key.All(character => char.IsAsciiLetterOrDigit(character) || character is '.' or '_' or '-');

    private static HashSet<string> GetRequiredCommandKeys()
    {
        var keys = new HashSet<string>();

        // Collect framework keys with all features enabled. Task-specific commands are validated against
        // the actual BPMN declarations after the app has registered its implementations.
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    ServiceTask = null,
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    ServiceTask = null,
                    IsInitialTaskStart = true,
                    IsInstantiation = true,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    ServiceTask = null,
                    IsInitialTaskStart = true,
                    IsInstantiation = true,
                    Notification = new InstantiationNotification(),
                    RegisterEvents = false,
                }
            ),
            keys
        );
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    ServiceTask = new ResolvedServiceTask("DummyServiceTask", CreateDummyPipeline()),
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        // A mailbox-opening pipeline is the one expansion that emits MintMailbox, so the required-key set has
        // to be collected from one.
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    ServiceTask = new ResolvedServiceTask("DummyMailboxServiceTask", CreateDummyMailboxPipeline()),
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(WorkflowCommandSet.GetTaskEndSteps([]), keys);
        CollectCommandKeys(WorkflowCommandSet.GetTaskAbandonSteps([]), keys);
        CollectCommandKeys(
            WorkflowCommandSet.GetProcessEndSteps(
                new ProcessEndContext
                {
                    RegisterEvents = true,
                    HasAutoDeleteDataTypes = true,
                    AutoDeleteInstanceOnProcessEnd = true,
                }
            ),
            keys
        );

        // MutateProcessState, SaveProcessStateToStorage and EnqueueSideEffectsWorkflow are inserted by
        // ProcessNextRequestFactory rather than declared in WorkflowCommandSet
        keys.Add(MutateProcessState.Key);
        keys.Add(SaveProcessStateToStorage.Key);
        keys.Add(EnqueueSideEffectsWorkflow.Key);
        keys.Add(ScheduleSigneeNotifications.Key);

        return keys;
    }

    /// <summary>
    /// The plainest pipeline there is — the shape every simple service task forwards to. Composed rather than
    /// stubbed so the key collection walks the real expansion.
    /// </summary>
    private static ServiceTaskPipeline CreateDummyPipeline() =>
        new ServiceTaskPipelineBuilder().Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

    /// <summary>
    /// A mailbox-opening pipeline, for the one expansion that emits <see cref="MintMailbox"/>.
    /// </summary>
    private static ServiceTaskPipeline CreateDummyMailboxPipeline() =>
        new ServiceTaskPipelineBuilder()
            .Stage(
                (_, _) => Task.FromResult(ServiceTaskOpeningStageResult.Completed()),
                new MailboxOptions { Timeout = TimeSpan.FromDays(1) },
                out MailboxHandle handle
            )
            .ConcludeOnReplies(
                handle,
                (_, _) => Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success()),
                (_, _) => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
            );

    private static void CollectCommandKeys(WorkflowCommandSet eventCommandSet, HashSet<string> keys)
    {
        foreach (var commandRequest in eventCommandSet.Commands)
        {
            if (TryGetAppCommandKey(commandRequest, out string? commandKey))
            {
                keys.Add(commandKey);
            }
        }

        foreach (var commandRequest in eventCommandSet.CriticalPostCommitCommands)
        {
            if (TryGetAppCommandKey(commandRequest, out string? commandKey))
            {
                keys.Add(commandKey);
            }
        }

        foreach (var commandRequest in eventCommandSet.SideEffectCommands)
        {
            if (TryGetAppCommandKey(commandRequest, out string? commandKey))
            {
                keys.Add(commandKey);
            }
        }
    }

    private static bool TryGetAppCommandKey(StepRequest step, [NotNullWhen(true)] out string? commandKey)
    {
        if (step.Command.Type == "app" && step.Command.Data is { } data)
        {
            var appData = System.Text.Json.JsonSerializer.Deserialize<AppCommandData>(data);
            if (appData is not null)
            {
                commandKey = appData.CommandKey;
                return true;
            }
        }

        commandKey = null;
        return false;
    }
}
