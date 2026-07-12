using System.Text;
using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.Data;
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

namespace Altinn.App.Api.Tests.Controllers;

public class WorkflowEngineCallbackControllerTests
{
    private const int InstanceOwnerPartyId = 123456;
    private const string DataTypeId = "task-data";
    private const string ContentType = "application/json";

    [Fact]
    public async Task ExecuteCommand_WhenIdempotencyKeyHeaderIsMissing_ReturnsNonRetryableProblem()
    {
        var command = new TrackingNoOpCommand();
        await using ControllerSetup setup = CreateSetup(command);

        IActionResult result = await setup.Execute(command.GetKey(), idempotencyKey: null);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.True((bool)problem.Extensions["nonRetryable"]!);
        Assert.False(command.Executed);
        Assert.Empty(GetMutationRequests(setup.Services));
    }

    [Fact]
    public async Task ExecuteCommand_WhenUnitOfWorkHasNothingToSave_SkipsStorageMutation()
    {
        var command = new TrackingNoOpCommand();
        await using ControllerSetup setup = CreateSetup(command);

        IActionResult result = await setup.Execute(command.GetKey(), idempotencyKey: "empty-step-id");

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AppCallbackResponse>(ok.Value);
        Assert.NotNull(response.State);
        Assert.True(command.Executed);
        Assert.Empty(GetMutationRequests(setup.Services));
    }

