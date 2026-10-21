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
    [InlineData(false, "captured-version")]
    [InlineData(true, "captured-version")]
    [InlineData(true, null)]
    [InlineData(true, "")]
    public async Task Acquire_ComparesAndSetsTheSnapshotAndContinuesFromStoragesAnswer(
        bool processNext,
        string? blobVersion
    )
    {
        var setup = new Setup();
        Instance returned = setup.CreateInstance(ProcessStatus.Processing);
        returned.Data[0].BlobVersionId = blobVersion;
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
                        returned,
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    )
                );
            }
        );
        Guid stepId = Guid.NewGuid();

        ProcessingStatusAcquisition result = await setup.Acquire(
            processNext ? setup.CreatePayload() : null,
            stepId,
            snapshot => snapshot.Data[0].BlobVersionId = blobVersion
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
            Assert.Single(setup.WorkflowEngineService.Invocations);
            Assert.Equal(acquired.State, setup.EnqueuedState);
        }
        else
        {
            setup.WorkflowEngineService.VerifyNoOtherCalls();
        }
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
            processNext ? setup.CreatePayload() : null,
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
        setup.WorkflowEngineService.VerifyNoOtherCalls();
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
            setup.Acquire(setup.CreatePayload(), Guid.NewGuid())
        );

        Assert.Same(exception, thrown);
    }

    [Theory]
    [InlineData("Task_2", false, null)]
    [InlineData("Task_2", true, null)]
    [InlineData("EndEvent_1", false, "reject")]
    [InlineData("EndEvent_1", true, "reject")]
    [InlineData("Task_1", false, null)]
    [InlineData("Task_1", true, null)]
    public async Task Acquire_PreparedTransitionAndReplay_UseTheDurableContextWithoutChangingHistory(
        string target,
        bool historicalTimesAreNull,
        string? action
    )
    {
        var setup = new Setup();
        Instance returned = setup.CreateInstance(ProcessStatus.Processing);
        returned.DataValues = new Dictionary<string, string> { ["source"] = "mutation-response" };
        int attempts = 0;
        setup.SetupCommit(
            (_, _, _) =>
                Task.FromResult(
                    new InstanceMutationWithStorageMetadata(
                        returned,
                        new StorageVersionMetadata(13, 9),
                        replayed: ++attempts > 1
                    )
                )
        );
        string payload = setup.CreatePayload(action, target, historicalTimesAreNull);
        var prepared = Assert.IsType<AcquireProcessingStatusPayload>(
            CommandPayloadSerializer.Deserialize<CommandRequestPayload>(payload)
        );
        string historicalState = JsonSerializer.Serialize(prepared.ProcessStateChange.OldProcessState);
        Guid stepId = Guid.NewGuid();

        await setup.Acquire(payload, stepId);
        var acquired = Assert.IsType<ProcessingStatusAcquisition.Acquired>(await setup.Acquire(payload, stepId));

        WorkflowCallbackState state = setup.ReadState(acquired.State);
        Assert.Equal(13, state.InstanceVersion);
        Assert.Equal(9, state.ProcessStateVersion);
        Assert.Equal("mutation-response", state.Instance.DataValues["source"]);
        setup.InstanceClient.VerifyNoOtherCalls();
        Assert.Equal(acquired.State, setup.EnqueuedState);
        Assert.Equal(2, setup.EnqueuedTransitions.Count);
        Assert.Equal(
            JsonSerializer.Serialize(setup.EnqueuedTransitions[0]),
            JsonSerializer.Serialize(setup.EnqueuedTransitions[1])
        );
        ProcessStateChange transition = setup.EnqueuedTransitions[1];
        Assert.Equal(historicalState, JsonSerializer.Serialize(transition.OldProcessState));
        var destination = Assert.IsType<ProcessState>(transition.NewProcessState);
        Assert.Equal(prepared.ProcessStateChange.OldProcessState?.Started, destination.Started);
        var events = Assert.IsType<List<InstanceEvent>>(transition.Events);
        Assert.All(
            events,
            instanceEvent =>
            {
                Assert.Equal(_executionReferenceTime.UtcDateTime, instanceEvent.Created);
                Assert.Equal(PartyId, instanceEvent.User.UserId);
                Assert.Equal(destination.Started, instanceEvent.ProcessInfo.Started);
            }
        );
        Assert.Equal(historicalState, JsonSerializer.Serialize(events[0].ProcessInfo));
        Assert.All(events.Skip(1), instanceEvent => Assert.Equivalent(destination, instanceEvent.ProcessInfo));
        if (destination.CurrentTask is { } task)
        {
            Assert.Equal(target, task.ElementId);
            Assert.Equal(3, task.Flow);
            Assert.Equal(_executionReferenceTime.UtcDateTime, task.Started);
            Assert.Null(destination.Ended);
        }
        else
        {
            Assert.Equal(target, destination.EndEvent);
            Assert.Equal(_executionReferenceTime.UtcDateTime, destination.Ended);
        }
    }

    [Theory]
    [InlineData("changed-version")]
    [InlineData("missing-original")]
    [InlineData("missing-returned")]
    public async Task Acquire_WhenCapturedFormDataDoesNotMatchTheMutationResponse_ThrowsBeforeContinuing(
        string mismatch
    )
    {
        var setup = new Setup();
        Instance returned = setup.CreateInstance(ProcessStatus.Processing);
        if (mismatch is "changed-version")
        {
            returned.Data[0].BlobVersionId = "new-version";
        }
        else if (mismatch is "missing-returned")
        {
            returned.Data.Clear();
        }
        setup.SetupCommit(
            (_, _, _) =>
                Task.FromResult(new InstanceMutationWithStorageMetadata(returned, new StorageVersionMetadata(13, 9)))
        );

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.Acquire(
                setup.CreatePayload(),
                Guid.NewGuid(),
                snapshot =>
                {
                    if (mismatch is "missing-original")
                    {
                        snapshot.Data.Clear();
                    }
                }
            )
        );

        setup.WorkflowEngineService.VerifyNoOtherCalls();
        setup.InstanceClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("null")]
    [InlineData("""{"$type":"taskDataLock","taskId":"Task_1"}""")]
    [InlineData("""{"$type":"acquireProcessingStatus"}""")]
    [InlineData("""{"$type":"acquireProcessingStatus","processStateChange":null}""")]
    [InlineData("""{"$type":"acquireProcessingStatus","processStateChange":{}}""")]
    public async Task Acquire_WithAnInvalidPayload_RejectsWithoutCallingStorage(string payload)
    {
        var setup = new Setup();

        ProcessingStatusAcquisition result = await setup.Acquire(payload, Guid.NewGuid());

        Assert.IsType<ProcessingStatusAcquisition.Rejected>(result);
        setup.MutationClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("source")]
    [InlineData("target")]
    [InlineData("events")]
    [InlineData("eventState")]
    [InlineData("bothTargets")]
    [InlineData("noTarget")]
    public async Task Acquire_WithAnIncompletePreparedTransition_RejectsWithoutCallingStorage(string missing)
    {
        var setup = new Setup();
        var payload = Assert.IsType<AcquireProcessingStatusPayload>(
            CommandPayloadSerializer.Deserialize<CommandRequestPayload>(setup.CreatePayload())
        );
        ProcessStateChange transition = payload.ProcessStateChange;
        switch (missing)
        {
            case "source":
                transition.OldProcessState = null;
                break;
            case "target":
                transition.NewProcessState = null;
                break;
            case "events":
                transition.Events = null;
                break;
            case "eventState":
                Assert.IsType<List<InstanceEvent>>(transition.Events)[0].ProcessInfo = null;
                break;
            case "bothTargets":
                Assert.IsType<ProcessState>(transition.NewProcessState).EndEvent = "EndEvent_1";
                break;
            case "noTarget":
                Assert.IsType<ProcessState>(transition.NewProcessState).CurrentTask = null;
                break;
        }

        ProcessingStatusAcquisition result = await setup.Acquire(
            CommandPayloadSerializer.Serialize(payload),
            Guid.NewGuid()
        );

        Assert.IsType<ProcessingStatusAcquisition.Rejected>(result);
        setup.MutationClient.VerifyNoOtherCalls();
        setup.WorkflowEngineService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Acquire_WithoutAProcessState_RejectsWithoutCallingStorage()
    {
        var setup = new Setup();

        ProcessingStatusAcquisition result = await setup.Acquire(
            setup.CreatePayload(),
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
            WorkflowEngineService
                .Setup(service =>
                    service.EnqueueDependentProcessNext(
                        It.IsAny<Instance>(),
                        It.IsAny<ProcessStateChange>(),
                        It.IsAny<Guid>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<Actor>(),
                        null,
                        It.IsAny<CancellationToken>()
                    )
                )
                .Callback<Instance, ProcessStateChange, Guid, string, string, Actor, string?, CancellationToken>(
                    (instance, transition, dependency, collectionKey, state, actor, _, cancellationToken) =>
                    {
                        Assert.Equal(ProcessStatus.Processing, instance.Process?.Status);
                        Assert.Equal(WorkflowId, dependency);
                        Assert.Equal("process-chain", collectionKey);
                        Assert.Equal(PartyId, actor.UserId);
                        Assert.Equal(CancellationToken.None, cancellationToken);
                        EnqueuedTransitions.Add(transition);
                        EnqueuedState = state;
                    }
                )
                .ReturnsAsync(Guid.NewGuid());
            _acquirer = new ProcessingStatusAcquirer(stateService, MutationClient.Object, WorkflowEngineService.Object);
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

        public Guid WorkflowId { get; } = Guid.NewGuid();

        public Mock<IWorkflowEngineService> WorkflowEngineService { get; } = new(MockBehavior.Strict);

        public List<ProcessStateChange> EnqueuedTransitions { get; } = [];

        public string? EnqueuedState { get; private set; }

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
                Data =
                [
                    new DataElement
                    {
                        Id = Guid.Empty.ToString(),
                        DataType = "model",
                        BlobVersionId = "captured-version",
                    },
                ],
            };

        public string CreatePayload(
            string? action = null,
            string target = "Task_2",
            bool historicalTimesAreNull = false
        )
        {
            var source = new ProcessState
            {
                Started = historicalTimesAreNull ? null : _started,
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "Task_1",
                    Flow = 2,
                    Started = historicalTimesAreNull ? null : _started.AddHours(1),
                },
            };
            var destination = new ProcessState { Started = source.Started };
            var events = new List<InstanceEvent>
            {
                new()
                {
                    EventType = action is "reject"
                        ? nameof(InstanceEventType.process_AbandonTask)
                        : nameof(InstanceEventType.process_EndTask),
                    ProcessInfo = source,
                },
            };
            if (target is "EndEvent_1")
            {
                destination.EndEvent = target;
                events.Add(
                    new InstanceEvent
                    {
                        EventType = nameof(InstanceEventType.process_EndEvent),
                        ProcessInfo = destination,
                    }
                );
                events.Add(
                    new InstanceEvent { EventType = nameof(InstanceEventType.Submited), ProcessInfo = destination }
                );
            }
            else
            {
                destination.CurrentTask = new ProcessElementInfo { ElementId = target, Flow = 3 };
                events.Add(
                    new InstanceEvent
                    {
                        EventType = nameof(InstanceEventType.process_StartTask),
                        ProcessInfo = destination,
                    }
                );
            }
            var transition = new ProcessStateChange
            {
                OldProcessState = source,
                NewProcessState = destination,
                Events = events,
            };
            return CommandPayloadSerializer.Serialize(new AcquireProcessingStatusPayload(transition))
                ?? throw new InvalidOperationException("Prepared payload was not serialized.");
        }

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
                    WorkflowId = WorkflowId,
                    StepId = stepId,
                    ExecutionReferenceTime = _executionReferenceTime,
                    State = state,
                },
                state,
                payload is null ? null : "process-chain",
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
