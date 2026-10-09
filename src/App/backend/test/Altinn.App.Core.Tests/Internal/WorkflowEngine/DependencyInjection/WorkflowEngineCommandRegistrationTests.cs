using System.Reflection;
using System.Text.Json;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models.Notifications.Future;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.DependencyInjection;

public class WorkflowEngineCommandRegistrationTests
{
    [Fact]
    public void AddWorkflowEngineIntegration_RegistersEveryCommandAPlanCanName()
    {
        var services = new ServiceCollection();
        services.AddWorkflowEngineIntegration();

        HashSet<string> registered = services
            .Where(descriptor => descriptor.ServiceType == typeof(IWorkflowEngineCommand))
            .Select(descriptor => descriptor.ImplementationType)
            .OfType<Type>()
            .Select(GetCommandKey)
            .ToHashSet();

        Assert.Empty(GetCommandKeysPlansCanName().Except(registered));
    }

    /// <summary>
    /// Builds every plan shape with every feature turned on, and collects the command keys they name.
    /// </summary>
    private static HashSet<string> GetCommandKeysPlansCanName()
    {
        var keys = new HashSet<string>();

        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    TaskId = "Task_1",
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
                    TaskId = "Task_1",
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
                    TaskId = "Task_1",
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
                    TaskId = "Task_1",
                    ServiceTask = new ResolvedServiceTask("simple", CreatePipeline()),
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        // Only a mailbox-opening pipeline names MintMailbox.
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    TaskId = "Task_1",
                    ServiceTask = new ResolvedServiceTask("mailbox", CreateMailboxPipeline()),
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(WorkflowCommandSet.GetTaskEndSteps("Task_1"), keys);
        CollectCommandKeys(WorkflowCommandSet.GetTaskAbandonSteps(), keys);
        CollectCommandKeys(
            WorkflowCommandSet.GetProcessEndSteps(
                new ProcessEndContext { RegisterEvents = true, HasProcessEndedHandler = true }
            ),
            keys
        );

        // ProcessNextRequestFactory adds these around the command sets.
        keys.Add(AcquireProcessingStatus.Key);
        keys.Add(MutateProcessState.Key);
        keys.Add(CommitProcessState.Key);
        keys.Add(EnqueueSideEffectsWorkflow.Key);

        return keys;
    }

    private static ServiceTaskPipeline CreatePipeline() =>
        new ServiceTaskPipelineBuilder().Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

    private static ServiceTaskPipeline CreateMailboxPipeline() =>
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

    private static void CollectCommandKeys(WorkflowCommandSet commandSet, HashSet<string> keys)
    {
        IEnumerable<StepRequest> steps = commandSet
            .Commands.Concat(commandSet.CriticalPostCommitCommands)
            .Concat(commandSet.SideEffectCommands);
        foreach (StepRequest step in steps)
        {
            if (step.Command.Type == "app" && step.Command.Data is { } data)
            {
                AppCommandData? appData = JsonSerializer.Deserialize<AppCommandData>(data);
                if (appData is not null)
                {
                    keys.Add(appData.CommandKey);
                }
            }
        }
    }

    private static string GetCommandKey(Type commandType)
    {
        PropertyInfo? keyProperty = commandType.GetProperty("Key", BindingFlags.Public | BindingFlags.Static);
        return keyProperty?.GetValue(null) as string
            ?? throw new InvalidOperationException($"{commandType.Name} has no public static string Key.");
    }
}
