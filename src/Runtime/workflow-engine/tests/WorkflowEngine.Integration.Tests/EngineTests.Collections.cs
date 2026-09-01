using System.Net;
using System.Text.Json;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task ListCollections_ReturnsCollectionsForNamespace()
    {
        // Arrange — two batches under distinct collection keys materialize two collection rows.
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "col-1"
        );
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-b", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "col-2"
        );

        // Act
        var collections = await _client.ListCollections();

        // Assert
        Assert.Equal(2, collections.Count);
        Assert.Contains(collections, c => c.Key == "col-1");
        Assert.Contains(collections, c => c.Key == "col-2");
        Assert.All(collections, c => Assert.NotEmpty(c.Heads));

        // Contract: a stable enumeration (collation-defined key order, opaque cursor) — walking the
        // pages yields each collection exactly once.
        Assert.Equal(collections.Count, collections.Select(c => c.Key).Distinct().Count());

        // Contract: the health rollup is always populated on the list view.
        Assert.All(collections, c => Assert.NotNull(c.WorkflowCounts));
    }

    [Fact]
    public async Task ListCollections_WhenNoneExist_ReturnsNoContent()
    {
        // Arrange — enqueue a workflow without a collection key, so no collection row exists.
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            )
        );

        // Act
        using var response = await _client.ListCollectionsRaw();

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ListCollections_IsolatedByNamespace()
    {
        // Arrange — same collection key in two namespaces.
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            ns: "ns-a",
            collectionKey: "shared-key"
        );
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            ns: "ns-b",
            collectionKey: "shared-key"
        );

        // Act
        var nsA = await _client.ListCollections("ns-a");
        var nsB = await _client.ListCollections("ns-b");

        // Assert — each namespace sees only its own collection.
        Assert.Single(nsA);
        Assert.Single(nsB);
        Assert.Equal("ns-a", nsA[0].Namespace);
        Assert.Equal("ns-b", nsB[0].Namespace);
    }

    [Fact]
    public async Task ListCollections_PaginatesByKey()
    {
        // Arrange — three collections whose keys sort deterministically.
        foreach (var key in new[] { "page-a", "page-b", "page-c" })
        {
            await _client.Enqueue(
                _testHelpers.CreateEnqueueRequest(
                    _testHelpers.CreateWorkflow($"wf-{key}", [_testHelpers.CreateWebhookStep("/hook")])
                ),
                collectionKey: key
            );
        }

        // Act — walk the pages, round-tripping the opaque cursor.
        var page1 = await _client.ListCollectionsPaginated(pageSize: 2);
        var page2 = await _client.ListCollectionsPaginated(pageSize: 2, cursor: page1.NextCursor);

        // Assert — the enumeration order is collation-defined (not asserted); the contract is
        // pagination consistency: correct totals and page sizes, and the pages together cover
        // every collection exactly once (no duplicates, no gaps).
        Assert.Equal(3, page1.TotalCount);
        Assert.Equal(2, page1.Data.Count);
        Assert.NotNull(page1.NextCursor);

        Assert.Equal(3, page2.TotalCount);
        Assert.Single(page2.Data);
        Assert.Null(page2.NextCursor);

        var walked = page1.Data.Concat(page2.Data).Select(c => c.Key).ToList();
        Assert.Equal(3, walked.Distinct().Count());
        string[] expectedKeys = ["page-a", "page-b", "page-c"];
        Assert.Equivalent(expectedKeys, walked);
    }

    [Fact]
    public async Task ListCollections_KeyCombinedWithCursor_ReturnsBadRequest()
    {
        using var response = await _client.ListCollectionsRaw("?key=some-key&cursor=some-cursor");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ListCollections_KeyCombinedWithFailures_ReturnsBadRequest()
    {
        using var response = await _client.ListCollectionsRaw("?key=some-key&failures=any");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ListCollections_TooManyKeys_ReturnsBadRequest()
    {
        // Arrange — one key more than the default MaxPageSize (100). The contract is to reject,
        // never truncate: silently dropping keys from a health read is the failure class the
        // endpoint exists to fix.
        var queryString = "?" + string.Join("&", Enumerable.Range(0, 101).Select(i => $"key=k-{i}"));

        // Act
        using var response = await _client.ListCollectionsRaw(queryString);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ListCollections_UnknownFailuresValue_ReturnsBadRequest()
    {
        using var response = await _client.ListCollectionsRaw("?failures=bogus");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ListCollections_Annotate_ReportsUnmatchedKeys()
    {
        // Arrange — one real collection; the other requested key has no row.
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "annotate-real"
        );

        // Act
        var result = await _client.ListCollectionsPaginated(keys: ["annotate-real", "annotate-ghost"]);

        // Assert — the match is annotated, the miss is reported: absence must be distinguishable
        // from healthy (the collection could have been purged by retention).
        var collection = Assert.Single(result.Data);
        Assert.Equal("annotate-real", collection.Key);
        Assert.NotNull(collection.WorkflowCounts);
        Assert.NotNull(result.UnmatchedKeys);
        Assert.Equal(["annotate-ghost"], result.UnmatchedKeys.ToArray());
        Assert.Null(result.NextCursor);
    }

    [Fact]
    public async Task ListCollections_Annotate_AllKeysUnmatched_Returns200NotNoContent()
    {
        // Act — annotate mode with no matching rows must still answer 200 so unmatchedKeys is
        // explicit, unlike the 204 of an empty list/discover result.
        using var response = await _client.ListCollectionsRaw("?key=ghost-1&key=ghost-2");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await EngineApiClient.AssertSuccessAndDeserialize<WorkflowCollectionListResponse>(response);
        Assert.Empty(body.Data);
        Assert.Equal(0, body.TotalCount);
        Assert.NotNull(body.UnmatchedKeys);
        Assert.Equal(["ghost-1", "ghost-2"], body.UnmatchedKeys.ToArray());
    }

    [Fact]
    public async Task ListCollections_ListMode_OmitsUnmatchedKeys()
    {
        // Arrange
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "list-col"
        );

        // Act
        var result = await _client.ListCollectionsPaginated();

        // Assert — unmatchedKeys is an annotate-mode concept and absent elsewhere.
        Assert.Null(result.UnmatchedKeys);
    }

    [Fact]
    public async Task ListCollections_Rollup_CountsBucketsWithVisibilitySplitAndAbandonedExclusion()
    {
        // Arrange — one collection exercising every rollup bucket:
        //   ok             → Completed                       (remainder)
        //   fail-visible   → Failed, default directive       (failedVisible)
        //   dep-failed     → DependencyFailed via fail-visible (failedVisible)
        //   fail-invisible → Failed, IsHead=false            (failedInvisible)
        //   fail-abandon   → Failed then abandoned           (excluded from failed buckets, in total)
        //   scheduled      → Enqueued with future StartAt    (active)
        //   held-receiver  → Held on an open mailbox         (active — parked is not settled)
        fixture.WireMock.Reset();
        foreach (var path in new[] { "/fail-visible", "/fail-invisible", "/fail-abandon" })
        {
            fixture
                .WireMock.Given(Request.Create().WithPath(path).UsingAnyMethod())
                .AtPriority(1)
                .RespondWith(Response.Create().WithStatusCode(500));
        }
        // Catch-all at the lowest precedence (lower priority values win) so the failing paths above match first.
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .AtPriority(int.MaxValue)
            .RespondWith(Response.Create().WithStatusCode(200));

        // A receiver on an open mailbox is born Held, which the rollup must read as active: the
        // status is non-terminal (PersistentItemStatusMap.Incomplete), so it consumes admission
        // budget and gates its dependents even though nothing is executing it.
        var mailbox = await _client.MintMailbox("rollup-mailbox", TimeSpan.FromHours(1));

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("ok", [_testHelpers.CreateWebhookStep("/hook")]),
            _testHelpers.CreateWorkflow("fail-visible", [_testHelpers.CreateWebhookStep("/fail-visible")]),
            _testHelpers.CreateWorkflow(
                "dep-failed",
                [_testHelpers.CreateWebhookStep("/hook")],
                dependsOn: [(WorkflowRef)"fail-visible"]
            ),
            _testHelpers.CreateWorkflow(
                "fail-invisible",
                [_testHelpers.CreateWebhookStep("/fail-invisible")],
                isHead: false
            ),
            _testHelpers.CreateWorkflow("fail-abandon", [_testHelpers.CreateWebhookStep("/fail-abandon")]),
            _testHelpers.CreateWorkflow(
                "scheduled",
                [_testHelpers.CreateWebhookStep("/hook")],
                startAt: DateTimeOffset.UtcNow.AddHours(1)
            ),
            _testHelpers.CreateWorkflow("held-receiver", [_testHelpers.CreateWebhookStep("/hook")]) with
            {
                Mailbox = new MailboxReference { Id = mailbox.Id },
            },
        ]);
        var response = await _client.Enqueue(request, collectionKey: "rollup-col");
        var byRef = response.Workflows.ToDictionary(w => w.Ref!, w => w.DatabaseId);

        await _client.WaitForWorkflowStatus(byRef["ok"], PersistentItemStatus.Completed);
        await _client.WaitForWorkflowStatus(byRef["fail-visible"], PersistentItemStatus.Failed);
        await _client.WaitForWorkflowStatus(byRef["dep-failed"], PersistentItemStatus.DependencyFailed);
        await _client.WaitForWorkflowStatus(byRef["fail-invisible"], PersistentItemStatus.Failed);
        await _client.WaitForWorkflowStatus(byRef["fail-abandon"], PersistentItemStatus.Failed);
        await _client.AbandonWorkflow(byRef["fail-abandon"]);
        await _client.WaitForWorkflowStatus(byRef["held-receiver"], PersistentItemStatus.Held);

        // Act
        var result = await _client.ListCollectionsPaginated();

        // Assert
        var collection = Assert.Single(result.Data);
        Assert.Equal("rollup-col", collection.Key);
        var counts = collection.WorkflowCounts;
        Assert.NotNull(counts);
        Assert.Equal(7, counts.Total);
        Assert.Equal(2, counts.Active); // scheduled + held-receiver
        Assert.Equal(2, counts.FailedVisible); // fail-visible + dep-failed; fail-abandon written off
        Assert.Equal(1, counts.FailedInvisible); // fail-invisible

        // Explicit non-goal: the detail endpoint stays a frontier view and carries no rollup.
        using var detailResponse = await _client.GetCollectionRaw("rollup-col");
        var detailJson = await detailResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        using var detailDoc = JsonDocument.Parse(detailJson);
        Assert.False(detailDoc.RootElement.TryGetProperty("workflowCounts", out _));
    }

    [Fact]
    public async Task ListCollections_Discover_FiltersByFailureVisibility()
    {
        // Arrange — three collections: healthy, one visible failure, one invisible failure.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/discover-fail").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));
        // Catch-all at the lowest precedence (lower priority values win) so the failing path above matches first.
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .AtPriority(int.MaxValue)
            .RespondWith(Response.Create().WithStatusCode(200));

        var healthy = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-ok", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "disc-healthy"
        );
        var visible = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-vis", [_testHelpers.CreateWebhookStep("/discover-fail")])
            ),
            collectionKey: "disc-visible"
        );
        var invisible = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest([
                _testHelpers.CreateWorkflow("wf-ok-2", [_testHelpers.CreateWebhookStep("/hook")]),
                _testHelpers.CreateWorkflow(
                    "wf-invis",
                    [_testHelpers.CreateWebhookStep("/discover-fail")],
                    isHead: false
                ),
            ]),
            collectionKey: "disc-invisible"
        );

        await _client.WaitForWorkflowStatus(healthy.Workflows.Single().DatabaseId, PersistentItemStatus.Completed);
        await _client.WaitForWorkflowStatus(visible.Workflows.Single().DatabaseId, PersistentItemStatus.Failed);
        var invisibleIds = invisible.Workflows.ToDictionary(w => w.Ref!, w => w.DatabaseId);
        await _client.WaitForWorkflowStatus(invisibleIds["wf-ok-2"], PersistentItemStatus.Completed);
        await _client.WaitForWorkflowStatus(invisibleIds["wf-invis"], PersistentItemStatus.Failed);

        // Act
        var any = await _client.ListCollectionsPaginated(failures: "any");
        var visibleOnly = await _client.ListCollectionsPaginated(failures: "visible");
        var invisibleOnly = await _client.ListCollectionsPaginated(failures: "invisible");

        // Assert — discovery never reports the healthy collection, and splits on visibility.
        Assert.Equal(["disc-invisible", "disc-visible"], any.Data.Select(c => c.Key).ToArray());
        Assert.Equal(["disc-visible"], visibleOnly.Data.Select(c => c.Key).ToArray());
        Assert.Equal(["disc-invisible"], invisibleOnly.Data.Select(c => c.Key).ToArray());
    }

    [Fact]
    public async Task ListCollections_Discover_NoFailures_ReturnsNoContent()
    {
        // Arrange — a healthy collection only.
        var response = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "all-good"
        );
        await _client.WaitForWorkflowStatus(response.Workflows.Single().DatabaseId, PersistentItemStatus.Completed);

        // Act
        using var raw = await _client.ListCollectionsRaw("?failures=any");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, raw.StatusCode);
    }
}