    [Fact]
    public async Task ExecuteCommand_ForwardsCallbackIdempotencyKeyToWorkflowOwnedSave()
    {
        await using ControllerSetup setup = CreateSetup(new AddBinaryDataCommand());

        IActionResult result = await setup.Execute(AddBinaryDataCommand.Key, idempotencyKey: "callback-step-id");

        Assert.IsType<OkObjectResult>(result);
        var mutationRequest = Assert.Single(GetMutationRequests(setup.Services));
        Assert.Equal(
            "callback-step-id",
            mutationRequest.RequestHeaders.GetValues(StoragePreconditionHeaders.IdempotencyKeyHeaderName).Single()
        );
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

        IActionResult result = await setup.Execute(AddBinaryDataCommand.Key, idempotencyKey: "stale-step-id");

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("StoragePreconditionFailedException", problem.Title);
        Assert.Contains("stale", problem.Detail, StringComparison.OrdinalIgnoreCase);
        Assert.True((bool)problem.Extensions["nonRetryable"]!);
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
                    serviceProvider.GetRequiredService<AppImplementationFactory>()
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
                        ContentEtag = StorageClientInterceptor.CreateDataETag(1),
                    }
                );
                services.Storage.AddDataRaw(
                    dataElementId,
                    "stale state"u8.ToArray(),
                    StorageClientInterceptor.CreateDataETag(1)
                );
            }
        );
        setup.Services.Storage.SetDataETag(dataElementId, StorageClientInterceptor.CreateDataETag(2));
        string commandPayload = CommandPayloadSerializer.Serialize(
            new ExecuteServiceTaskPayload(LazyReadServiceTask.ServiceTaskType)
        )!;

        IActionResult result = await setup.Execute(
            ExecuteServiceTask.Key,
            idempotencyKey: "stale-read-step-id",
            commandPayload
        );

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
    public async Task ExecuteCommand_WhenStorageReplaysMutation_RebuildsStateAndReturnsSuccess()
    {
        await using ControllerSetup setup = CreateSetup(new AddBinaryDataCommand());

        IActionResult firstResult = await setup.Execute(AddBinaryDataCommand.Key, idempotencyKey: "replayed-step-id");
        IActionResult replayResult = await setup.Execute(AddBinaryDataCommand.Key, idempotencyKey: "replayed-step-id");

        Assert.IsType<OkObjectResult>(firstResult);
        var replayOk = Assert.IsType<OkObjectResult>(replayResult);
        var replayResponse = Assert.IsType<AppCallbackResponse>(replayOk.Value);
        WorkflowCallbackState replayedState = setup.DeserializeState(replayResponse.State!);
        Assert.Single(replayedState.Instance.Data);

        var (_, storedData) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.Single(storedData);
    }

    [Fact]
    public async Task ExecuteCommand_WhenCommandStagesInstanceDeletion_SavesDeleteInstanceMutation()
    {
        await using ControllerSetup setup = CreateSetup(new StageInstanceDeletionCommand());

        IActionResult result = await setup.Execute(StageInstanceDeletionCommand.Key, idempotencyKey: "delete-step-id");

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AppCallbackResponse>(ok.Value);
        WorkflowCallbackState capturedState = setup.DeserializeState(response.State!);
        var mutationRequest = Assert.Single(GetMutationRequests(setup.Services));
        Assert.Contains("\"deleteInstance\":{\"hard\":true}", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.True(capturedState.Instance.Status.IsHardDeleted);

        var (storedInstance, storedData) = setup.Services.Storage.GetInstanceAndData(
            InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        Assert.True(storedInstance.Status.IsHardDeleted);
        Assert.Empty(storedData);
    }

    [Fact]
    public async Task ExecuteCommand_WhenCommandEndsProcess_ArchivesStoredAndCapturedState()
    {
        var ended = new DateTime(2026, 7, 10, 12, 34, 56, DateTimeKind.Utc);
        await using ControllerSetup setup = CreateSetup(new StageEndedProcessCommand(ended));

        IActionResult result = await setup.Execute(StageEndedProcessCommand.Key, idempotencyKey: "process-end-step-id");

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AppCallbackResponse>(ok.Value);
        WorkflowCallbackState capturedState = setup.DeserializeState(response.State!);

        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedInstance.Status.IsArchived);
        Assert.Equal(ended, storedInstance.Status.Archived);
        Assert.True(capturedState.Instance.Status.IsArchived);
        Assert.Equal(ended, capturedState.Instance.Status.Archived);
    }

    private static ControllerSetup CreateSetup(IWorkflowEngineCommand command) =>
        CreateSetup(services => services.Services.AddSingleton<IWorkflowEngineCommand>(command));

    private static ControllerSetup CreateSetup(
        Action<MockedServiceCollection> configureServices,
        Action<MockedServiceCollection, Instance>? configureInstance = null
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

        string state = serviceProvider
            .GetRequiredService<WorkflowStateSigner>()
            .Sign(
                JsonSerializer.Serialize(
                    new WorkflowCallbackState
                    {
                        Instance = instance,
                        InstanceVersion = 1,
                        ProcessStateVersion = 1,
                        DataElementEtags = instance
                            .Data.Where(dataElement => !string.IsNullOrEmpty(dataElement.ContentEtag))
                            .ToDictionary(dataElement => dataElement.Id, dataElement => dataElement.ContentEtag!),
                        FormData = [],
                    }
                )
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

    private sealed class StageInstanceDeletionCommand : IWorkflowEngineCommand
    {
        public const string Key = "StageInstanceDeletionForCallbackTest";

        public string GetKey() => Key;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
        {
            var unitOfWork = Assert.IsType<InstanceDataUnitOfWork>(context.InstanceDataMutator);
            unitOfWork.StageInstanceDeletion();
            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
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
            unitOfWork.StageProcessStateChange(processStateChange);
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
        public async Task<IActionResult> Execute(
            string commandKey,
            string? idempotencyKey,
            string? commandPayload = null
        )
        {
            Controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            if (idempotencyKey is not null)
            {
                Controller.HttpContext.Request.Headers[StoragePreconditionHeaders.IdempotencyKeyHeaderName] =
                    idempotencyKey;
            }

            var payload = new AppCallbackPayload
            {
                CommandKey = commandKey,
                Payload = commandPayload,
                Actor = new Actor { UserId = 42, Language = "nb" },
                LockToken = Guid.NewGuid().ToString(),
                WorkflowId = Guid.NewGuid(),
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
                ServiceProvider.GetRequiredService<WorkflowStateSigner>().Verify(signedState)
            ) ?? throw new InvalidOperationException("Failed to deserialize callback state.");

        public async ValueTask DisposeAsync() => await ServiceProvider.DisposeAsync();
    }
}
