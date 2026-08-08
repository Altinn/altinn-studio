using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.App.Tests.Common.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using NewtonsoftJson = Newtonsoft.Json.JsonConvert;

namespace Altinn.App.Api.Tests.Controllers;

public class WorkflowEngineCallbackControllerTests
{
    private const int InstanceOwnerPartyId = 123456;
    private const string DataTypeId = "task-data";
    private const string ContentType = "application/json";

    [Fact]
    public async Task ExecuteCommand_WhenUnitOfWorkHasNothingToSave_SkipsStorageMutation()
    {
        var command = new TrackingNoOpCommand();
        await using ControllerSetup setup = CreateSetup(command);

        IActionResult result = await setup.Execute(command.GetKey(), stepId: Guid.NewGuid());

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AppCallbackResponse>(ok.Value);
        Assert.NotNull(response.State);
        Assert.True(command.Executed);
        Assert.Empty(GetMutationRequests(setup.Services));
    }

    [Fact]
    public async Task ExecuteCommand_ForwardsWorkflowSavePreconditionsAndNoLockHeader()
    {
        await using ControllerSetup setup = CreateSetup(
            new AddBinaryDataCommand(),
            (_, instance) => instance.Process!.Status = ProcessStatus.Processing
        );

        Guid stepId = Guid.NewGuid();
        IActionResult result = await setup.Execute(AddBinaryDataCommand.Key, stepId: stepId);

        Assert.IsType<OkObjectResult>(result);
        var mutationRequest = Assert.Single(GetMutationRequests(setup.Services));
        Assert.Equal(
            "1",
            mutationRequest
                .RequestHeaders.GetValues(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName)
                .Single()
        );
        Assert.Equal(
            "1",
            mutationRequest
                .RequestHeaders.GetValues(StoragePreconditionHeaders.IfProcessStateVersionMatchHeaderName)
                .Single()
        );
        Assert.Equal(
            stepId.ToString(),
            mutationRequest.RequestHeaders.GetValues(StoragePreconditionHeaders.IdempotencyKeyHeaderName).Single()
        );
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(mutationRequest.RequestBody!);
        Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
        Assert.False(mutationRequest.RequestHeaders.Contains("Altinn-Storage-Lock-Token"));
    }

