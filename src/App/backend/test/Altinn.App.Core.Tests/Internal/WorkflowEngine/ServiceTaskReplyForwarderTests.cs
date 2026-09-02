using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The inbound half of a mailbox exchange: what the forwarder delivers, and what each of the delivery
/// endpoint's documented answers means to the app.
/// </summary>
public class ServiceTaskReplyForwarderTests
{
    private const string Body = """{"status":"mottatt"}""";
    private const string TaskType = "archive";
    private const string Key = "fiks-message-42";

    private readonly Mock<IWorkflowEngineClient> _client = new(MockBehavior.Strict);
    private readonly MailboxDeliveryEnvelope _envelope = TestMailboxDeliveryEnvelope.Create();

    private ServiceTaskReplyForwarder CreateSut(MailboxDeliveryEnvelope? envelope = null) =>
        new(
            _client.Object,
            envelope ?? _envelope,
            new AppIdentifier("ttd", "test-app"),
            NullLogger<ServiceTaskReplyForwarder>.Instance
        );

    private void SetupDelivery(HttpStatusCode status, Action<string, Guid, MailboxDeliveryRequest>? capture = null) =>
        _client
            .Setup(x =>
                x.DeliverToMailbox(
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns<string, Guid, MailboxDeliveryRequest, CancellationToken>(
                (ns, mailboxId, request, _) =>
                {
                    capture?.Invoke(ns, mailboxId, request);
                    bool accepted = status is HttpStatusCode.Accepted or HttpStatusCode.OK;
                    return Task.FromResult(
                        new MailboxDeliveryResult(
                            status,
                            accepted
                                ? new MailboxDeliveryResponse
                                {
                                    MailboxId = mailboxId,
                                    Idx = 0,
                                    IdempotencyKey = request.IdempotencyKey,
                                    AcceptedAt = DateTimeOffset.UtcNow,
                                }
                                : null,
                            accepted ? null : "engine says no"
                        )
                    );
                }
            );

    [Fact]
    public async Task ForwardReply_DeliversToTheMailboxTheAddressNames()
    {
        var mailboxId = Guid.CreateVersion7();
        string? observedNamespace = null;
        Guid observedMailboxId = default;
        MailboxDeliveryRequest? observedRequest = null;
        SetupDelivery(
            HttpStatusCode.Accepted,
            (ns, id, request) =>
            {
                observedNamespace = ns;
                observedMailboxId = id;
                observedRequest = request;
            }
        );

        await CreateSut().ForwardReply(mailboxId, TaskType, Body, Key);

        Assert.Equal("ttd/test-app", observedNamespace);
        Assert.Equal(mailboxId, observedMailboxId);
        Assert.NotNull(observedRequest);
    }

    [Fact]
    public async Task ForwardReply_SendsTheSourcesMessageIdAsTheDeliveryIdempotencyKey()
    {
        var mailboxId = Guid.CreateVersion7();
        MailboxDeliveryRequest? observedRequest = null;
        SetupDelivery(HttpStatusCode.Accepted, (_, _, request) => observedRequest = request);

        await CreateSut().ForwardReply(mailboxId, TaskType, Body, Key);

        Assert.Equal(Key, observedRequest!.IdempotencyKey);
    }

    [Fact]
    public async Task ForwardReply_WrapsTheBodyInTheIntegrityEnvelopeBoundToTheWholeMessage()
    {
        var mailboxId = Guid.CreateVersion7();
        MailboxDeliveryRequest? observedRequest = null;
        SetupDelivery(HttpStatusCode.Accepted, (_, _, request) => observedRequest = request);

        await CreateSut().ForwardReply(mailboxId, TaskType, Body, Key);

        string sealedPayload = observedRequest!.Payload;
        Assert.NotEqual(Body, sealedPayload);
        Assert.Equal(Body, _envelope.Unwrap(sealedPayload, mailboxId, TaskType, Key));
        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            _envelope.Unwrap(sealedPayload, Guid.CreateVersion7(), TaskType, Key)
        );
        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            _envelope.Unwrap(sealedPayload, mailboxId, "someOtherServiceTask", Key)
        );
        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            _envelope.Unwrap(sealedPayload, mailboxId, TaskType, "fiks-message-999")
        );
    }

    [Theory]
    // 202 appended it; 200 replayed one already delivered — both success, or every at-least-once channel
    // in front of this would need its own deduplication.
    [InlineData(HttpStatusCode.Accepted)]
    [InlineData(HttpStatusCode.OK)]
    public async Task ForwardReply_AppendedOrAlreadyHeld_Succeeds(HttpStatusCode status)
    {
        SetupDelivery(status);

        await CreateSut().ForwardReply(Guid.CreateVersion7(), TaskType, Body, Key);
    }

    [Fact]
    public async Task ForwardReply_OffersTheMessageWithoutFirstAskingWhetherTheMailboxIsOpen()
    {
        // The idempotency lookup runs before the closed check, so a kept message replays as 200 even after
        // closure — a forwarder that dead-lettered on "closed" would drop a message the platform holds.
        SetupDelivery(HttpStatusCode.OK);
        var mailboxId = Guid.CreateVersion7();

        await CreateSut().ForwardReply(mailboxId, TaskType, Body, Key);

        _client.Verify(
            x =>
                x.DeliverToMailbox(
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _client.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound, ServiceTaskReplyForwardOutcome.Unroutable, false)]
    // Always too late, never too early: a 409 can only mean the mailbox is closed.
    [InlineData(HttpStatusCode.Conflict, ServiceTaskReplyForwardOutcome.Late, false)]
    [InlineData(HttpStatusCode.RequestEntityTooLarge, ServiceTaskReplyForwardOutcome.PayloadTooLarge, false)]
    // Not transient: the mailbox's log length never goes back down.
    [InlineData(HttpStatusCode.TooManyRequests, ServiceTaskReplyForwardOutcome.MailboxFull, false)]
    // The one answer a forwarder must never retry: the submission itself was wrong.
    [InlineData(HttpStatusCode.BadRequest, ServiceTaskReplyForwardOutcome.Rejected, false)]
    // An undocumented 4xx that is still a verdict on these bytes: a replay reaches it again.
    [InlineData(HttpStatusCode.UnprocessableEntity, ServiceTaskReplyForwardOutcome.Rejected, false)]
    // The undocumented 4xx family that is *not* a verdict on the message but a condition in front of the
    // engine. Dead-lettering these destroys business messages that would have been accepted minutes later.
    [InlineData(HttpStatusCode.Unauthorized, ServiceTaskReplyForwardOutcome.EngineUnavailable, true)]
    [InlineData(HttpStatusCode.Forbidden, ServiceTaskReplyForwardOutcome.EngineUnavailable, true)]
    [InlineData(HttpStatusCode.RequestTimeout, ServiceTaskReplyForwardOutcome.EngineUnavailable, true)]
    [InlineData(HttpStatusCode.InternalServerError, ServiceTaskReplyForwardOutcome.EngineUnavailable, true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, ServiceTaskReplyForwardOutcome.EngineUnavailable, true)]
    public async Task ForwardReply_NonSuccess_SurfacesToTheCaller(
        HttpStatusCode status,
        ServiceTaskReplyForwardOutcome expectedOutcome,
        bool expectedTransient
    )
    {
        var mailboxId = Guid.CreateVersion7();
        SetupDelivery(status);

        var exception = await Assert.ThrowsAsync<ServiceTaskReplyForwardException>(() =>
            CreateSut().ForwardReply(mailboxId, TaskType, Body, Key)
        );

        Assert.Equal(expectedOutcome, exception.Outcome);
        Assert.Equal(expectedTransient, exception.IsTransient);
        Assert.Equal(mailboxId, exception.MailboxId);
        Assert.Equal(Key, exception.IdempotencyKey);
    }

    [Fact]
    public async Task ForwardReply_MailboxClosed_IsLateAndCannotTellWhichWayItClosed()
    {
        // One case, not a theory over both reasons: the engine answers 409 either way, naming which only in
        // the ProblemDetails sentence — which must travel through to the dead-letter record.
        const string detail = "Mailbox was closed at its deadline and no longer accepts deliveries.";
        _client
            .Setup(x =>
                x.DeliverToMailbox(
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MailboxDeliveryResult(HttpStatusCode.Conflict, Body: null, ErrorDetail: detail));

        var exception = await Assert.ThrowsAsync<ServiceTaskReplyForwardException>(() =>
            CreateSut().ForwardReply(Guid.CreateVersion7(), TaskType, Body, Key)
        );

        Assert.Equal(ServiceTaskReplyForwardOutcome.Late, exception.Outcome);
        Assert.False(exception.IsTransient);
        Assert.Contains(detail, exception.Message, StringComparison.Ordinal);
        Assert.Contains("never that the message came too early", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ForwardReply_EngineUnreachable_SurfacesAsTransient()
    {
        var mailboxId = Guid.CreateVersion7();
        _client
            .Setup(x =>
                x.DeliverToMailbox(
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("connection refused"));

        var exception = await Assert.ThrowsAsync<ServiceTaskReplyForwardException>(() =>
            CreateSut().ForwardReply(mailboxId, TaskType, Body, Key)
        );

        Assert.Equal(ServiceTaskReplyForwardOutcome.EngineUnavailable, exception.Outcome);
        Assert.True(exception.IsTransient);
        Assert.IsType<HttpRequestException>(exception.InnerException);
    }

    [Fact]
    public async Task ForwardReply_NoSigningCodeAvailable_SurfacesAsTransientWithoutDelivering()
    {
        var mailboxId = Guid.CreateVersion7();

        var exception = await Assert.ThrowsAsync<ServiceTaskReplyForwardException>(() =>
            CreateSut(TestMailboxDeliveryEnvelope.CreateWithoutSecret()).ForwardReply(mailboxId, TaskType, Body, Key)
        );

        Assert.Equal(ServiceTaskReplyForwardOutcome.SigningUnavailable, exception.Outcome);
        Assert.True(exception.IsTransient);
        Assert.Equal(mailboxId, exception.MailboxId);
        Assert.IsType<WorkflowCallbackSecretNotFoundException>(exception.InnerException);
    }

    [Fact]
    public async Task ForwardReply_AcceptedButUnreadableResponseBody_StillSucceeds()
    {
        _client
            .Setup(x =>
                x.DeliverToMailbox(
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MailboxDeliveryResult(HttpStatusCode.Accepted, Body: null, ErrorDetail: null));

        await CreateSut().ForwardReply(Guid.CreateVersion7(), TaskType, Body, Key);
    }

    [Fact]
    public async Task ForwardReply_CallerCancelled_PropagatesCancellation()
    {
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        _client
            .Setup(x =>
                x.DeliverToMailbox(
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new OperationCanceledException());

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            CreateSut().ForwardReply(Guid.CreateVersion7(), TaskType, Body, Key, cancellationToken: cts.Token)
        );
    }

    [Fact]
    public async Task ForwardReply_NonCancellationFailureRacingACancelledToken_IsStillClassified()
    {
        // A filter reading only the token let a genuine failure racing an unrelated cancellation escape
        // unwrapped; the filter tests the exception too.
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        _client
            .Setup(x =>
                x.DeliverToMailbox(
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("connection refused"));

        var exception = await Assert.ThrowsAsync<ServiceTaskReplyForwardException>(() =>
            CreateSut().ForwardReply(Guid.CreateVersion7(), TaskType, Body, Key, cancellationToken: cts.Token)
        );

        Assert.Equal(ServiceTaskReplyForwardOutcome.EngineUnavailable, exception.Outcome);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ForwardReply_WithoutAnIdempotencyKey_IsACallerError(string? idempotencyKey)
    {
        await Assert.ThrowsAnyAsync<ArgumentException>(() =>
            CreateSut().ForwardReply(Guid.CreateVersion7(), TaskType, Body, idempotencyKey!)
        );
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ForwardReply_WithoutSayingWhichTaskAnswersIt_IsACallerError(string? serviceTaskType)
    {
        await Assert.ThrowsAnyAsync<ArgumentException>(() =>
            CreateSut().ForwardReply(Guid.CreateVersion7(), serviceTaskType!, Body, Key)
        );
    }

    [Fact]
    public async Task ForwardReply_WithoutABody_IsACallerError()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            CreateSut().ForwardReply(Guid.CreateVersion7(), TaskType, null!, Key)
        );
    }

    [Fact]
    public async Task ForwardReply_WithAnEmptyBody_IsDelivered()
    {
        MailboxDeliveryRequest? observedRequest = null;
        SetupDelivery(HttpStatusCode.Accepted, (_, _, request) => observedRequest = request);
        var mailboxId = Guid.CreateVersion7();

        await CreateSut().ForwardReply(mailboxId, TaskType, string.Empty, Key);

        Assert.Equal(string.Empty, _envelope.Unwrap(observedRequest!.Payload, mailboxId, TaskType, Key));
    }
}
