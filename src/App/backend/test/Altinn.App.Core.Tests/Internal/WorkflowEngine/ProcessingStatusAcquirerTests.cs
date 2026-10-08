using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ProcessingStatusAcquirerTests
{
    private const int PartyId = 1337;
    private static readonly DateTime _started = new(2026, 7, 20, 11, 0, 0, DateTimeKind.Utc);
    private static readonly DateTimeOffset _executionReferenceTime = new(2026, 7, 21, 9, 30, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(false, null)]
    [InlineData(true, null)]
    [InlineData(true, "reject")]
    public async Task Acquire_ComparesAndSetsTheSnapshotAndContinuesFromStoragesAnswer(bool processNext, string? action)
    {
        var setup = new Setup();
        StorageInstanceMutationRequest? sentMutation = null;
        StorageWritePreconditions? sentPreconditions = null;
        StorageAuthenticationMethod? sentAuthentication = null;
        setup.SetupCommit(
            (mutation, authentication, preconditions) =>
            {
                sentMutation = mutation;
                sentAuthentication = authentication;
                sentPreconditions = preconditions;
                return Task.FromResult(
                    new InstanceMutationWithStorageMetadata(
                        setup.CreateInstance(ProcessStatus.Processing),
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    )
                );
            }
        );
        Guid stepId = Guid.NewGuid();

        ProcessingStatusAcquisition result = await setup.Acquire(
            processNext
                ? CommandPayloadSerializer.Serialize(new AcquireProcessingStatusPayload(action, "Task_2"))
                : null,
            stepId
        );

        Assert.NotNull(sentMutation);
        Assert.Equal(ProcessStatus.Idle, sentMutation.ExpectedProcessStatus);
        ProcessState sentState = Assert.IsType<ProcessState>(sentMutation.ProcessState?.State);
        Assert.Equal(ProcessStatus.Processing, sentState.Status);
        Assert.Equal(_started, sentState.Started);
        Assert.Equal("Task_1", sentState.CurrentTask?.ElementId);
        Assert.Empty(sentMutation.ProcessState!.Events!);
        Assert.Empty(sentMutation.CreateDataElements);
        Assert.Empty(sentMutation.UpdateDataElements);
        Assert.Empty(sentMutation.DeleteDataElements);
        Assert.Equal(
            new StorageWritePreconditions(
                ProcessStateVersion: 8,
                InstanceVersion: 12,
                IdempotencyKey: stepId.ToString()
            ),
            sentPreconditions
        );
        Assert.IsType<AuthenticationMethod.AltinnToken>(sentAuthentication?.Request);

        var acquired = Assert.IsType<ProcessingStatusAcquisition.Acquired>(result);
        Assert.Equal(ProcessStatus.Processing, acquired.Instance.Process?.Status);
        WorkflowCallbackState acquiredState = setup.ReadState(acquired.State);
        Assert.Equal(ProcessStatus.Processing, acquiredState.Instance.Process?.Status);
        Assert.Equal(13, acquiredState.InstanceVersion);
        Assert.Equal(9, acquiredState.ProcessStateVersion);
        Assert.Equal(
            JsonSerializer.Serialize(Setup.SnapshotFormData),
            JsonSerializer.Serialize(acquiredState.FormData)
        );
        if (processNext)
        {
            ProcessStateChange transition = Assert.IsType<ProcessStateChange>(acquired.Transition);
            Assert.Equal("Task_1", transition.OldProcessState?.CurrentTask?.ElementId);
            Assert.Equal("Task_2", transition.NewProcessState?.CurrentTask?.ElementId);
            Assert.Equal(3, transition.NewProcessState?.CurrentTask?.Flow);
            Assert.Equal(
                action is "reject"
                    ? ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString()
                    : ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                transition.NewProcessState?.CurrentTask?.FlowType
            );
            Assert.All(
                transition.Events!,
                instanceEvent =>
                {
                    Assert.Equal(PartyId, instanceEvent.User.UserId);
                    Assert.Equal(_executionReferenceTime.UtcDateTime, instanceEvent.Created);
                }
            );
        }
        else
        {
            Assert.Null(acquired.Transition);
        }
    }

    [Fact]
    public async Task Acquire_WhenTheProcessDefinitionLacksTheDecidedElement_ThrowsBeforeClaiming()
    {
        // Request and callback can reach different app versions during deployment.
        var setup = new Setup();

        await Assert.ThrowsAsync<ProcessException>(() =>
            setup.Acquire(
                CommandPayloadSerializer.Serialize(new AcquireProcessingStatusPayload(null, "Task_Removed")),
                Guid.NewGuid()
            )
        );

        setup.MutationClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(HttpStatusCode.PreconditionFailed, true)]
    [InlineData(HttpStatusCode.PreconditionFailed, false)]
    [InlineData(HttpStatusCode.Conflict, true)]
    [InlineData(HttpStatusCode.Conflict, false)]
    public async Task Acquire_WhenStorageRefusesTheSnapshot_ProcessNextIsSupersededAndInitialProcessIsRejected(
        HttpStatusCode refusal,
        bool processNext
    )
    {
        var setup = new Setup();
        PlatformHttpException exception =
            refusal == HttpStatusCode.Conflict
                ? await CreateProcessStatusConflict()
                : await PlatformHttpException.Create(new HttpResponseMessage(refusal));
        setup.SetupCommit((_, _, _) => Task.FromException<InstanceMutationWithStorageMetadata>(exception));

        ProcessingStatusAcquisition result = await setup.Acquire(
            processNext ? CommandPayloadSerializer.Serialize(new AcquireProcessingStatusPayload(null, "Task_2")) : null,
            Guid.NewGuid()
        );

        if (processNext)
        {
            Assert.Same(exception, Assert.IsType<ProcessingStatusAcquisition.Superseded>(result).Exception);
        }
        else
        {
            var rejected = Assert.IsType<ProcessingStatusAcquisition.Rejected>(result);
            Assert.Equal(exception.GetType().Name, rejected.ExceptionType);
        }
        setup.InstanceClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(HttpStatusCode.Conflict)]
    [InlineData(HttpStatusCode.InternalServerError)]
    public async Task Acquire_WhenStorageFailsForAnyOtherReason_PropagatesSoTheEngineRetries(HttpStatusCode status)
    {
        var setup = new Setup();
        PlatformHttpException exception = await PlatformHttpException.Create(
            new HttpResponseMessage(status) { Content = new StringContent("\"unrelated\"") }
        );
        setup.SetupCommit((_, _, _) => Task.FromException<InstanceMutationWithStorageMetadata>(exception));

        PlatformHttpException thrown = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            setup.Acquire(
                CommandPayloadSerializer.Serialize(new AcquireProcessingStatusPayload(null, "Task_2")),
                Guid.NewGuid()
            )
        );

        Assert.Same(exception, thrown);
    }

    [Fact]
    public async Task Acquire_WhenStorageReplaysAnEarlierAttempt_ContinuesFromStoragesCurrentState()
    {
        var setup = new Setup();
        setup.SetupCommit(
            (_, _, _) =>
                Task.FromResult(
                    new InstanceMutationWithStorageMetadata(
                        setup.CreateInstance(ProcessStatus.Processing),
                        StorageVersionMetadata.Empty,
                        replayed: true
                    )
                )
        );
        setup
            .InstanceClient.Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    It.Is<Instance>(instance => instance.Id == setup.InstanceId),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new InstanceWithStorageMetadata(
                    setup.CreateInstance(ProcessStatus.Processing),
                    new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                )
            );

        ProcessingStatusAcquisition result = await setup.Acquire(
            CommandPayloadSerializer.Serialize(new AcquireProcessingStatusPayload("confirm", "Task_2")),
            Guid.NewGuid()
        );

        var acquired = Assert.IsType<ProcessingStatusAcquisition.Acquired>(result);
        Assert.Equal(ProcessStatus.Processing, acquired.Instance.Process?.Status);
        WorkflowCallbackState acquiredState = setup.ReadState(acquired.State);
        Assert.Equal(13, acquiredState.InstanceVersion);
        Assert.Equal(9, acquiredState.ProcessStateVersion);
        Assert.Equal("Task_2", acquired.Transition?.NewProcessState?.CurrentTask?.ElementId);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{"$type":"taskDataLock","taskId":"Task_1"}""")]
    [InlineData("""{"$type":"acquireProcessingStatus","action":"confirm"}""")]
    public async Task Acquire_WithAnInvalidPayload_RejectsWithoutCallingStorage(string payload)
    {
        var setup = new Setup();

        ProcessingStatusAcquisition result = await setup.Acquire(payload, Guid.NewGuid());

        Assert.IsType<ProcessingStatusAcquisition.Rejected>(result);
        setup.MutationClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Acquire_WithoutAProcessState_RejectsWithoutCallingStorage()
    {
        var setup = new Setup();

        ProcessingStatusAcquisition result = await setup.Acquire(
            CommandPayloadSerializer.Serialize(new AcquireProcessingStatusPayload(null, "Task_2")),
            Guid.NewGuid(),
            instance => instance.Process = null
        );

        Assert.IsType<ProcessingStatusAcquisition.Rejected>(result);
        setup.MutationClient.VerifyNoOtherCalls();
    }

    private static async Task<PlatformHttpException> CreateProcessStatusConflict() =>
        await StorageProcessStatusConflictException.TryCreate(
            new HttpResponseMessage(HttpStatusCode.Conflict)
            {
                Content = new StringContent(
                    $$"""{"type":"{{StorageProcessStatusConflictException.ErrorCode}}","status":409}""",
                    Encoding.UTF8,
                    "application/problem+json"
                ),
            },
            CancellationToken.None
        ) ?? throw new InvalidOperationException("Expected a process status conflict.");

    private sealed class Setup
    {
        private readonly WorkflowStateSigner _signer = CreateStateSigner();
        private readonly ProcessingStatusAcquirer _acquirer;

        public Setup()
        {
            var appMetadata = new Mock<IAppMetadata>();
            appMetadata
                .Setup(x => x.ApplicationMetadata)
                .Returns(new ApplicationMetadata("ttd/test-app") { DataTypes = [] });
            var dataClient = new Mock<IDataClient>();
            var unitOfWorkInitializer = new InstanceDataUnitOfWorkInitializer(
                dataClient.As<IDataClientWithStorageMetadata>().Object,
                MutationClient.Object,
                InstanceClient.Object,
                appMetadata.Object,
                Mock.Of<ITranslationService>(),
                new ModelSerializationService(null!),
                Mock.Of<IAppResources>(),
                Options.Create(new FrontEndSettings())
            );
            var stateService = new WorkflowCallbackStateService(
                unitOfWorkInitializer,
                new ModelSerializationService(null!),
                appMetadata.Object,
                Mock.Of<IAppModel>(),
                _signer
            );
            var processReader = new Mock<IProcessReader>();
            processReader.Setup(r => r.GetFlowElement("Task_2")).Returns(new ProcessTask { Id = "Task_2" });
            processReader.Setup(r => r.IsProcessTask("Task_1")).Returns(true);
            processReader.Setup(r => r.IsProcessTask("Task_2")).Returns(true);
            _acquirer = new ProcessingStatusAcquirer(
                stateService,
                MutationClient.Object,
                InstanceClient.Object,
                new ProcessTransitionBuilder(processReader.Object)
            );
        }

        public static readonly List<FormDataEntry> SnapshotFormData =
        [
            new FormDataEntry
            {
                Id = Guid.Empty.ToString(),
                DataType = "model",
                Data = JsonSerializer.SerializeToElement(new { name = "Ola" }),
            },
        ];

        public Guid InstanceGuid { get; } = Guid.NewGuid();

        public string InstanceId => $"{PartyId}/{InstanceGuid}";

        public Mock<IInstanceMutationClient> MutationClient { get; } = new(MockBehavior.Strict);

        public Mock<IInstanceClientWithStorageMetadata> InstanceClient { get; } = new(MockBehavior.Strict);

        public Instance CreateInstance(ProcessStatus status) =>
            new()
            {
                Id = InstanceId,
                AppId = "ttd/test-app",
                Org = "ttd",
                InstanceOwner = new InstanceOwner { PartyId = PartyId.ToString() },
                Process = new ProcessState
                {
                    Status = status,
                    Started = _started,
                    CurrentTask = new ProcessElementInfo { ElementId = "Task_1", Flow = 2 },
                },
                Data = [],
            };

        public void SetupCommit(
            Func<
                StorageInstanceMutationRequest,
                StorageAuthenticationMethod?,
                StorageWritePreconditions?,
                Task<InstanceMutationWithStorageMetadata>
            > respond
        ) =>
            MutationClient
                .Setup(c =>
                    c.CommitInstanceMutationWithStorageMetadata(
                        PartyId,
                        InstanceGuid,
                        It.IsAny<StorageInstanceMutationRequest>(),
                        It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<StorageWritePreconditions?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(
                    (
                        int _,
                        Guid _,
                        StorageInstanceMutationRequest mutation,
                        IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                        StorageAuthenticationMethod? authentication,
                        StorageWritePreconditions? preconditions,
                        CancellationToken _
                    ) => respond(mutation, authentication, preconditions)
                );

        public Task<ProcessingStatusAcquisition> Acquire(
            string? payload,
            Guid stepId,
            Action<Instance>? configureSnapshot = null
        )
        {
            Instance snapshot = CreateInstance(ProcessStatus.Idle);
            configureSnapshot?.Invoke(snapshot);
            string state = _signer.Sign(
                JsonSerializer.Serialize(
                    new WorkflowCallbackState
                    {
                        Instance = snapshot,
                        InstanceVersion = 12,
                        ProcessStateVersion = 8,
                        FormData = SnapshotFormData,
                    }
                ),
                SigningDomain.CallbackState
            );

            return _acquirer.Acquire(
                new InstanceIdentifier(PartyId, InstanceGuid),
                new AppCallbackPayload
                {
                    CommandKey = ProcessingStatusAcquirer.Key,
                    Payload = payload,
                    Actor = new Actor { UserId = PartyId, Language = "nb" },
                    WorkflowId = Guid.NewGuid(),
                    StepId = stepId,
                    ExecutionReferenceTime = _executionReferenceTime,
                    State = state,
                },
                state,
                CancellationToken.None
            );
        }

        public WorkflowCallbackState ReadState(string state) =>
            JsonSerializer.Deserialize<WorkflowCallbackState>(_signer.Verify(state, SigningDomain.CallbackState))!;

        private static WorkflowStateSigner CreateStateSigner()
        {
            var code = new AppCode
            {
                Id = "test-secret",
                Code = "test-secret-code-long-enough-for-hmac",
                IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(186),
            };
            var secretProvider = new Mock<IWorkflowCallbackSecretProvider>();
            secretProvider.Setup(x => x.GetSigningSecret()).Returns(code);
            secretProvider.Setup(x => x.GetValidationSecrets()).Returns([code]);
            return new WorkflowStateSigner(secretProvider.Object);
        }
    }
}
