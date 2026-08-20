using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers the delivery HTTP surface end to end: the whole response matrix, the idempotency rule that
/// decides which half of it a call lands in, and what the mailbox reports once messages exist.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class MailboxDeliveryEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private Task<MailboxResponse> MintMailbox(string key = "step-1") => _client.MintMailbox(key, TimeSpan.FromHours(1));

    private static EngineSettings Settings(EngineAppFixture<Program> f) =>
        f.Services.GetRequiredService<IOptions<EngineSettings>>().Value;

    #region Acceptance

    [Fact]
    public async Task DeliverToMailbox_FirstMessage_Returns202WithItsPosition()
    {
        var mailbox = await MintMailbox();

        using var response = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = """{"status":"received"}""" }
        );

        // 202 is the engine's marker for "this call effected the state change", the same distinction the mint
        // draws between 201 and 200.
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var delivery = await response.Content.ReadFromJsonAsync<MailboxDeliveryResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(delivery);
        Assert.Equal(mailbox.Id, delivery.MailboxId);
        Assert.Equal(0L, delivery.Idx);
        Assert.Equal("source-msg-1", delivery.IdempotencyKey);
        Assert.NotEqual(default, delivery.AcceptedAt);
    }

    [Fact]
    public async Task DeliverToMailbox_SeveralMessages_TakeConsecutivePositions()
    {
        var mailbox = await MintMailbox();

        var first = await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        var second = await _client.DeliverToMailbox(mailbox.Id, "source-msg-2");
        var third = await _client.DeliverToMailbox(mailbox.Id, "source-msg-3");

        Assert.Equal([0L, 1L, 2L], new[] { first.Idx, second.Idx, third.Idx });
    }

    [Fact]
    public async Task DeliverToMailbox_ConcurrentMessages_AssignEveryPositionExactlyOnce()
    {
        // The gapless log through the whole stack rather than at the repository alone: nothing between the HTTP
        // handler and the row lock reorders, batches, or drops a position.
        const int Count = 12;
        var mailbox = await MintMailbox();

        var deliveries = await Task.WhenAll(
            Enumerable.Range(0, Count).Select(i => _client.DeliverToMailbox(mailbox.Id, $"source-msg-{i}"))
        );

        Assert.Equal(Enumerable.Range(0, Count).Select(i => (long)i), deliveries.Select(d => d.Idx).Order());

        var read = await _client.GetMailbox(mailbox.Id);
        Assert.NotNull(read);
        Assert.Equal((long)Count, read.NextIdx);
    }

    #endregion

    #region Idempotent replay

    [Fact]
    public async Task DeliverToMailbox_ReplayedKey_Returns200WithTheOriginalPosition()
    {
        var mailbox = await MintMailbox();
        var first = await _client.DeliverToMailbox(mailbox.Id, "source-msg-1", """{"v":1}""");

        // A forwarder retrying a transport failure resends, and may well resend a rebuilt body.
        using var response = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = """{"v":2}""" }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var replay = await response.Content.ReadFromJsonAsync<MailboxDeliveryResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(replay);
        Assert.Equal(first.Idx, replay.Idx);
        Assert.Equal(first.AcceptedAt, replay.AcceptedAt);

        // The log did not grow: a replay occupies no position of its own.
        var read = await _client.GetMailbox(mailbox.Id);
        Assert.NotNull(read);
        Assert.Equal(1L, read.NextIdx);
    }

    [Fact]
    public async Task DeliverToMailbox_ReplayedKeyAfterTheMailboxClosed_StillReturns200()
    {
        // The "accepted versus kept" rule at the HTTP boundary, and the one place a forwarder could be badly
        // misled: 409 tells it to dead-letter, and this message is sitting at position 0 waiting for its
        // receiver.
        var mailbox = await MintMailbox();
        var accepted = await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await _client.CloseMailbox(mailbox.Id);

        using var response = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = "{}" }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var replay = await response.Content.ReadFromJsonAsync<MailboxDeliveryResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(replay);
        Assert.Equal(accepted.Idx, replay.Idx);
    }

    #endregion

    #region Refusals

    [Fact]
    public async Task DeliverToMailbox_ClosedMailbox_Returns409SayingHowItClosed()
    {
        var mailbox = await MintMailbox();
        await _client.CloseMailbox(mailbox.Id);

        using var response = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = "{}" }
        );

        // 409 always means too late, never too early: an early delivery is accepted and parks at its position, so
        // a forwarder can dead-letter a 409 without inspecting anything else.
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var problem = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("by request", problem, StringComparison.Ordinal);
    }

    [Fact]
    public async Task DeliverToMailbox_RefusedDelivery_IsRefusedAgainAndStoredNeitherTime()
    {
        // The converse of the replay rule: what the engine refused, it keeps refusing, and neither attempt
        // claimed the key or a position.
        var mailbox = await MintMailbox();
        await _client.CloseMailbox(mailbox.Id);

        var request = new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = "{}" };
        using var first = await _client.DeliverToMailboxRaw(mailbox.Id, request);
        using var second = await _client.DeliverToMailboxRaw(mailbox.Id, request);

        Assert.Equal(HttpStatusCode.Conflict, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);

        var read = await _client.GetMailbox(mailbox.Id);
        Assert.NotNull(read);
        Assert.Equal(0L, read.NextIdx);
    }

    [Fact]
    public async Task DeliverToMailbox_UnknownIdOrForeignNamespace_Returns404()
    {
        var mailbox = await MintMailbox();
        var request = new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = "{}" };

        using var unknown = await _client.DeliverToMailboxRaw(Guid.CreateVersion7(), request);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);

        using var foreign = await _client.DeliverToMailboxRaw(mailbox.Id, request, ns: "other-org-other-app");
        Assert.Equal(HttpStatusCode.NotFound, foreign.StatusCode);

        var read = await _client.GetMailbox(mailbox.Id);
        Assert.NotNull(read);
        Assert.Equal(0L, read.NextIdx);
    }

    [Fact]
    public async Task DeliverToMailbox_PayloadOverTheCap_Returns413()
    {
        // The cap is refused rather than truncated: a receiver reading half a message is worse than a forwarder
        // learning its message will not fit.
        var mailbox = await MintMailbox();
        var oversized = new string('x', Settings(fixture).MaxMailboxPayloadSize + 1);

        using var response = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = oversized }
        );

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);

        var read = await _client.GetMailbox(mailbox.Id);
        Assert.NotNull(read);
        Assert.Equal(0L, read.NextIdx);
    }

    [Fact]
    public async Task DeliverToMailbox_PayloadCapCountsUtf8Bytes_NotCharacters()
    {
        // The cap bounds what is stored, so it is measured on the encoded form.
        var mailbox = await MintMailbox();
        var cap = Settings(fixture).MaxMailboxPayloadSize;

        // Three bytes each in UTF-8, so this is over the cap while being under it in characters.
        var multiByte = new string('あ', (cap / 2) + 1);
        using var refused = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = multiByte }
        );
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, refused.StatusCode);

        var accepted = await _client.DeliverToMailbox(mailbox.Id, "source-msg-2", new string('x', (cap / 2) + 1));
        Assert.Equal(0L, accepted.Idx);
    }

    [Fact]
    public async Task DeliverToMailbox_LogAtItsCap_Returns429()
    {
        // Fill the log to the configured cap. It is the only bound on what a single mailbox can cost, because
        // deliveries deliberately skip the admission gate an ordinary enqueue must pass.
        var cap = Settings(fixture).MaxMailboxLogLength;
        var mailbox = await MintMailbox();
        for (int i = 0; i < cap; i++)
            await _client.DeliverToMailbox(mailbox.Id, $"source-msg-{i}");

        using var response = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "one-too-many", Payload = "{}" }
        );

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);

        // A different mailbox is unaffected — the bound is per mailbox.
        var other = await MintMailbox("step-2");
        await _client.DeliverToMailbox(other.Id, "source-msg-0");
    }

    [Theory]
    [InlineData("""{ "idempotencyKey": "  ", "payload": "{}" }""")]
    [InlineData("""{ "payload": "{}" }""")]
    [InlineData("""{ "idempotencyKey": "source-msg-1" }""")]
    [InlineData("""{ "idempotencyKey": "source-msg-1", "payload": null }""")]
    public async Task DeliverToMailbox_MalformedRequest_Returns400(string json)
    {
        var mailbox = await MintMailbox();

        using var response = await _client.DeliverToMailboxRaw(mailbox.Id, json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeliverToMailbox_OverLongIdempotencyKey_Returns400()
    {
        // The key is varchar(200). Length has to be caught before the delivery reaches the database, because
        // Postgres answers an over-long value with SQLSTATE 22001, which the retry classifier reads as
        // transient.
        var mailbox = await MintMailbox();

        using var response = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = new string('k', 201), Payload = "{}" }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    #endregion

    #region What the mailbox reports

    [Fact]
    public async Task GetMailbox_AfterDeliveries_ReportsTheRealCountersAndUnconsumedCount()
    {
        var mailbox = await MintMailbox();
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-2");
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");

        var read = await _client.GetMailbox(mailbox.Id);

        // The counters describe positions, not calls: three requests, two positions, and both of them messages
        // that arrived with nobody enqueued to read them.
        Assert.NotNull(read);
        Assert.Equal(2L, read.NextIdx);
        Assert.Equal(0L, read.NextSeq);
        Assert.Equal(2L, read.UnconsumedDeliveries);
    }

    [Fact]
    public async Task GetMailbox_AfterClosing_StillReportsWhatArrived()
    {
        // What the operator sees when an exchange ends with messages nobody read. The rows stay readable until
        // retention purges them.
        var mailbox = await MintMailbox();
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await _client.CloseMailbox(mailbox.Id);

        var read = await _client.GetMailbox(mailbox.Id);

        Assert.NotNull(read);
        Assert.Equal(MailboxStatus.Disposed, read.Status);
        Assert.Equal(1L, read.NextIdx);
        Assert.Equal(1L, read.UnconsumedDeliveries);
    }

    #endregion

    #region Telemetry

    [Fact]
    public async Task DeliveriesAreCountedForEveryOutcome_IncludingTheOnesRefusedBeforeTheDatabase()
    {
        var mailbox = await MintMailbox();
        var closed = await MintMailbox("step-closed");
        await _client.CloseMailbox(closed.Id);

        using var collector = new TelemetryCollector();

        async Task Refuse(Guid mailboxId, MailboxDeliveryRequest request) =>
            (await _client.DeliverToMailboxRaw(mailboxId, request)).Dispose();

        // One call per outcome the endpoint can answer with, except log_full, which costs a hundred deliveries.
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await Refuse(Guid.CreateVersion7(), new() { IdempotencyKey = "source-msg-1", Payload = "{}" });
        await Refuse(closed.Id, new() { IdempotencyKey = "source-msg-1", Payload = "{}" });
        await Refuse(
            mailbox.Id,
            new()
            {
                IdempotencyKey = "source-msg-2",
                Payload = new string('x', Settings(fixture).MaxMailboxPayloadSize + 1),
            }
        );
        await Refuse(mailbox.Id, new() { IdempotencyKey = "   ", Payload = "{}" });

        // A storm of oversized or misaddressed forwards has to be visible in the mailbox metrics, not only in
        // HTTP status codes, which is why the refusals are counted too.
        var measurements = collector.GetMeasurements("engine.mailboxes.deliveries.received");
        var byOutcome = measurements
            .GroupBy(m => (string)m.Tags.Single(t => t.Key == "outcome").Value!)
            .ToDictionary(g => g.Key, g => g.Sum(m => Convert.ToInt64(m.Value, CultureInfo.InvariantCulture)));

        Assert.Equal(
            new Dictionary<string, long>
            {
                ["accepted"] = 1,
                ["duplicate"] = 1,
                ["not_found"] = 1,
                ["closed"] = 1,
                ["too_large"] = 1,
                ["invalid"] = 1,
            },
            byOutcome
        );
    }

    #endregion
}
