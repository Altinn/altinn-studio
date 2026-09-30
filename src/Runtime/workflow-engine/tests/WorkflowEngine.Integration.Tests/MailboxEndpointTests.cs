using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers the mailbox HTTP surface end to end: the mint and its idempotent replay, the read, and the
/// idempotent close.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class MailboxEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    #region Mint

    [Fact]
    public async Task MintMailbox_FreshKey_Returns201WithTheMintedMailbox()
    {
        using var response = await _client.MintMailboxRaw(
            new MailboxCreateRequest
            {
                IdempotencyKey = "step-1",
                Timeout = TimeSpan.FromDays(2),
                CollectionKey = "instance-1",
            }
        );

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var mailbox = await response.Content.ReadFromJsonAsync<MailboxResponse>(TestContext.Current.CancellationToken);
        Assert.NotNull(mailbox);
        Assert.NotEqual(Guid.Empty, mailbox.Id);
        Assert.Equal("step-1", mailbox.IdempotencyKey);
        Assert.Equal("instance-1", mailbox.CollectionKey);
        Assert.Equal(TimeSpan.FromDays(2), mailbox.Timeout);
        Assert.Equal(MailboxStatus.Open, mailbox.Status);
        Assert.Equal(mailbox.CreatedAt + mailbox.Timeout, mailbox.Deadline, TimeSpan.FromMilliseconds(1));

        Assert.Equal(
            $"/api/v1/{EngineApiClient.DefaultNamespace}/mailboxes/{mailbox.Id}",
            response.Headers.Location?.ToString()
        );
    }

    [Fact]
    public async Task MintMailbox_ReplayedKey_Returns200WithTheSameMailbox()
    {
        var first = await _client.MintMailbox("step-1", TimeSpan.FromDays(2));

        using var response = await _client.MintMailboxRaw(
            new MailboxCreateRequest { IdempotencyKey = "step-1", Timeout = TimeSpan.FromDays(5) }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var replay = await response.Content.ReadFromJsonAsync<MailboxResponse>(TestContext.Current.CancellationToken);
        Assert.NotNull(replay);
        Assert.Equal(first.Id, replay.Id);
        Assert.Equal(first.Deadline, replay.Deadline);
    }

    [Theory]
    [InlineData("00:00:00")]
    [InlineData("-01:00:00")]
    public async Task MintMailbox_NonPositiveTimeout_Returns400(string timeout)
    {
        using var response = await _client.MintMailboxRaw(
            $$"""{ "idempotencyKey": "step-1", "timeout": "{{timeout}}" }"""
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MintMailbox_TimeoutAboveTheCap_Returns400()
    {
        using var response = await _client.MintMailboxRaw(
            new MailboxCreateRequest { IdempotencyKey = "step-1", Timeout = TimeSpan.FromDays(9999) }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MintMailbox_MissingIdempotencyKey_Returns400()
    {
        using var response = await _client.MintMailboxRaw("""{ "idempotencyKey": "  ", "timeout": "01:00:00" }""");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MintMailbox_OverLongIdempotencyKey_Returns400()
    {
        using var response = await _client.MintMailboxRaw(
            new MailboxCreateRequest { IdempotencyKey = new string('k', 201), Timeout = TimeSpan.FromHours(1) }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MintMailbox_OverLongCollectionKey_Returns400()
    {
        using var response = await _client.MintMailboxRaw(
            new MailboxCreateRequest
            {
                IdempotencyKey = "step-1",
                Timeout = TimeSpan.FromHours(1),
                CollectionKey = new string('c', 201),
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MintMailbox_EmptyCollectionKey_Returns400()
    {
        using var response = await _client.MintMailboxRaw(
            new MailboxCreateRequest
            {
                IdempotencyKey = "step-1",
                Timeout = TimeSpan.FromHours(1),
                CollectionKey = "  ",
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MintMailbox_CollectionAtItsCap_Returns429()
    {
        var cap = fixture.Services.GetRequiredService<IOptions<EngineSettings>>().Value.MaxOpenMailboxesPerCollection;
        for (int i = 0; i < cap; i++)
            await _client.MintMailbox($"step-{i}", TimeSpan.FromHours(1), collectionKey: "full-instance");

        using var response = await _client.MintMailboxRaw(
            new MailboxCreateRequest
            {
                IdempotencyKey = "one-too-many",
                Timeout = TimeSpan.FromHours(1),
                CollectionKey = "full-instance",
            }
        );

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);

        await _client.MintMailbox("elsewhere", TimeSpan.FromHours(1), collectionKey: "other-instance");
    }

    [Fact]
    public async Task MintMailbox_SameKeyInAnotherNamespace_MintsItsOwnMailbox()
    {
        var mine = await _client.MintMailbox("step-1", TimeSpan.FromHours(1));

        var theirs = await _client.MintMailbox("step-1", TimeSpan.FromHours(1), ns: "other-org-other-app");

        Assert.NotEqual(mine.Id, theirs.Id);
    }

    #endregion

    #region Read

    [Fact]
    public async Task GetMailbox_ReportsStatusDeadlineCountersAndUnpairedCount()
    {
        var minted = await _client.MintMailbox("step-1", TimeSpan.FromHours(6), collectionKey: "instance-1");

        var read = await _client.GetMailbox(minted.Id);

        Assert.NotNull(read);
        Assert.Equal(MailboxStatus.Open, read.Status);
        Assert.Equal(minted.Deadline, read.Deadline);
        Assert.Equal(0L, read.NextIdx);
        Assert.Equal(0L, read.NextSeq);

        Assert.Equal(0L, read.UnpairedDeliveries);
    }

    [Fact]
    public async Task GetMailbox_EmitsUnpairedDeliveriesOnTheWire()
    {
        // Asserted against the raw JSON: UnpairedDeliveries is a computed get-only property, so a typed
        // round-trip recomputes it client-side and would pass even if the server never emitted the field.
        var minted = await _client.MintMailbox("step-1", TimeSpan.FromHours(1));

        using var response = await _client.GetMailboxRaw(minted.Id);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        using var document = JsonDocument.Parse(json);
        Assert.True(
            document.RootElement.TryGetProperty("unpairedDeliveries", out var unpaired),
            $"The mailbox response did not carry unpairedDeliveries: {json}"
        );
        Assert.Equal(0, unpaired.GetInt64());
    }

    [Fact]
    public async Task GetMailbox_UnknownIdOrForeignNamespace_Returns404()
    {
        var minted = await _client.MintMailbox("step-1", TimeSpan.FromHours(1));

        using var unknown = await _client.GetMailboxRaw(Guid.CreateVersion7());
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);

        using var foreign = await _client.GetMailboxRaw(minted.Id, ns: "other-org-other-app");
        Assert.Equal(HttpStatusCode.NotFound, foreign.StatusCode);
    }

    #endregion

    #region Close

    [Fact]
    public async Task CloseMailbox_OpenMailbox_Returns202WithTheDisposal()
    {
        var minted = await _client.MintMailbox("step-1", TimeSpan.FromHours(1));

        using var response = await _client.CloseMailboxRaw(minted.Id);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var closed = await response.Content.ReadFromJsonAsync<MailboxResponse>(TestContext.Current.CancellationToken);
        Assert.NotNull(closed);
        Assert.Equal(MailboxStatus.Disposed, closed.Status);
        Assert.Equal(MailboxDisposedReason.Request, closed.DisposedReason);
        Assert.NotNull(closed.DisposedAt);
    }

    [Fact]
    public async Task CloseMailbox_Repeat_Returns200WithTheOriginalDisposedAt()
    {
        var minted = await _client.MintMailbox("step-1", TimeSpan.FromHours(1));
        var first = await _client.CloseMailbox(minted.Id);

        using var response = await _client.CloseMailboxRaw(minted.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var repeat = await response.Content.ReadFromJsonAsync<MailboxResponse>(TestContext.Current.CancellationToken);
        Assert.NotNull(repeat);
        Assert.Equal(first.DisposedAt, repeat.DisposedAt);
        Assert.Equal(MailboxDisposedReason.Request, repeat.DisposedReason);
    }

    [Fact]
    public async Task CloseMailbox_ThenRead_ShowsTheMailboxAsDisposed()
    {
        var minted = await _client.MintMailbox("step-1", TimeSpan.FromHours(1));
        await _client.CloseMailbox(minted.Id);

        var read = await _client.GetMailbox(minted.Id);

        Assert.NotNull(read);
        Assert.Equal(MailboxStatus.Disposed, read.Status);
    }

    [Fact]
    public async Task CloseMailbox_UnknownIdOrForeignNamespace_Returns404()
    {
        var minted = await _client.MintMailbox("step-1", TimeSpan.FromHours(1));

        using var unknown = await _client.CloseMailboxRaw(Guid.CreateVersion7());
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);

        using var foreign = await _client.CloseMailboxRaw(minted.Id, ns: "other-org-other-app");
        Assert.Equal(HttpStatusCode.NotFound, foreign.StatusCode);

        var stillOpen = await _client.GetMailbox(minted.Id);
        Assert.NotNull(stillOpen);
        Assert.Equal(MailboxStatus.Open, stillOpen.Status);
    }

    #endregion

    #region Telemetry

    [Fact]
    public async Task MintAndClose_EmitTheirCounters_AndReplaysDoNot()
    {
        using var collector = new TelemetryCollector();

        var minted = await _client.MintMailbox("step-1", TimeSpan.FromHours(1));
        await _client.MintMailbox("step-1", TimeSpan.FromHours(1));
        await _client.CloseMailbox(minted.Id);
        await _client.CloseMailbox(minted.Id);

        Assert.Equal(1, collector.GetCounterTotal("engine.mailboxes.created"));

        var closures = collector.GetMeasurements("engine.mailboxes.closed");
        var closure = Assert.Single(closures);
        Assert.Equal(1L, closure.Value);
        Assert.Contains(closure.Tags, t => t.Key == "reason" && (string?)t.Value == "request");
    }

    #endregion
}
