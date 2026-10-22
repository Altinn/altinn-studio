using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed partial class ProcessEngineTest
{
    private static readonly Actor _appActor = new() { OrgId = "org", Language = "en" };

    [Fact]
    public async Task EnqueueNextForApp_StartsTheTransitionAsTheActor_WithoutAPolicyCheckOrUserActionOrWaitingForIt()
    {
        Mock<IUserAction> confirmAction = new(MockBehavior.Strict);
        confirmAction.Setup(a => a.Id).Returns("confirm");
        await using var fixture = Fixture.Create(userActions: [confirmAction.Object]);
        SetupValidationPasses(fixture);
        Instance processing = CreateTask2Instance();
        processing.Process.Status = ProcessStatus.Processing;
        Actor? enqueuedActor = null;
        StorageVersionMetadata? enqueuedVersions = null;
        SetupEnqueueForApp(fixture)
            .Callback<Instance, StorageVersionMetadata, string, ProcessStateChange, Actor, CancellationToken>(
                (_, versions, _, _, actor, _) =>
                {
                    enqueuedActor = actor;
                    enqueuedVersions = versions;
                }
            )
            .ReturnsAsync(Completed(new InstanceWithStorageMetadata(processing, _acquiredVersions)));

        ProcessChangeResult result = await fixture.ProcessEngine.EnqueueNextForApp(
            CreateTask2Instance(),
            _storageVersions,
            "confirm",
            _appActor
        );

        Assert.True(result.Success);
        Assert.Equal("EndEvent_1", result.ProcessStateChange.NewProcessState?.EndEvent);
        Assert.Same(processing, result.MutatedInstance);
        Assert.Same(_appActor, enqueuedActor);
        Assert.Equal(_storageVersions, enqueuedVersions);
        fixture
            .Mock<IProcessEngineAuthorizer>()
            .Verify(
                a => a.AuthorizeProcessNext(It.IsAny<Instance>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        confirmAction.Verify(a => a.HandleAction(It.IsAny<UserActionContext>()), Times.Never);
        fixture
            .Mock<IWorkflowEngineService>()
            .Verify(
                service =>
                    service.EnqueueAndWaitForProcessNext(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        It.IsAny<string>(),
                        It.IsAny<ProcessStateChange>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    [Fact]
    public async Task EnqueueNextForApp_ValidatesInTheActorsLanguage_ReadingDataAsTheServiceOwner()
    {
        await using var fixture = Fixture.Create();
        SetupPaymentDataType(fixture);
        SetupEnqueueForApp(fixture).ReturnsAsync(Completed(CreateEndedInstanceWithVersions()));
        IInstanceDataAccessor? validatedData = null;
        string? validationLanguage = null;
        fixture
            .Mock<IValidationService>()
            .Setup(v =>
                v.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    "Task_2",
                    It.IsAny<List<string>?>(),
                    It.IsAny<bool?>(),
                    It.IsAny<string?>()
                )
            )
            .Callback<IInstanceDataAccessor, string, List<string>?, bool?, string?>(
                (dataAccessor, _, _, _, language) =>
                {
                    validatedData = dataAccessor;
                    validationLanguage = language;
                }
            )
            .ReturnsAsync([]);

        await fixture.ProcessEngine.EnqueueNextForApp(CreateTask2Instance(), _storageVersions, "confirm", _appActor);

        Assert.Equal("en", validationLanguage);
        StorageAuthenticationMethod authentication = Assert.Single(
            Assert.IsAssignableFrom<IInstanceDataAccessor>(validatedData).AuthenticationMethodOverrides.Values
        );
        Assert.Equivalent(StorageAuthenticationMethod.ServiceOwner(), authentication);
    }

    [Fact]
    public async Task EnqueueNextForApp_IsRefused_WhileATransitionHoldsTheInstance()
    {
        await using var fixture = Fixture.Create();
        Instance instance = CreateTask2Instance();
        instance.Process.Status = ProcessStatus.Processing;

        ProcessChangeResult result = await fixture.ProcessEngine.EnqueueNextForApp(
            instance,
            _storageVersions,
            "confirm",
            _appActor
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessStatus.Processing, result.BlockingProcessStatus);
        VerifyNothingEnqueuedForApp(fixture);
    }

    [Fact]
    public async Task EnqueueNextForApp_ReturnsTheValidationIssues_WithoutEnqueueing()
    {
        await using var fixture = Fixture.Create();
        fixture
            .Mock<IValidationService>()
            .Setup(v =>
                v.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string>(),
                    It.IsAny<List<string>?>(),
                    It.IsAny<bool?>(),
                    It.IsAny<string?>()
                )
            )
            .ReturnsAsync([
                new ValidationIssueWithSource
                {
                    Code = "PaymentNotCompleted",
                    Severity = ValidationIssueSeverity.Error,
                    Description = "The payment has not been completed.",
                    Source = "test",
                },
            ]);

        ProcessChangeResult result = await fixture.ProcessEngine.EnqueueNextForApp(
            CreateTask2Instance(),
            _storageVersions,
            "confirm",
            _appActor
        );

        Assert.False(result.Success);
        Assert.Equal("PaymentNotCompleted", Assert.Single(result.ValidationIssues ?? []).Code);
        VerifyNothingEnqueuedForApp(fixture);
    }

    [Fact]
    public async Task EnqueueNextForApp_ReportsTheMovedOnInstance_WhenTheTransitionHasAlreadyFinished()
    {
        await using var fixture = Fixture.Create();
        SetupValidationPasses(fixture);
        InstanceWithStorageMetadata ended = CreateEndedInstanceWithVersions();
        SetupEnqueueForApp(fixture).ReturnsAsync(Completed(ended));

        ProcessChangeResult result = await fixture.ProcessEngine.EnqueueNextForApp(
            CreateTask2Instance(),
            _storageVersions,
            "confirm",
            _appActor
        );

        Assert.True(result.Success);
        Assert.Same(ended.Instance, result.MutatedInstance);
        Assert.Equal(ended.Metadata, result.MutatedInstanceVersions);
    }

    [Fact]
    public async Task EnqueueNextForApp_ReportsTheInstanceChanged_WhenTheAcquireLeftItIdleOnTheSameTask()
    {
        await using var fixture = Fixture.Create();
        SetupValidationPasses(fixture);
        // A write after the snapshot superseded the acquire: the instance is idle on the visit the call started from.
        Instance changed = CreateTask2Instance();
        SetupEnqueueForApp(fixture)
            .ReturnsAsync(Completed(new InstanceWithStorageMetadata(changed, _acquiredVersions)));

        ProcessChangeResult result = await fixture.ProcessEngine.EnqueueNextForApp(
            CreateTask2Instance(),
            _storageVersions,
            "confirm",
            _appActor
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessNextState.InstanceChanged, result.ProcessNextState);
        Assert.Same(changed, result.MutatedInstance);
        Assert.Equal(_acquiredVersions, result.MutatedInstanceVersions);
    }

    [Theory]
    [InlineData(WorkflowFailureKind.Timeout)]
    [InlineData(WorkflowFailureKind.StepFailed)]
    public async Task EnqueueNextForApp_ReportsTheWorkflowFailure_WhenTheAcquireDidNotComplete(WorkflowFailureKind kind)
    {
        await using var fixture = Fixture.Create();
        SetupValidationPasses(fixture);
        var failure = new WorkflowFailure { Kind = kind, WorkflowId = Guid.NewGuid() };
        SetupEnqueueForApp(fixture).ReturnsAsync(new AcquireWorkflowResult.NotCompleted(failure));

        ProcessChangeResult result = await fixture.ProcessEngine.EnqueueNextForApp(
            CreateTask2Instance(),
            _storageVersions,
            "confirm",
            _appActor
        );

        // Not a superseded acquire, which a caller would start over: the instance is idle on the same task either way.
        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Internal, result.ErrorType);
        Assert.Same(failure, result.WorkflowFailure);
        Assert.Null(result.ProcessNextState);
    }

    private static readonly StorageVersionMetadata _acquiredVersions = new(InstanceVersion: 2, ProcessStateVersion: 1);

    private static InstanceWithStorageMetadata CreateEndedInstanceWithVersions() =>
        new(CreateEndedInstance(), new StorageVersionMetadata(InstanceVersion: 4, ProcessStateVersion: 3));

    private static AcquireWorkflowResult Completed(InstanceWithStorageMetadata instance) =>
        new AcquireWorkflowResult.Completed(instance);

    private static Moq.Language.Flow.ISetup<IWorkflowEngineService, Task<AcquireWorkflowResult>> SetupEnqueueForApp(
        Fixture fixture
    ) =>
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service =>
                service.EnqueueAndWaitForAcquire(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<Actor>(),
                    It.IsAny<CancellationToken>()
                )
            );

    private static void SetupValidationPasses(Fixture fixture) =>
        fixture
            .Mock<IValidationService>()
            .Setup(v =>
                v.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string>(),
                    It.IsAny<List<string>?>(),
                    It.IsAny<bool?>(),
                    It.IsAny<string?>()
                )
            )
            .ReturnsAsync([]);

    private static void VerifyNothingEnqueuedForApp(Fixture fixture) =>
        fixture
            .Mock<IWorkflowEngineService>()
            .Verify(
                service =>
                    service.EnqueueAndWaitForAcquire(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        It.IsAny<string>(),
                        It.IsAny<ProcessStateChange>(),
                        It.IsAny<Actor>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
}
