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
        // The reply address the external system echoed back IS the mailbox id, so no separate correlation identity
        // is invented anywhere.
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

        // Namespace is {org}/{app} — the engine's isolation boundary — and the delivery rides the same
        // authenticated app→engine client the enqueue does.
        Assert.Equal("ttd/test-app", observedNamespace);
        Assert.Equal(mailboxId, observedMailboxId);
        Assert.NotNull(observedRequest);
    }

    [Fact]
    public async Task ForwardReply_SendsTheSourcesMessageIdAsTheDeliveryIdempotencyKey()
    {
        // The value the engine deduplicates on is also the value the handler reads back as
        // ServiceTaskReply.IdempotencyKey. The two must be the same string, or the platform's dedup and the
        // handler's dedup are about different things.
        var mailboxId = Guid.CreateVersion7();
        MailboxDeliveryRequest? observedRequest = null;
        SetupDelivery(HttpStatusCode.Accepted, (_, _, request) => observedRequest = request);

        await CreateSut().ForwardReply(mailboxId, TaskType, Body, Key);

        Assert.Equal(Key, observedRequest!.IdempotencyKey);
    }

    [Fact]
    public async Task ForwardReply_WrapsTheBodyInTheIntegrityEnvelopeBoundToTheWholeMessage()
    {
        // What travels is the envelope, not the raw body — and it must be this app's, minted for this mailbox,
        // this handler and this message id.
        var mailboxId = Guid.CreateVersion7();
        MailboxDeliveryRequest? observedRequest = null;
        SetupDelivery(HttpStatusCode.Accepted, (_, _, request) => observedRequest = request);

        await CreateSut().ForwardReply(mailboxId, TaskType, Body, Key);

        string sealedPayload = observedRequest!.Payload;
        Assert.NotEqual(Body, sealedPayload);
        Assert.Equal(Body, _envelope.Unwrap(sealedPayload, mailboxId, TaskType, Key));
        // Bound on all three: the same envelope opens against nothing else.
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
    // 202 means the message was appended; 200 means this key had already delivered one, which is what a
    // redelivery from the source — or a retry of this very call — looks like. Both are success, or every
    // at-least-once channel in front of this would need its own deduplication.
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
        // The accepted-versus-kept rule, from the forwarder's side. The engine looks up the idempotency key
        // *before* it checks whether the mailbox is closed, so a message it already holds replays as 200 even
        // after closure. A forwarder that read the status first and dead-lettered on "closed" would throw away
        // a message the platform is still holding for its receiver.
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
    // Always too late, never too early: deliveries precede receivers happily, so a 409 can only mean the
    // mailbox is closed.
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
        // A message nothing will process is not the forwarder's decision to swallow: the receiving channel is the
        // only thing that can dead-letter, report or drop the message it came from.
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
        // The two closure reasons are deliberately indistinguishable here, which is why this is one case and not a
        // theory over both: the engine answers 409 either way and names which only in the ProblemDetails
        // sentence. What this pins is that 409 is Late and settled, and that the engine's own words travel
        // through.
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
        // And it says so in words, because "too early" is the one thing a 409 can never mean here.
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
        // Sealing the message reads the app's callback code, which is missing while the secret is being mounted or
        // every code in it has expired. The caller is told in the one currency this API speaks.
        var mailboxId = Guid.CreateVersion7();

        var exception = await Assert.ThrowsAsync<ServiceTaskReplyForwardException>(() =>
            CreateSut(TestMailboxDeliveryEnvelope.CreateWithoutSecret()).ForwardReply(mailboxId, TaskType, Body, Key)
        );

        Assert.Equal(ServiceTaskReplyForwardOutcome.SigningUnavailable, exception.Outcome);
        Assert.True(exception.IsTransient);
        Assert.Equal(mailboxId, exception.MailboxId);
        Assert.IsType<WorkflowCallbackSecretNotFoundException>(exception.InnerException);
        // MockBehavior.Strict with no DeliverToMailbox setup: nothing was submitted.
    }

    [Fact]
    public async Task ForwardReply_AcceptedButUnreadableResponseBody_StillSucceeds()
    {
        // The status is the outcome; the body only names the assigned position for a log line. Reporting a failure
        // here would make the caller forward again for a message the engine has already taken.
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
        // A cancelled caller is not an undeliverable message — it must not be reported as one.
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
        // The narrow race an earlier review flagged: with a filter reading only the token, a genuine transport
        // failure that coincided with a cancellation escaped unwrapped. The filter tests the exception too.
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
        // The engine requires it — it is the whole of the deduplication story — so a caller with nothing to supply
        // has a bug rather than an undeliverable message.
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
        // The service task type is bound into the envelope, so a blank one would seal the message under a key no
        // handler derives. It is a constant in the calling code, so this is a bug to fail on.
        await Assert.ThrowsAnyAsync<ArgumentException>(() =>
            CreateSut().ForwardReply(Guid.CreateVersion7(), serviceTaskType!, Body, Key)
        );
    }

    [Fact]
    public async Task ForwardReply_WithoutABody_IsACallerError()
    {
        // An empty body is legitimate and delivered; a null one is a caller that has not decided what it is
        // forwarding.
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            CreateSut().ForwardReply(Guid.CreateVersion7(), TaskType, null!, Key)
        );
    }

    [Fact]
    public async Task ForwardReply_WithAnEmptyBody_IsDelivered()
    {
        // A message can carry its whole meaning in its arrival, and the handler reads an empty Payload rather
        // than a closure.
        MailboxDeliveryRequest? observedRequest = null;
        SetupDelivery(HttpStatusCode.Accepted, (_, _, request) => observedRequest = request);
        var mailboxId = Guid.CreateVersion7();

        await CreateSut().ForwardReply(mailboxId, TaskType, string.Empty, Key);

        Assert.Equal(string.Empty, _envelope.Unwrap(observedRequest!.Payload, mailboxId, TaskType, Key));
    }
}
