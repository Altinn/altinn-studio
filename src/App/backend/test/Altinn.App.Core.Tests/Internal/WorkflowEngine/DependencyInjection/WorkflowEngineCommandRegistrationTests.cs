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
            WorkflowStepSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    TaskId = "Task_1",
                    StartPipeline = CreateLifecyclePipeline(),
                    ServiceTask = null,
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(
            WorkflowStepSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    TaskId = "Task_1",
                    StartPipeline = CreateLifecyclePipeline(),
                    ServiceTask = null,
                    IsInitialTaskStart = true,
                    IsInstantiation = true,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(
            WorkflowStepSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    TaskId = "Task_1",
                    StartPipeline = CreateLifecyclePipeline(),
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
            WorkflowStepSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    TaskId = "Task_1",
                    StartPipeline = CreateLifecyclePipeline(),
                    ServiceTask = new ResolvedServiceTask("simple", CreatePipeline()),
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        // Only a mailbox-opening pipeline names MintMailbox.
        CollectCommandKeys(
            WorkflowStepSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    TaskId = "Task_1",
                    StartPipeline = CreateLifecyclePipeline(),
                    ServiceTask = new ResolvedServiceTask("mailbox", CreateMailboxPipeline()),
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(WorkflowStepSet.GetTaskEndSteps("Task_1", CreateLifecyclePipeline()), keys);
        CollectCommandKeys(WorkflowStepSet.GetTaskAbandonSteps(CreateLifecyclePipeline()), keys);
        CollectCommandKeys(WorkflowStepSet.GetProcessEndSteps(new ProcessEndContext { RegisterEvents = true }), keys);

        // ProcessNextRequestFactory adds these around the step sets.
        keys.Add(CommitProcessState.Key);
        keys.Add(ReleaseProcessingStatus.Key);
        keys.Add(EnqueueAuxiliaryWorkflows.Key);

        return keys;
    }

    /// <summary>
    /// A process task lifecycle pipeline. Every stage count plans the same command key, so one stage suffices.
    /// </summary>
    private static ProcessTaskPipeline CreateLifecyclePipeline() =>
        new PipelineBuilder().Stage(_ => Task.FromResult(StageResult.Completed())).Build();

    private static ServiceTaskPipeline CreatePipeline() =>
        new PipelineBuilder().Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

    private static ServiceTaskPipeline CreateMailboxPipeline() =>
        new PipelineBuilder()
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

    private static void CollectCommandKeys(WorkflowStepSet stepSet, HashSet<string> keys)
    {
        IEnumerable<PlannedStep> steps = stepSet
            .LifecycleSteps.Concat(stepSet.PrimaryPostCommitSteps)
            .Concat(stepSet.AuxiliarySteps);
        foreach (PlannedStep step in steps)
        {
            keys.Add(step.CommandKey);
        }
    }

    private static string GetCommandKey(Type commandType)
    {
        PropertyInfo? keyProperty = commandType.GetProperty("Key", BindingFlags.Public | BindingFlags.Static);
        return keyProperty?.GetValue(null) as string
            ?? throw new InvalidOperationException($"{commandType.Name} has no public static string Key.");
    }
}
