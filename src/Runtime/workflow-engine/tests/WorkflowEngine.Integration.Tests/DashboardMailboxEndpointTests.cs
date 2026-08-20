using System.Net;
using System.Text.Json;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers <c>GET /dashboard/mailboxes</c> end to end: what a mailbox looks like on the wire, and the two caps
/// that keep the read proportional to what a dashboard is showing rather than to what the engine retains.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class DashboardMailboxEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private const string Collection = "instance-42";

    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _helpers = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private Task<MailboxResponse> MintMailbox(string key = "step-1", string? collectionKey = Collection) =>
        _client.MintMailbox(key, TimeSpan.FromHours(1), collectionKey);

    private Task<Guid> EnqueueReceiver(Guid mailboxId) => EnqueueReceiverCore(mailboxId, "/never-called");

    private async Task<Guid> EnqueueReceiverCore(Guid mailboxId, string hook)
    {
        var request = _helpers.CreateWorkflow("receiver", [_helpers.CreateWebhookStep(hook)]) with
        {
            Mailbox = new MailboxReference { Id = mailboxId },
        };
        var accepted = await _client.Enqueue(_helpers.CreateEnqueueRequest(request));
        return Assert.Single(accepted.Workflows).DatabaseId;
    }

    private async Task<JsonElement> Read(string? collectionKeys = Collection, string? ns = null)
    {
        using var client = fixture.CreateEngineClient();
        var query = collectionKeys is null
            ? "/dashboard/mailboxes"
            : $"/dashboard/mailboxes?collectionKeys={Uri.EscapeDataString(collectionKeys)}";
        if (ns is not null)
            query += $"&namespace={Uri.EscapeDataString(ns)}";

        using var response = await client.GetAsync(query, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return JsonDocument.Parse(json).RootElement.Clone();
    }

    private static JsonElement Mailboxes(JsonElement root) => root.GetProperty("mailboxes");

    [Fact]
    public async Task ReadsAMailboxWithItsDeadlineBothCountersAndItsReceiverLinked()
    {
        // Asserted on the wire rather than on the DTO: an operator's whole view of an exchange is this payload, so
        // a field that never serializes is a field that does not exist. The receiver's workflow id is the link.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(mailbox.Id);
        var delivery = await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");

        var read = Assert.Single(Mailboxes(await Read()).EnumerateArray().ToList());

        Assert.Equal(mailbox.Id, read.GetProperty("id").GetGuid());
        Assert.Equal(Collection, read.GetProperty("collectionKey").GetString());
        Assert.Equal("Open", read.GetProperty("status").GetString());
        Assert.Equal(mailbox.Deadline, read.GetProperty("deadline").GetDateTimeOffset());
        Assert.Equal(1, read.GetProperty("nextIdx").GetInt64());
        Assert.Equal(1, read.GetProperty("nextSeq").GetInt64());
        Assert.Equal(0, read.GetProperty("unconsumedDeliveries").GetInt64());

        var position = Assert.Single(read.GetProperty("positions").EnumerateArray().ToList());
        Assert.Equal(delivery.Idx, position.GetProperty("position").GetInt64());
        Assert.Equal("consumed", position.GetProperty("state").GetString());
        Assert.Equal("source-msg-1", position.GetProperty("deliveryKey").GetString());
        Assert.Equal(receiver, position.GetProperty("receiverWorkflowId").GetGuid());
        Assert.True(position.TryGetProperty("heldAt", out _));
        Assert.True(position.GetProperty("parkedForSeconds").GetDouble() >= 0);
    }

    [Fact]
    public async Task AReceiveWorkflowsCardCarriesTheMailboxItReadsFrom_AndAnOrdinaryOnesDoesNot()
    {
        // The other half of the link. Without it a chains surface can render the mailbox block but cannot tell
        // which of the rows under it is the receiver.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(mailbox.Id);
        var ordinary = Assert
            .Single(
                (
                    await _client.Enqueue(
                        _helpers.CreateEnqueueRequest(
                            _helpers.CreateWorkflow("ordinary", [_helpers.CreateWebhookStep("/hook")])
                        )
                    )
                ).Workflows
            )
            .DatabaseId;
        await _client.WaitForWorkflowStatus(ordinary, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            "/dashboard/query?status=COMPLETED,HELD",
            TestContext.Current.CancellationToken
        );
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        using var doc = JsonDocument.Parse(json);
        var workflows = doc.RootElement.GetProperty("workflows").EnumerateArray().ToList();

        var receiverCard = workflows.Single(w => w.GetProperty("databaseId").GetGuid() == receiver);
        Assert.Equal(mailbox.Id, receiverCard.GetProperty("mailboxId").GetGuid());

        // Absent rather than null: the dashboard payload omits every null field, so an ordinary workflow's card
        // is byte-for-byte what it was before mailboxes existed.
        var ordinaryCard = workflows.Single(w => w.GetProperty("databaseId").GetGuid() == ordinary);
        Assert.False(ordinaryCard.TryGetProperty("mailboxId", out _));
    }

    [Fact]
    public async Task AClosedMailboxIsStillRead_WithItsReasonAndItsReleasedReceiver()
    {
        // How a concluded exchange reads, and the reason the endpoint does not filter to open mailboxes: under a
        // finished collection this is the ordinary case, and the one somebody looks up afterwards.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(mailbox.Id);
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Held);
        await _client.CloseMailbox(mailbox.Id);

        var read = Assert.Single(Mailboxes(await Read()).EnumerateArray().ToList());

        Assert.Equal("Disposed", read.GetProperty("status").GetString());
        Assert.Equal("Request", read.GetProperty("disposedReason").GetString());
        var position = Assert.Single(read.GetProperty("positions").EnumerateArray().ToList());
        Assert.Equal("closed", position.GetProperty("state").GetString());
        Assert.False(position.TryGetProperty("deliveryKey", out _));
    }

    [Fact]
    public async Task AMintedMailboxWithNoLogYet_ReadsBackWithAnEmptyPositionsArray()
    {
        // The window the whole outbound leg of an exchange sits in. An empty array rather than an omitted field,
        // so a card can render "no messages yet" without special-casing a missing property.
        await MintMailbox();

        var read = Assert.Single(Mailboxes(await Read()).EnumerateArray().ToList());

        Assert.Equal(JsonValueKind.Array, read.GetProperty("positions").ValueKind);
        Assert.Equal(0, read.GetProperty("positions").GetArrayLength());
    }

    [Fact]
    public async Task NamingNoCollections_ReadsNothing_AndNamingOnlyOtherCollectionsReadsNothingEither()
    {
        // A request naming no collections is what a chains surface with nothing on screen sends, and it must be
        // an empty answer rather than every mailbox in the engine.
        await MintMailbox();

        foreach (var keys in new[] { null, "", "some-other-collection" })
        {
            var root = await Read(collectionKeys: keys);
            Assert.Equal(0, Mailboxes(root).GetArrayLength());

            // The shape is the same either way, so a card never has to branch on a missing property.
            Assert.Equal(0, root.GetProperty("truncatedCollections").GetArrayLength());
        }
    }

    [Fact]
    public async Task AFullCollectionWindowIsReportedAsTruncated_ByName()
    {
        // The endpoint's per-collection cap is 10, and a collection with more history must say so rather than
        // quietly return its newest ten: a mailbox missing from a group is otherwise indistinguishable from an
        // exchange that never had one. Reported per collection, because the limit is per collection.
        for (var i = 0; i < 11; i++)
            await MintMailbox($"step-{i}");

        var root = await Read();

        Assert.Equal(10, Mailboxes(root).GetArrayLength());
        Assert.Equal(
            [Collection],
            root.GetProperty("truncatedCollections").EnumerateArray().Select(k => k.GetString())
        );
    }

    [Fact]
    public async Task ACollectionThatFitsIsNotReportedAsTruncated()
    {
        // The other side of the boundary, and the one that keeps the flag meaningful: every ordinary collection
        // holds a handful of mailboxes and must come back with nothing to report.
        await MintMailbox("step-a");
        await MintMailbox("step-b");

        var root = await Read();

        Assert.Equal(2, Mailboxes(root).GetArrayLength());
        Assert.Equal(0, root.GetProperty("truncatedCollections").GetArrayLength());
    }

    [Fact]
    public async Task SeveralCollectionsAreReadInOneCall_AndTheNamespaceFilterApplies()
    {
        // One call per render pass rather than one per group, which keeps an open dashboard from issuing a burst
        // of reads every time the live section ticks.
        var first = await MintMailbox("step-a", "collection-a");
        var second = await MintMailbox("step-b", "collection-b");

        var both = Mailboxes(await Read("collection-a,collection-b")).EnumerateArray().ToList();
        Assert.Equal(2, both.Count);
        Assert.Contains(first.Id, both.Select(m => m.GetProperty("id").GetGuid()));
        Assert.Contains(second.Id, both.Select(m => m.GetProperty("id").GetGuid()));

        // Both mailboxes live in the fixture's namespace, so a different one reads nothing.
        Assert.Equal(0, Mailboxes(await Read("collection-a,collection-b", ns: "ttd/other-app")).GetArrayLength());
    }
}
