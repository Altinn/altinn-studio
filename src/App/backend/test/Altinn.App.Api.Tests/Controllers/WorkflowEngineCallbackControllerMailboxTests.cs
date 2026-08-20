using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

/// <summary>
/// The relay from the callback controller's end: it runs where the controller runs it, on the paths the
/// controller runs it on, and with the state the controller had just published. The unit tests around
/// <see cref="MailboxRelay"/> prove what the saga does; this proves the controller actually asks for it, after
/// the save on a success and before the response on a permanent failure.
/// </summary>
public class WorkflowEngineCallbackControllerMailboxTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;
    private const string ServiceTaskType = "archiving-relay-probe";

    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");

    public WorkflowEngineCallbackControllerMailboxTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper) { }

    /// <summary>A pipeline answered by a message, whose conclusion returns whatever the test wants.</summary>
    private sealed class RelayProbeTask(Func<ServiceTaskContext, ServiceTaskResult> verdict) : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(context => Task.FromResult(verdict(context)))
                .WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
    }

    /// <summary>Every engine call the callback makes, in the order it made them.</summary>
    private sealed class CallRecorder
    {
        public List<string> Calls { get; } = [];

        public List<string> EnqueueKeys { get; } = [];

        public List<Guid> Closed { get; } = [];

        public List<string> AfterWorkflowState { get; } = [];
    }

    /// <summary>
    /// The engine as the relay sees it. Standalone rather than a decorator: the only calls this callback path makes
    /// are the two the saga makes, and every other member is a loud "the callback did something it should not".
    /// </summary>
    private sealed class RecordingClient(CallRecorder recorder) : IWorkflowEngineClient
    {
        public Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
            string ns,
            string idempotencyKey,
            string? collectionKey,
            WorkflowEnqueueRequest request,
            CancellationToken ct = default
        )
        {
            recorder.Calls.Add("enqueue");
            recorder.EnqueueKeys.Add(idempotencyKey);
            return Task.FromResult(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = ns }],
                }
            );
        }

        public Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken ct = default)
        {
            recorder.Calls.Add("close");
            recorder.Closed.Add(mailboxId);
            return Task.FromResult<MailboxResponse?>(null);
        }

        public Task<MailboxDeliveryResult> DeliverToMailbox(
            string ns,
            Guid mailboxId,
            MailboxDeliveryRequest request,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<CancelWorkflowResponse> CancelWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<ResumeWorkflowResponse> ResumeWorkflow(
            string ns,
            Guid workflowId,
            bool cascade = false,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<bool> AbandonWorkflow(string ns, Guid workflowId, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<MailboxMintResult> MintMailbox(
            string ns,
            MailboxCreateRequest request,
            CancellationToken ct = default
        ) => throw new NotSupportedException();
    }

    private sealed record CallbackOutcome(
        HttpStatusCode Status,
        WorkflowCallbackState? Returned,
        CallRecorder Recorder,
        Guid StepId
    );

    private async Task<CallbackOutcome> RunReceiveCallback(
        Func<ServiceTaskContext, ServiceTaskResult> verdict,
        AppCallbackMailbox mailbox
    )
    {
        var instanceGuid = Guid.NewGuid();
        var recorder = new CallRecorder();
        var stepId = Guid.NewGuid();

        using HttpClient client = GetRootedClient(
            Org,
            App,
            configureServices: services =>
            {
                services.AddSingleton<IPipelineServiceTask>(new RelayProbeTask(verdict));

                services.AddSingleton<IWorkflowEngineClient>(new RecordingClient(recorder));

                // The after-workflow's transition needs a real BPMN move this test app does not have for a
                // service task, so the process engine is a recorder: what matters is that the controller asks
                // for it, after the close and with the state it just published.
                var processEngine = new Mock<IProcessEngine>();
                processEngine
                    .Setup(x =>
                        x.EnqueueProcessNext(
                            It.IsAny<Instance>(),
                            It.IsAny<Actor>(),
                            It.IsAny<string>(),
                            It.IsAny<Guid>(),
                            It.IsAny<string>(),
                            It.IsAny<string>(),
                            It.IsAny<string?>(),
                            It.IsAny<string?>(),
                            It.IsAny<CancellationToken>()
                        )
                    )
                    .Callback<Instance, Actor, string, Guid, string, string, string?, string?, CancellationToken>(
                        (_, _, _, _, _, state, _, idempotencyKey, _) =>
                        {
                            recorder.Calls.Add("after-workflow");
                            recorder.EnqueueKeys.Add(idempotencyKey!);
                            recorder.AfterWorkflowState.Add(state);
                        }
                    )
                    .Returns(Task.CompletedTask);
                services.AddSingleton(processEngine.Object);
            }
        );
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Services.GetRequiredService<IWorkflowCallbackTokenGenerator>().GenerateToken(instanceGuid)
        );
        var signer = Services.GetRequiredService<WorkflowStateSigner>();

        var incoming = new WorkflowCallbackState
        {
            Instance = CreateInstance(instanceGuid),
            FormData = [],
            MailboxId = _mailboxId,
        };
        var payload = new AppCallbackPayload
        {
            CommandKey = ExecuteServiceTask.Key,
            Actor = new Actor { Language = "nb" },
            LockToken = "lock-token",
            ExecutionReferenceTime = DateTimeOffset.UnixEpoch,
            WorkflowId = Guid.NewGuid(),
            StepId = stepId,
            Mailbox = mailbox,
            Payload = CommandPayloadSerializer.Serialize(new ExecuteServiceTaskPayload(ServiceTaskType)),
            State = signer.Sign(JsonSerializer.Serialize(incoming), SigningDomain.CallbackState),
        };

        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/workflow-engine-callbacks/{ExecuteServiceTask.Key}",
            content
        );

        WorkflowCallbackState? returned = null;
        if (response.StatusCode == HttpStatusCode.OK)
        {
            var callbackResponse = JsonSerializer.Deserialize<AppCallbackResponse>(
                await response.Content.ReadAsStringAsync(),
                JsonSerializerOptions
            );
            returned = JsonSerializer.Deserialize<WorkflowCallbackState>(
                signer.Verify(callbackResponse!.State!, SigningDomain.CallbackState)
            );
        }

        return new CallbackOutcome(response.StatusCode, returned, recorder, stepId);
    }

    private static Instance CreateInstance(Guid instanceGuid) =>
        new()
        {
            Id = $"{InstanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{App}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Data = [],
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

    /// <summary>
    /// A delivered message, sealed with the host's own callback code exactly as
    /// <see cref="IServiceTaskReplyForwarder"/> seals one. An unsealed payload never reaches the handler, so a
    /// relay test that hand-wrote one would only be testing the refusal.
    /// </summary>
    private AppCallbackMailbox Delivered()
    {
        const string key = "fiks-message-1";
        return new AppCallbackMailbox
        {
            Id = _mailboxId,
            Seq = 0,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = key,
                Payload = Services
                    .GetRequiredService<MailboxDeliveryEnvelope>()
                    .Wrap("<receipt/>", _mailboxId, ServiceTaskType, key),
                AcceptedAt = DateTimeOffset.UnixEpoch,
            },
        };
    }

    private static AppCallbackMailbox Closed() =>
        new()
        {
            Id = _mailboxId,
            Seq = 1,
            DisposedReason = MailboxDisposedReason.Deadline,
        };

    [Fact]
    public void TheForwarder_ResolvesFromTheRealContainer()
    {
        // The step's one public entry point, taken the way an app takes it. Every other test in this stack
        // constructs ServiceTaskReplyForwarder directly, so nothing would notice if its registration were
        // missing or one of its dependencies were unreachable from a scope — and one of them, AppIdentifier,
        // is registered in an entirely different file.
        using IServiceScope scope = Services.CreateScope();

        var forwarder = scope.ServiceProvider.GetService<IServiceTaskReplyForwarder>();

        Assert.IsType<ServiceTaskReplyForwarder>(forwarder);
        // Transient, because the xmldoc tells a singleton subscriber to take one per received message rather than
        // hold one: a captured instance pins its HttpClient for the process's whole life.
        Assert.NotSame(forwarder, scope.ServiceProvider.GetRequiredService<IServiceTaskReplyForwarder>());
    }

    [Fact]
    public async Task Conclusion_ClosesTheMailboxBeforeTheAfterWorkflow_ThroughTheRealCallback()
    {
        // Saga invariant 1 end to end: the controller runs the relay after saving and re-capturing, and the relay
        // closes before it starts anything. Both keys derive from this step.
        CallbackOutcome outcome = await RunReceiveCallback(_ => ServiceTaskResult.Success(), Delivered());

        Assert.Equal(HttpStatusCode.OK, outcome.Status);
        Assert.Equal(["close", "after-workflow"], outcome.Recorder.Calls);
        Assert.Equal(_mailboxId, Assert.Single(outcome.Recorder.Closed));
        Assert.Equal(
            MailboxRelay.CreateAfterWorkflowIdempotencyKey(outcome.StepId),
            Assert.Single(outcome.Recorder.EnqueueKeys)
        );
    }

    [Fact]
    public async Task Conclusion_StartsTheAfterWorkflowOnTheBlobItJustPublished()
    {
        // The reason the relay runs in the controller and not in the command: the workflow the conclusion starts
        // must begin on the state the conclusion published. And the published blob must no longer name the
        // finished exchange's mailbox — the next transition may open one of its own.
        CallbackOutcome outcome = await RunReceiveCallback(_ => ServiceTaskResult.Success(), Delivered());

        Assert.NotNull(outcome.Returned);
        Assert.Null(outcome.Returned.MailboxId);

        string afterWorkflowState = Assert.Single(outcome.Recorder.AfterWorkflowState);
        var signer = Services.GetRequiredService<WorkflowStateSigner>();
        var carried = JsonSerializer.Deserialize<WorkflowCallbackState>(
            signer.Verify(afterWorkflowState, SigningDomain.CallbackState)
        );
        Assert.Null(carried!.MailboxId);
    }

    [Fact]
    public async Task AwaitNextReply_EnqueuesTheSuccessorAndKeepsTheMailboxOpenAndCarried()
    {
        // The relay hop: one enqueue, keyed on this step, nothing closed — and the blob the successor starts on
        // still names the mailbox, because the exchange is not over.
        CallbackOutcome outcome = await RunReceiveCallback(_ => ServiceTaskResult.AwaitNextReply(), Delivered());

        Assert.Equal(HttpStatusCode.OK, outcome.Status);
        Assert.Equal(["enqueue"], outcome.Recorder.Calls);
        Assert.Empty(outcome.Recorder.Closed);
        Assert.Equal(
            EnqueueReceiveWorkflow.CreateIdempotencyKey(outcome.StepId),
            Assert.Single(outcome.Recorder.EnqueueKeys)
        );
        Assert.Equal(_mailboxId, outcome.Returned!.MailboxId);
    }

    [Fact]
    public async Task PermanentFailure_ClosesTheMailboxAndStillFailsTheCallback()
    {
        // A conclusion that gives up still ends the exchange: the mailbox must stop accepting messages even though
        // nothing downstream starts. Run before the response, so a retried step repeats it.
        CallbackOutcome outcome = await RunReceiveCallback(
            _ => ServiceTaskResult.FailedPermanent("the archive never confirmed before the deadline"),
            Closed()
        );

        Assert.Equal(HttpStatusCode.UnprocessableEntity, outcome.Status);
        Assert.Equal(["close"], outcome.Recorder.Calls);
        Assert.Equal(_mailboxId, Assert.Single(outcome.Recorder.Closed));
    }

    [Fact]
    public async Task AwaitNextReply_OnAClosedMailbox_IsRejectedAndTouchesNothing()
    {
        // The contract violation the engine leaves to the app-lib, through the real callback: 422, and the saga
        // does not start — no receiver at a position that could never be filled, and no close.
        CallbackOutcome outcome = await RunReceiveCallback(_ => ServiceTaskResult.AwaitNextReply(), Closed());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, outcome.Status);
        Assert.Empty(outcome.Recorder.Calls);
    }

    [Fact]
    public async Task RetryableFailure_StartsNoSaga()
    {
        CallbackOutcome outcome = await RunReceiveCallback(
            _ => ServiceTaskResult.FailedRetryable("the archive is down"),
            Delivered()
        );

        Assert.Equal(HttpStatusCode.InternalServerError, outcome.Status);
        Assert.Empty(outcome.Recorder.Calls);
    }

    [Fact]
    public void TheRelayResolvesFromTheRealContainer()
    {
        // The relay sits between the callback controller and the process engine — a graph a future edit could make
        // circular. Every test above substitutes the process engine, so this is what proves the registration
        // the app actually ships with can be built.
        using HttpClient client = GetRootedClient(Org, App);
        Assert.NotNull(client);

        Assert.NotNull(Services.GetRequiredService<MailboxRelay>());
    }

    [Fact]
    public async Task TheHandlerReadsTheMessage()
    {
        // The point of the whole step, asserted where an app author's handler actually sits.
        ServiceTaskReply? seen = null;
        MailboxClosedReason? closedReason = null;
        await RunReceiveCallback(
            context =>
            {
                seen = context.Reply;
                closedReason = context.ReplyClosedReason;
                return ServiceTaskResult.SuccessWithoutAutoAdvance();
            },
            Delivered()
        );

        Assert.NotNull(seen);
        Assert.Equal("<receipt/>", seen.Payload);
        Assert.Equal("fiks-message-1", seen.IdempotencyKey);
        Assert.Null(closedReason);
    }
}
