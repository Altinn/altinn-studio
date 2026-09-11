using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models.Notifications.Future;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;

/// <summary>
/// Validates that all process engine commands referenced in ProcessEventCommands are registered in DI.
/// </summary>
internal static class WorkflowEngineCommandValidator
{
    /// <summary>
    /// Validates that all required commands are registered. Throws if any are missing.
    /// Call this immediately after registering commands in AddProcessServices.
    /// </summary>
    public static void Validate(IServiceCollection services)
    {
        HashSet<string> requiredCommandKeys = GetRequiredCommandKeys();
        HashSet<string> registeredCommandKeys = GetRegisteredCommandKeys(services);

        var missingCommands = requiredCommandKeys.Except(registeredCommandKeys).ToList();

        if (missingCommands.Count > 0)
        {
            string missingCommandsList = string.Join(", ", missingCommands.Select(k => $"'{k}'"));
            throw new InvalidOperationException(
                $"Process Engine configuration error: The following command keys are referenced but not registered: {missingCommandsList}. "
                    + "Ensure all commands are registered in ServiceCollectionExtensions.AddProcessServices()."
            );
        }
    }

    private static HashSet<string> GetRequiredCommandKeys()
    {
        var keys = new HashSet<string>();

        // Collect keys from all event types with all features enabled to cover all possible commands
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    TaskId = "DummyTask",
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
                    TaskId = "DummyTask",
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
                    TaskId = "DummyTask",
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
                    TaskId = "DummyTask",
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
                    TaskId = "DummyTask",
                    ServiceTask = new ResolvedServiceTask("DummyMailboxServiceTask", CreateDummyMailboxPipeline()),
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(WorkflowCommandSet.GetTaskEndSteps("DummyTask"), keys);
        CollectCommandKeys(WorkflowCommandSet.GetTaskAbandonSteps(), keys);
        CollectCommandKeys(
            WorkflowCommandSet.GetProcessEndSteps(new ProcessEndContext { RegisterEvents = true }),
            keys
        );

        // AcquireProcessingStatus, MutateProcessState, CommitProcessState, and EnqueueSideEffectsWorkflow
        // are inserted by ProcessNextRequestFactory rather than declared in WorkflowCommandSet
        keys.Add(AcquireProcessingStatus.Key);
        keys.Add(MutateProcessState.Key);
        keys.Add(CommitProcessState.Key);
        keys.Add(EnqueueSideEffectsWorkflow.Key);

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

    private static HashSet<string> GetRegisteredCommandKeys(IServiceCollection services)
    {
        return services
            .Where(sd => sd.ServiceType == typeof(IWorkflowEngineCommand))
            .Select(sd => sd.ImplementationType)
            .OfType<Type>()
            .Select(implType => GetCommandKeyFromType(implType))
            .ToHashSet();
    }

    private static string GetCommandKeyFromType(Type commandType)
    {
        // Get the static Key property
        var keyProperty = commandType.GetProperty("Key", BindingFlags.Public | BindingFlags.Static);

        if (keyProperty?.PropertyType == typeof(string))
        {
            return (string?)keyProperty.GetValue(null)
                ?? throw new InvalidOperationException(
                    $"Command type {commandType.Name} has a null 'Key' property value"
                );
        }

        throw new InvalidOperationException(
            $"Command type {commandType.Name} does not have a public static 'Key' property"
        );
    }
}