    [Fact]
    public async Task ExecuteCommand_PassesExactCallbackMetadataToServiceTaskAndWorkflowOwnedSave()
    {
        Guid stepId = Guid.Parse("11111111-2222-3333-4444-555555555555");
        var executionReferenceTime = new DateTimeOffset(2026, 7, 21, 10, 30, 0, TimeSpan.FromHours(2));
        var serviceTask = new CapturingServiceTask(stageMutation: true);
        await using ControllerSetup setup = CreateSetup(
            services =>
            {
                services.Services.AddSingleton<IServiceTask>(serviceTask);
                services.Services.AddSingleton<IWorkflowEngineCommand>(serviceProvider => new ExecuteServiceTask(
                    serviceProvider.GetRequiredService<AppImplementationFactory>(),
                    new MailboxDeliveryEnvelope(serviceProvider.GetRequiredService<WorkflowStateSigner>())
                ));
            },
            (_, instance) =>
            {
                instance.Process!.Status = ProcessStatus.Processing;
                instance.Process.CurrentTask = new ProcessElementInfo
                {
                    ElementId = "ServiceTask_1",
                    AltinnTaskType = CapturingServiceTask.ServiceTaskType,
                };
            }
        );
        string commandPayload = CommandPayloadSerializer.Serialize(
            new ExecuteServiceTaskPayload(CapturingServiceTask.ServiceTaskType, ItemIndex: 0)
        )!;

        IActionResult result = await setup.Execute(
            ExecuteServiceTask.Key,
            stepId,
            commandPayload,
            executionReferenceTime
        );

        var response = Assert.IsType<AppCallbackResponse>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.NotNull(serviceTask.ReceivedContext);
        Assert.Equal(stepId, serviceTask.ReceivedContext.StepId);
        Assert.Equal(executionReferenceTime, serviceTask.ReceivedContext.ExecutionReferenceTime);
        var mutationRequest = Assert.Single(GetMutationRequests(setup.Services));
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(mutationRequest.RequestBody!);
        Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, mutation.ProcessState?.State?.Status);
        Assert.Single(mutation.CreateDataElements);
        Assert.Equal(
            stepId.ToString(),
            mutationRequest.RequestHeaders.GetValues(StoragePreconditionHeaders.IdempotencyKeyHeaderName).Single()
        );
        Assert.Equal(ProcessStatus.Idle, setup.DeserializeState(response.State!).Instance.Process?.Status);
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.Equal(ProcessStatus.Idle, storedInstance.Process?.Status);
        Assert.Equal("ServiceTask_1", storedInstance.Process?.CurrentTask?.ElementId);
    }

    [Fact]
    public async Task ExecuteCommand_AutoAdvanceServiceTask_SavesStagedDataBeforeEnqueueAndKeepsProcessing()
    {
        const string action = "approve";
        const string collectionKey = "service-task-chain";
        var serviceTask = new AutoAdvanceServiceTask(action);
        var processEngine = new Mock<IProcessEngine>(MockBehavior.Strict);
        ControllerSetup? setup = null;
        bool enqueueObservedSavedMutation = false;
        processEngine
            .Setup(engine =>
                engine.EnqueueProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<Actor>(),
                    It.IsAny<Guid>(),
                    collectionKey,
                    It.IsAny<string>(),
                    action,
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, Actor, Guid, string, string, string?, string?, CancellationToken>(
                (instance, _, _, _, state, _, _, _) =>
                {
                    StorageClientInterceptor.RequestResponse request = Assert.Single(
                        GetMutationRequests(setup!.Services)
                    );
                    StorageInstanceMutationRequest mutation = DeserializeMutationRequest(request.RequestBody!);
                    Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
                    Assert.Null(mutation.ProcessState);
                    Assert.Single(mutation.CreateDataElements);
                    Assert.Equal(ProcessStatus.Processing, instance.Process?.Status);
                    Assert.Equal(ProcessStatus.Processing, setup.DeserializeState(state).Instance.Process?.Status);
                    enqueueObservedSavedMutation = true;
                }
            )
            .Returns(Task.CompletedTask);

        setup = CreateSetup(
            services =>
            {
                services.Services.AddSingleton<IServiceTask>(serviceTask);
                services.Services.AddSingleton<IWorkflowEngineCommand>(serviceProvider => new ExecuteServiceTask(
                    serviceProvider.GetRequiredService<AppImplementationFactory>(),
                    new MailboxDeliveryEnvelope(serviceProvider.GetRequiredService<WorkflowStateSigner>())
                ));
                services.Services.AddSingleton(processEngine.Object);
            },
            (_, instance) =>
            {
                instance.Process!.Status = ProcessStatus.Processing;
                instance.Process.CurrentTask = new ProcessElementInfo
                {
                    ElementId = "ServiceTask_1",
                    AltinnTaskType = AutoAdvanceServiceTask.ServiceTaskType,
                };
            }
        );
        await using (setup)
        {
            string payload = CommandPayloadSerializer.Serialize(
                new ExecuteServiceTaskPayload(AutoAdvanceServiceTask.ServiceTaskType, ItemIndex: 0)
            )!;

            IActionResult result = await setup.Execute(ExecuteServiceTask.Key, Guid.NewGuid(), payload, collectionKey);

            var response = Assert.IsType<AppCallbackResponse>(Assert.IsType<OkObjectResult>(result).Value);
            Assert.True(enqueueObservedSavedMutation);
            Assert.Equal(ProcessStatus.Processing, setup.DeserializeState(response.State!).Instance.Process?.Status);
            var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(
                InstanceOwnerPartyId,
                setup.InstanceGuid
            );
            Assert.Equal(ProcessStatus.Processing, storedInstance.Process?.Status);
            Assert.Equal("ServiceTask_1", storedInstance.Process?.CurrentTask?.ElementId);
            processEngine.VerifyAll();
        }
    }

    [Fact]
    public async Task ExecuteCommand_WhenWorkflowOwnedSaveGetsStoragePreconditionFailed_ReturnsNonRetryableProblem()
    {
        await using ControllerSetup setup = CreateSetup(new AddBinaryDataCommand());
        setup.Services.Storage.SetStorageVersions(
            InstanceOwnerPartyId,
            setup.InstanceGuid,
            instanceVersion: 2,
            processStateVersion: 1
        );

        IActionResult result = await setup.Execute(AddBinaryDataCommand.Key, stepId: Guid.NewGuid());

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("StoragePreconditionFailedException", problem.Title);
        Assert.Contains("stale", problem.Detail, StringComparison.OrdinalIgnoreCase);
        Assert.True((bool)problem.Extensions["nonRetryable"]!);
        Assert.Single(GetMutationRequests(setup.Services));
    }

    [Fact]
    public async Task ExecuteCommand_WhenAcquireGetsStaleInstanceVersion_ReturnsNonRetryableConflictWithoutMutation()
    {
        await using ControllerSetup setup = CreateSetup(new AcquireProcessingStatus());
        setup.Services.Storage.SetStorageVersions(
            InstanceOwnerPartyId,
            setup.InstanceGuid,
            instanceVersion: 2,
            processStateVersion: 1
        );

        IActionResult result = await setup.Execute(AcquireProcessingStatus.Key, stepId: Guid.NewGuid());

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("WorkflowAcquireConflict", problem.Title);
        Assert.Contains("Refresh", problem.Detail, StringComparison.Ordinal);
        Assert.True((bool)problem.Extensions["nonRetryable"]!);
        Assert.Equal(
            AcquireProcessingStatus.ConcurrencyFailureCode,
            problem.Extensions["workflowFailureCode"] as string
        );
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(ProcessStatusHelper.IsIdle(storedInstance));
        Assert.Single(GetMutationRequests(setup.Services));
    }

    [Fact]
    public async Task ExecuteCommand_WhenAcquireGetsProcessStatusConflict_ReturnsNonRetryableConflictWithoutMutation()
    {
        await using ControllerSetup setup = CreateSetup(new AcquireProcessingStatus());
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        storedInstance.Process!.Status = ProcessStatus.Processing;
        setup.Services.Storage.EnforceExpectedProcessStatus = true;

        IActionResult result = await setup.Execute(AcquireProcessingStatus.Key, stepId: Guid.NewGuid());

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("WorkflowAcquireConflict", problem.Title);
        Assert.True((bool)problem.Extensions["nonRetryable"]!);
        Assert.Equal(
            AcquireProcessingStatus.ConcurrencyFailureCode,
            problem.Extensions["workflowFailureCode"] as string
        );
        Assert.Equal(ProcessStatus.Processing, storedInstance.Process.Status);
        StorageClientInterceptor.RequestResponse mutation = Assert.Single(GetMutationRequests(setup.Services));
        Assert.Equal("application/problem+json", mutation.ResponseContentHeaders.ContentType?.MediaType);
        using JsonDocument storageProblem = JsonDocument.Parse(mutation.ResponseBody);
        Assert.Equal(
            StorageProcessStatusConflictException.ErrorCode,
            storageProblem.RootElement.GetProperty("type").GetString()
        );
        Assert.Equal(StatusCodes.Status409Conflict, storageProblem.RootElement.GetProperty("status").GetInt32());
        Assert.Equal("Process status conflict", storageProblem.RootElement.GetProperty("title").GetString());
        Assert.Contains(
            $"Current status: '{ProcessStatus.Processing}'",
            storageProblem.RootElement.GetProperty("detail").GetString(),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task ExecuteCommand_WhenAcquireGetsUnrelatedStorageConflict_DoesNotTagAcquireConflict()
    {
        await using ControllerSetup setup = CreateSetup(new AcquireProcessingStatus());
        setup.Services.Storage.ForcedMutationConflictMessage = "unrelated conflict";

        PlatformHttpException exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            setup.Execute(AcquireProcessingStatus.Key, stepId: Guid.NewGuid())
        );

        Assert.IsNotType<StorageProcessStatusConflictException>(exception);
        Assert.Equal(HttpStatusCode.Conflict, exception.Response.StatusCode);
        Assert.Contains("application/json", exception.Response.Headers["Content-Type"][0]);
        Assert.Equal("\"unrelated conflict\"", exception.Response.Content);
        Assert.DoesNotContain(
            AcquireProcessingStatus.ConcurrencyFailureCode,
            exception.Message,
            StringComparison.Ordinal
        );
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(ProcessStatusHelper.IsIdle(storedInstance));
        Assert.Single(GetMutationRequests(setup.Services));
    }

    [Fact]
    public async Task ExecuteCommand_WhenRealServiceTaskLazyReadUsesStaleCallbackState_ReturnsConflict()
    {
        Guid dataElementId = Guid.NewGuid();
        await using ControllerSetup setup = CreateSetup(
            services =>
            {
                services.Services.AddSingleton<IServiceTask>(new LazyReadServiceTask(dataElementId));
                services.Services.AddSingleton<IWorkflowEngineCommand>(serviceProvider => new ExecuteServiceTask(
                    serviceProvider.GetRequiredService<AppImplementationFactory>(),
                    new MailboxDeliveryEnvelope(serviceProvider.GetRequiredService<WorkflowStateSigner>())
                ));
            },
            (services, instance) =>
            {
                instance.Data.Add(
                    new DataElement
                    {
                        Id = dataElementId.ToString(),
                        InstanceGuid = GetInstanceGuid(instance).ToString(),
                        DataType = DataTypeId,
                        ContentType = ContentType,
                        Filename = "task-data.json",
                        BlobVersionId = StorageClientInterceptor.CreateBlobVersionId(1),
                    }
                );
                services.Storage.AddDataRaw(
                    dataElementId,
                    "stale state"u8.ToArray(),
                    StorageClientInterceptor.CreateBlobVersionId(1)
                );
            }
        );
        setup.Services.Storage.SetDataBlobVersionId(dataElementId, StorageClientInterceptor.CreateBlobVersionId(2));
        string commandPayload = CommandPayloadSerializer.Serialize(
            new ExecuteServiceTaskPayload(LazyReadServiceTask.ServiceTaskType, ItemIndex: 0)
        )!;

        IActionResult result = await setup.Execute(ExecuteServiceTask.Key, stepId: Guid.NewGuid(), commandPayload);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal("Data element content conflict", problem.Title);
        Assert.Contains("Reload the instance data and retry the request.", problem.Detail, StringComparison.Ordinal);
        Assert.Contains(dataElementId.ToString(), problem.Detail, StringComparison.Ordinal);
        var contentRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get
        );
        Assert.Equal(
            StorageClientInterceptor.CreateDataETag(1),
            Assert.Single(contentRequest.RequestHeaders.IfMatch).ToString()
        );
        Assert.Empty(GetMutationRequests(setup.Services));
    }

    [Fact]
    public async Task ExecuteCommand_WhenStorageReplaysPreCommitDataMutation_PreservesAdvancedProcessSnapshot()
    {
        var ended = new DateTime(2026, 7, 24, 8, 30, 0, DateTimeKind.Utc);
        await using ControllerSetup setup = CreateSetup(
            new AddBinaryDataCommand(),
            (_, instance) =>
            {
                instance.Process = new ProcessState
                {
                    Status = ProcessStatus.Processing,
                    Ended = ended,
                    EndEvent = "EndEvent_1",
                    CurrentTask = null,
                };
            }
        );
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        storedInstance.Process = new ProcessState
        {
            Status = ProcessStatus.Processing,
            CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
        };

        Guid replayedStepId = Guid.NewGuid();
        IActionResult firstResult = await setup.Execute(AddBinaryDataCommand.Key, stepId: replayedStepId);
        IActionResult replayResult = await setup.Execute(AddBinaryDataCommand.Key, stepId: replayedStepId);

        var firstResponse = Assert.IsType<AppCallbackResponse>(Assert.IsType<OkObjectResult>(firstResult).Value);
        var replayOk = Assert.IsType<OkObjectResult>(replayResult);
        var replayResponse = Assert.IsType<AppCallbackResponse>(replayOk.Value);
        WorkflowCallbackState firstState = setup.DeserializeState(firstResponse.State!);
        WorkflowCallbackState replayedState = setup.DeserializeState(replayResponse.State!);
        Assert.Equal(ended, firstState.Instance.Process?.Ended);
        Assert.Equal("EndEvent_1", firstState.Instance.Process?.EndEvent);
        Assert.Null(firstState.Instance.Process?.CurrentTask);
        Assert.Equal(ProcessStatus.Processing, firstState.Instance.Process?.Status);
        Assert.Equal(ended, replayedState.Instance.Process?.Ended);
        Assert.Equal("EndEvent_1", replayedState.Instance.Process?.EndEvent);
        Assert.Null(replayedState.Instance.Process?.CurrentTask);
        Assert.Equal(ProcessStatus.Processing, replayedState.Instance.Process?.Status);
        Assert.Single(replayedState.Instance.Data);

        var (storedAfterReplay, storedData) = setup.Services.Storage.GetInstanceAndData(
            InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        Assert.Equal("Task_1", storedAfterReplay.Process?.CurrentTask?.ElementId);
        Assert.Null(storedAfterReplay.Process?.Ended);
        Assert.Null(storedAfterReplay.Process?.EndEvent);
        Assert.Equal(ProcessStatus.Processing, storedAfterReplay.Process?.Status);
        Assert.Single(storedData);
    }

    [Fact]
    public async Task ExecuteCommand_WhenCommandEndsProcess_ArchivesStoredAndCapturedState()
    {
        var ended = new DateTime(2026, 7, 10, 12, 34, 56, DateTimeKind.Utc);
        await using ControllerSetup setup = CreateSetup(new StageEndedProcessCommand(ended));

        IActionResult result = await setup.Execute(StageEndedProcessCommand.Key, stepId: Guid.NewGuid());

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AppCallbackResponse>(ok.Value);
        WorkflowCallbackState capturedState = setup.DeserializeState(response.State!);

        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedInstance.Status.IsArchived);
        Assert.Equal(ended, storedInstance.Status.Archived);
        Assert.True(capturedState.Instance.Status.IsArchived);
        Assert.Equal(ended, capturedState.Instance.Status.Archived);
    }

    [Fact]
    public async Task ExecuteCommand_AcquireProcessingStatus_PersistsAndRoundTripsThroughReplay()
    {
        await using ControllerSetup setup = CreateSetup(
            new AcquireProcessingStatus(),
            (_, instance) => instance.Process!.Status = ProcessStatus.Idle
        );
        Guid stepId = Guid.NewGuid();

        IActionResult first = await setup.Execute(AcquireProcessingStatus.Key, stepId);
        IActionResult replay = await setup.Execute(AcquireProcessingStatus.Key, stepId);

        var firstState = setup.DeserializeState(
            Assert.IsType<AppCallbackResponse>(Assert.IsType<OkObjectResult>(first).Value).State!
        );
        var replayState = setup.DeserializeState(
            Assert.IsType<AppCallbackResponse>(Assert.IsType<OkObjectResult>(replay).Value).State!
        );
        List<StorageClientInterceptor.RequestResponse> requests = GetMutationRequests(setup.Services);
        Assert.Equal(2, requests.Count);
        foreach (StorageClientInterceptor.RequestResponse request in requests)
        {
            StorageInstanceMutationRequest mutation = NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(
                request.RequestBody!
            )!;
            Assert.Equal(ProcessStatus.Idle, mutation.ExpectedProcessStatus);
            Assert.Equal(ProcessStatus.Processing, mutation.ProcessState?.State?.Status);
            Assert.Equal("Task_1", mutation.ProcessState?.State?.CurrentTask?.ElementId);
            Assert.Empty(mutation.CreateDataElements);
            Assert.Empty(mutation.UpdateDataElements);
            Assert.Empty(mutation.DeleteDataElements);
            Assert.Null(mutation.DeleteInstance);
            Assert.Equal(
                stepId.ToString(),
                request.RequestHeaders.GetValues(StoragePreconditionHeaders.IdempotencyKeyHeaderName).Single()
            );
            Assert.Equal(
                "1",
                request.RequestHeaders.GetValues(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName).Single()
            );
            Assert.Equal(
                "1",
                request
                    .RequestHeaders.GetValues(StoragePreconditionHeaders.IfProcessStateVersionMatchHeaderName)
                    .Single()
            );
        }

        Assert.Equal(ProcessStatus.Processing, firstState.Instance.Process?.Status);
        Assert.Equal(ProcessStatus.Processing, replayState.Instance.Process?.Status);
        Assert.Equal(2, firstState.InstanceVersion);
        Assert.Equal(2, firstState.ProcessStateVersion);
        Assert.Equal(2, replayState.InstanceVersion);
        Assert.Equal(2, replayState.ProcessStateVersion);
        var (storedInstance, storedData) = setup.Services.Storage.GetInstanceAndData(
            InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        Assert.Equal(ProcessStatus.Processing, storedInstance.Process?.Status);
        Assert.Equal("Task_1", storedInstance.Process?.CurrentTask?.ElementId);
        Assert.Empty(storedData);
    }

    [Fact]
    public async Task ExecuteCommand_ProcessEnd_CommitsLockedCleanupClearAndHardDeleteAtomically()
    {
        Guid lockedDataElementId = Guid.NewGuid();
        var ended = new DateTime(2026, 7, 24, 8, 30, 0, DateTimeKind.Utc);
        await using ControllerSetup setup = CreateSetup(
            services =>
            {
                services.AppMetadata.AutoDeleteOnProcessEnd = true;
                DataType dataType = services.AppMetadata.DataTypes.Single(dataType => dataType.Id == DataTypeId);
                dataType.AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = true };
                services.Services.AddSingleton<IWorkflowEngineCommand>(serviceProvider => new CommitProcessState(
                    serviceProvider.GetRequiredService<IAppMetadata>()
                ));
            },
            (services, instance) =>
            {
                instance.Process!.Status = ProcessStatus.Processing;
                instance.Data.Add(
                    new DataElement
                    {
                        Id = lockedDataElementId.ToString(),
                        InstanceGuid = GetInstanceGuid(instance).ToString(),
                        DataType = DataTypeId,
                        ContentType = ContentType,
                        Filename = "locked.json",
                        Locked = true,
                        BlobVersionId = StorageClientInterceptor.CreateBlobVersionId(1),
                    }
                );
                services.Storage.AddDataRaw(
                    lockedDataElementId,
                    """{"locked":true}"""u8.ToArray(),
                    StorageClientInterceptor.CreateBlobVersionId(1)
                );
            }
        );
        string commandPayload = CommandPayloadSerializer.Serialize(
            new ProcessStateChangePayload(
                new ProcessStateChange
                {
                    OldProcessState = new ProcessState
                    {
                        Status = ProcessStatus.Processing,
                        CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
                    },
                    NewProcessState = new ProcessState
                    {
                        Ended = ended,
                        EndEvent = "EndEvent_1",
                        CurrentTask = null,
                    },
                    Events = [new InstanceEvent { EventType = "process_EndEvent" }],
                }
            )
        )!;
        Guid stepId = Guid.NewGuid();

        IActionResult result = await setup.Execute(CommitProcessState.Key, stepId, commandPayload);

        var response = Assert.IsType<AppCallbackResponse>(Assert.IsType<OkObjectResult>(result).Value);
        WorkflowCallbackState callbackState = setup.DeserializeState(response.State!);
        StorageClientInterceptor.RequestResponse request = Assert.Single(GetMutationRequests(setup.Services));
        StorageInstanceMutationRequest mutation = NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(
            request.RequestBody!
        )!;
        Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, mutation.ProcessState?.State?.Status);
        Assert.Equal(ended, mutation.ProcessState?.State?.Ended);
        Assert.Equal("EndEvent_1", mutation.ProcessState?.State?.EndEvent);
        Assert.Null(mutation.ProcessState?.State?.CurrentTask);
        Assert.Equal("process_EndEvent", Assert.Single(mutation.ProcessState!.Events!).EventType);
        var delete = Assert.Single(mutation.DeleteDataElements);
        Assert.Equal(lockedDataElementId, delete.DataElementId);
        Assert.True(delete.IgnoreLock);
        Assert.True(mutation.DeleteInstance?.Hard);
        Assert.Empty(mutation.CreateDataElements);
        Assert.Empty(mutation.UpdateDataElements);
        Assert.Empty(mutation.DataValues);
        Assert.Empty(mutation.PresentationTexts);
        Assert.Equal(
            stepId.ToString(),
            request.RequestHeaders.GetValues(StoragePreconditionHeaders.IdempotencyKeyHeaderName).Single()
        );
        Assert.Equal(
            "1",
            request.RequestHeaders.GetValues(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName).Single()
        );
        Assert.Equal(
            "1",
            request.RequestHeaders.GetValues(StoragePreconditionHeaders.IfProcessStateVersionMatchHeaderName).Single()
        );

        Assert.Equal(ProcessStatus.Idle, callbackState.Instance.Process?.Status);
        Assert.Equal(ended, callbackState.Instance.Process?.Ended);
        Assert.True(callbackState.Instance.Status.IsHardDeleted);
        Assert.Empty(callbackState.Instance.Data);
        Assert.Equal(2, callbackState.InstanceVersion);
        Assert.Equal(2, callbackState.ProcessStateVersion);
        var (storedInstance, storedData) = setup.Services.Storage.GetInstanceAndData(
            InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        Assert.Equal(ProcessStatus.Idle, storedInstance.Process?.Status);
        Assert.Equal(ended, storedInstance.Process?.Ended);
        Assert.True(storedInstance.Status.IsHardDeleted);
        Assert.Empty(storedInstance.Data);
        Assert.Empty(storedData);
    }

    [Fact]
    public async Task ExecuteCommand_WhenDurableServiceTaskFails_LeavesProcessingOwnedAndDoesNotSave()
    {
        await using ControllerSetup setup = CreateSetup(
            services =>
            {
                services.Services.AddSingleton<IServiceTask>(new FailingServiceTask());
                services.Services.AddSingleton<IWorkflowEngineCommand>(serviceProvider => new ExecuteServiceTask(
                    serviceProvider.GetRequiredService<AppImplementationFactory>(),
                    new MailboxDeliveryEnvelope(serviceProvider.GetRequiredService<WorkflowStateSigner>())
                ));
            },
            (_, instance) =>
            {
                instance.Process!.Status = ProcessStatus.Processing;
                instance.Process.CurrentTask = new ProcessElementInfo
                {
                    ElementId = "ServiceTask_1",
                    AltinnTaskType = FailingServiceTask.ServiceTaskType,
                };
            }
        );
        string payload = CommandPayloadSerializer.Serialize(
            new ExecuteServiceTaskPayload(FailingServiceTask.ServiceTaskType, ItemIndex: 0)
        )!;

        IActionResult result = await setup.Execute(ExecuteServiceTask.Key, Guid.NewGuid(), payload);

        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, error.StatusCode);
        Assert.Empty(GetMutationRequests(setup.Services));
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.Equal(ProcessStatus.Processing, storedInstance.Process?.Status);
        Assert.Equal("ServiceTask_1", storedInstance.Process?.CurrentTask?.ElementId);
        Assert.Equal(FailingServiceTask.ServiceTaskType, storedInstance.Process?.CurrentTask?.AltinnTaskType);
    }

    private static ControllerSetup CreateSetup(IWorkflowEngineCommand command) =>
        CreateSetup(services => services.Services.AddSingleton<IWorkflowEngineCommand>(command));

    private static ControllerSetup CreateSetup(
        IWorkflowEngineCommand command,
        Action<MockedServiceCollection, Instance> configureInstance
    ) => CreateSetup(services => services.Services.AddSingleton<IWorkflowEngineCommand>(command), configureInstance);

    private static ControllerSetup CreateSetup(
        Action<MockedServiceCollection> configureServices,
        Action<MockedServiceCollection, Instance>? configureInstance = null,
        Func<WorkflowStateSigner, Instance, string>? createState = null
    )
    {
        var services = new MockedServiceCollection();
        services.AddDataType(
            new DataType
            {
                Id = DataTypeId,
                TaskId = "Task_1",
                AllowedContentTypes = [ContentType],
                MaxCount = 10,
            }
        );
        configureServices(services);
        services.Services.AddSingleton<WorkflowCallbackStateService>();
        services.Services.AddTransient<WorkflowStateSigner>();
        var stateSigningCode = new AppCode
        {
            Id = "test-secret-id",
            Code = "test-state-signing-secret-long-enough",
            IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(186),
        };
        var secretProviderMock = new Mock<IWorkflowCallbackSecretProvider>(MockBehavior.Strict);
        secretProviderMock.Setup(p => p.GetSigningSecret()).Returns(stateSigningCode);
        secretProviderMock.Setup(p => p.GetValidationSecrets()).Returns([stateSigningCode]);
        services.Services.AddSingleton(secretProviderMock.Object);

        Guid instanceGuid = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            Org = MockedServiceCollection.Org,
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [],
        };
        configureInstance?.Invoke(services, instance);
        services.Storage.AddInstance(instance);
        services.Storage.SetStorageVersions(
            InstanceOwnerPartyId,
            instanceGuid,
            instanceVersion: 1,
            processStateVersion: 1
        );

        WrappedServiceProvider serviceProvider = services.BuildServiceProvider();
        var controller = new WorkflowEngineCallbackController(
            serviceProvider,
            serviceProvider.GetRequiredService<ILogger<WorkflowEngineCallbackController>>(),
            serviceProvider.GetService<Telemetry>()
        );

        WorkflowStateSigner stateSigner = serviceProvider.GetRequiredService<WorkflowStateSigner>();
        string state =
            createState?.Invoke(stateSigner, instance)
            ?? stateSigner.Sign(
                JsonSerializer.Serialize(
                    new WorkflowCallbackState
                    {
                        Instance = instance,
                        InstanceVersion = 1,
                        ProcessStateVersion = 1,
                        FormData = [],
                    }
                ),
                SigningDomain.CallbackState
            );

        return new ControllerSetup(services, serviceProvider, controller, instanceGuid, state);
    }

    private static Guid GetInstanceGuid(Instance instance) => Guid.Parse(instance.Id!.Split('/')[1]);

    private static List<Altinn.App.Tests.Common.Mocks.StorageClientInterceptor.RequestResponse> GetMutationRequests(
        MockedServiceCollection services
    ) =>
        services
            .Storage.RequestsResponses.Where(request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
            )
            .ToList();

    private static StorageInstanceMutationRequest DeserializeMutationRequest(string requestBody)
    {
        if (requestBody.StartsWith('{'))
        {
            return NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(requestBody)!;
        }

        const string jsonPartStart = "\r\n\r\n{";
        int partStart = requestBody.IndexOf(jsonPartStart, StringComparison.Ordinal);
        int start = partStart < 0 ? -1 : partStart + jsonPartStart.Length - 1;
        Assert.True(start >= 0, "Mutation JSON part was not found in the multipart request body.");
        int end = requestBody.IndexOf("\r\n--", start, StringComparison.Ordinal);
        Assert.True(end > start, "Mutation JSON part was not terminated by a multipart boundary.");
        return NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(requestBody[start..end])!;
    }

    private sealed class TrackingNoOpCommand : IWorkflowEngineCommand
    {
        public bool Executed { get; private set; }

        public string GetKey() => "NoOpForCallbackTest";

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
        {
            Executed = true;
            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
    }

    private sealed class AddBinaryDataCommand : IWorkflowEngineCommand
    {
        public const string Key = "AddBinaryDataForCallbackTest";

        public string GetKey() => Key;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
        {
            context.InstanceDataMutator.AddBinaryDataElement(
                DataTypeId,
                ContentType,
                "created.json",
                Encoding.UTF8.GetBytes("""{"status":"created"}""")
            );
            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
    }

    private sealed class LazyReadServiceTask(Guid dataElementId) : IServiceTask
    {
        public const string ServiceTaskType = "LazyReadForCallbackTest";

        public string Type => ServiceTaskType;

        public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
        {
            await context.InstanceDataMutator.GetBinaryData(new DataElementIdentifier(dataElementId));
            return ServiceTaskResult.SuccessWithoutAutoAdvance();
        }
    }

    private sealed class CapturingServiceTask(bool stageMutation) : IServiceTask
    {
        public const string ServiceTaskType = "CaptureWorkflowMetadataForCallbackTest";

        public string Type => ServiceTaskType;

        public ServiceTaskContext? ReceivedContext { get; private set; }

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
        {
            ReceivedContext = context;
            if (stageMutation)
            {
                context.InstanceDataMutator.AddBinaryDataElement(
                    DataTypeId,
                    ContentType,
                    "metadata.json",
                    "{}"u8.ToArray()
                );
            }

            return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance());
        }
    }

    private sealed class AutoAdvanceServiceTask(string action) : IServiceTask
    {
        public const string ServiceTaskType = "AutoAdvanceForCallbackTest";

        public string Type => ServiceTaskType;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
        {
            context.InstanceDataMutator.AddBinaryDataElement(
                DataTypeId,
                ContentType,
                "auto-advance.json",
                "{}"u8.ToArray()
            );
            return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success(action));
        }
    }

    private sealed class FailingServiceTask : IServiceTask
    {
        public const string ServiceTaskType = "FailDurableServiceTaskForCallbackTest";

        public string Type => ServiceTaskType;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedRetryable("Expected failure"));
    }

    private sealed class StageEndedProcessCommand(DateTime ended) : IWorkflowEngineCommand
    {
        public const string Key = "StageEndedProcessForCallbackTest";

        public string GetKey() => Key;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
        {
            var unitOfWork = Assert.IsType<InstanceDataUnitOfWork>(context.InstanceDataMutator);
            var endedProcessState = new ProcessState { Ended = ended, EndEvent = "EndEvent_1" };
            var processStateChange = new ProcessStateChange
            {
                OldProcessState = unitOfWork.Instance.Process,
                NewProcessState = endedProcessState,
                Events = [],
            };
            unitOfWork.Instance.Process = endedProcessState;
            unitOfWork.UpdateProcessState(processStateChange);
            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
    }

    private sealed record ControllerSetup(
        MockedServiceCollection Services,
        WrappedServiceProvider ServiceProvider,
        WorkflowEngineCallbackController Controller,
        Guid InstanceGuid,
        string State
    ) : IAsyncDisposable
    {
        private static readonly DateTimeOffset FixtureExecutionReferenceTime = new(
            2025,
            3,
            14,
            9,
            26,
            53,
            TimeSpan.Zero
        );

        public Task<IActionResult> Execute(
            string commandKey,
            Guid stepId,
            string? commandPayload = null,
            string? collectionKey = null
        ) => Execute(commandKey, stepId, commandPayload, FixtureExecutionReferenceTime, collectionKey);

        public async Task<IActionResult> Execute(
            string commandKey,
            Guid stepId,
            string? commandPayload,
            DateTimeOffset executionReferenceTime,
            string? collectionKey = null
        )
        {
            Controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            if (collectionKey is not null)
            {
                Controller.HttpContext.Request.Headers["Collection-Key"] = collectionKey;
            }

            var payload = new AppCallbackPayload
            {
                CommandKey = commandKey,
                Payload = commandPayload,
                Actor = new Actor { UserId = 42, Language = "nb" },
                WorkflowId = Guid.NewGuid(),
                StepId = stepId,
                ExecutionReferenceTime = executionReferenceTime,
                State = State,
            };

            return await Controller.ExecuteCommand(
                MockedServiceCollection.Org,
                MockedServiceCollection.App,
                InstanceOwnerPartyId,
                InstanceGuid,
                commandKey,
                payload,
                CancellationToken.None
            );
        }

        public WorkflowCallbackState DeserializeState(string signedState) =>
            JsonSerializer.Deserialize<WorkflowCallbackState>(
                ServiceProvider
                    .GetRequiredService<WorkflowStateSigner>()
                    .Verify(signedState, SigningDomain.CallbackState)
            ) ?? throw new InvalidOperationException("Failed to deserialize callback state.");

        public async ValueTask DisposeAsync() => await ServiceProvider.DisposeAsync();
    }
}
