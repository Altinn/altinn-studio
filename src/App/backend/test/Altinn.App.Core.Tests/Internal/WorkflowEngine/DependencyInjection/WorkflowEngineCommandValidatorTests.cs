using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.DependencyInjection;

public class WorkflowEngineCommandValidatorTests
{
    [Fact]
    public void Validate_AllCommandsRegistered_DoesNotThrow() =>
        WorkflowEngineCommandValidator.Validate(ValidCommands());

    [Theory]
    [InlineData("OnTaskStartingHook")]
    [InlineData("MutateProcessState")]
    [InlineData("MintMailbox")]
    public void Validate_MissingCommand_Fails(string missingKey)
    {
        var exception = Assert.Throws<ApplicationConfigException>(() =>
            WorkflowEngineCommandValidator.Validate(
                ValidCommands().Where(command => command.GetKey() != missingKey).ToArray()
            )
        );
        Assert.Contains($"Required workflow command '{missingKey}' is not registered", exception.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("Task/Action")]
    [InlineData("Task%20Action")]
    [InlineData("1Task")]
    [InlineData("ÆTask")]
    public void Validate_InvalidCommandKey_Fails(string key)
    {
        var exception = Assert.Throws<ApplicationConfigException>(() =>
            WorkflowEngineCommandValidator.Validate([.. ValidCommands(), Command(key)])
        );
        Assert.Contains("key", exception.Message);
    }

    [Fact]
    public void Validate_DuplicateKeysAndInvalidDefaultOptions_ReportsBoth()
    {
        var command = new Mock<IWorkflowEngineCommand>();
        command.Setup(c => c.GetKey()).Returns("Custom.Step-1_test");
        command
            .SetupGet(c => c.DefaultStepOptions)
            .Returns(new ProcessStepOptions { MaxExecutionTime = TimeSpan.Zero });
        var exception = Assert.Throws<ApplicationConfigException>(() =>
            WorkflowEngineCommandValidator.Validate([.. ValidCommands(), Command("Custom.Step-1_test"), command.Object])
        );
        Assert.Contains("same key: 'Custom.Step-1_test'", exception.Message);
        Assert.Contains("MaxExecutionTime must be positive", exception.Message);
    }

    private static IWorkflowEngineCommand Command(string key)
    {
        var command = new Mock<IWorkflowEngineCommand>();
        command.Setup(c => c.GetKey()).Returns(key);
        return command.Object;
    }

    private static IWorkflowEngineCommand[] ValidCommands() =>
        [
            Command(UnlockTaskData.Key),
            Command(CleanupGeneratedFromTask.Key),
            Command(OnTaskStartingHook.Key),
            Command(CommonTaskInitialization.Key),
            Command(StartTask.Key),
            Command(MovedToAltinnEvent.Key),
            Command(InstanceCreatedAltinnEvent.Key),
            Command(ExecuteServiceTask.Key),
            Command(NotifyInstanceOwnerOnInstantiation.Key),
            Command(EndTask.Key),
            Command(CommonTaskFinalization.Key),
            Command(OnTaskEndingHook.Key),
            Command(LockTaskData.Key),
            Command(AbandonTask.Key),
            Command(OnTaskAbandonHook.Key),
            Command(OnProcessEndingHook.Key),
            Command(EndProcessLegacyHook.Key),
            Command(CompletedAltinnEvent.Key),
            Command(AcquireProcessingStatus.Key),
            Command(MutateProcessState.Key),
            Command(CommitProcessState.Key),
            Command(EnqueueSideEffectsWorkflow.Key),
            Command(MintMailbox.Key),
        ];
}
