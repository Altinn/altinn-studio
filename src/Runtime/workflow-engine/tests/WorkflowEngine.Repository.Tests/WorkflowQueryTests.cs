using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class WorkflowQueryTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    // ── GetWorkflow(Guid) ──────────────────────────────────────────────

    [Fact]
    public async Task GetWorkflow_ById_ReturnsWorkflowWithRelations()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        // Act
        var fetched = await repo.GetWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.NotNull(fetched);
        Assert.Equal(workflow.DatabaseId, fetched.DatabaseId);
        Assert.NotEmpty(fetched.Steps);
        Assert.Equal(workflow.OperationId, fetched.OperationId);
    }

    [Fact]
    public async Task GetWorkflow_ById_NonExistentId_ReturnsNull()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Act
        var fetched = await repo.GetWorkflow(Guid.NewGuid(), "nonexistent-ns", TestContext.Current.CancellationToken);

        // Assert
        Assert.Null(fetched);
    }

    [Fact]
    public async Task GetWorkflow_ById_WrongNamespace_ReturnsNull()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        var fetched = await repo.GetWorkflow(
            workflow.DatabaseId,
            "wrong-namespace",
            TestContext.Current.CancellationToken
        );

        Assert.Null(fetched);
    }

    [Fact]
    public async Task GetWorkflowStatus_WrongNamespace_ReturnsNull()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        var status = await repo.GetWorkflowStatus(
            workflow.DatabaseId,
            "wrong-namespace",
            TestContext.Current.CancellationToken
        );

        Assert.Null(status);
    }

    [Fact]
    public async Task RequestCancellation_WrongNamespace_ReturnsFalse()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        var updated = await repo.RequestCancellation(
            workflow.DatabaseId,
            "wrong-namespace",
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        Assert.False(updated);
    }

    [Fact]
    public async Task ResumeWorkflow_WrongNamespace_ReturnsEmpty()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed);

        var resumed = await repo.ResumeWorkflow(
            workflow.DatabaseId,
            "wrong-namespace",
            DateTimeOffset.UtcNow,
            cascade: false,
            TestContext.Current.CancellationToken
        );

        Assert.Empty(resumed);
    }

    [Fact]
    public async Task SkipBackoff_WrongNamespace_ReturnsFalse()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Requeued);

        var updated = await repo.SkipBackoff(
            workflow.DatabaseId,
            "wrong-namespace",
            TestContext.Current.CancellationToken
        );

        Assert.False(updated);
    }

    // ── GetActiveWorkflows ─────────────────────────────────────

    [Fact]
    public async Task GetActiveWorkflows_ReturnsOnlyMatchingNamespace()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var namespaceA = Guid.NewGuid().ToString("N");
        var namespaceB = Guid.NewGuid().ToString("N");

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: namespaceA);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: namespaceA);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: namespaceB);

        // Act
        var results = await repo.GetActiveWorkflows(
            pageSize: 100,
            ns: namespaceA,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(2, results.Workflows.Count);
        Assert.All(results.Workflows, wf => Assert.Equal(namespaceA, wf.Namespace));
    }

    [Fact]
    public async Task GetActiveWorkflows_ExcludesTerminalWorkflows()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: ns);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);

        // Act
        var results = await repo.GetActiveWorkflows(
            pageSize: 100,
            ns: ns,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(results.Workflows);
        Assert.Equal(PersistentItemStatus.Enqueued, results.Workflows[0].Status);
    }

    [Fact]
    public async Task GetActiveWorkflows_NoMatches_ReturnsEmptyList()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Act
        var results = await repo.GetActiveWorkflows(
            pageSize: 100,
            ns: Guid.NewGuid().ToString("N"),
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Empty(results.Workflows);
    }

    // ── QueryWorkflows (cursor pagination, ID DESC) ────────────────────

    [Fact]
    public async Task QueryWorkflows_CursorPagination_ExcludesItemsBeforeCursor()
    {
        // Arrange — insert 3 completed workflows (UUIDv7 IDs are chronologically ordered)
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        var wf1 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);
        _ = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);
        _ = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);

        // Act — first page of 2 (ID DESC: wf3, wf2), then cursor to next page
        var page1 = await repo.QueryWorkflows(
            pageSize: 2,
            statuses: [PersistentItemStatus.Completed],
            namespaceFilter: ns,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(2, page1.Workflows.Count);
        Assert.NotNull(page1.NextCursor);

        var page2 = await repo.QueryWorkflows(
            pageSize: 2,
            statuses: [PersistentItemStatus.Completed],
            cursor: page1.NextCursor,
            namespaceFilter: ns,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert — page2 should contain only wf1 (the oldest)
        Assert.Single(page2.Workflows);
        Assert.Equal(wf1.DatabaseId, page2.Workflows[0].DatabaseId);
        Assert.Null(page2.NextCursor);
    }

    [Fact]
    public async Task QueryWorkflows_Since_ExcludesOlderWorkflows()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf1 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await SetUpdatedAt(context, wf1.DatabaseId, DateTimeOffset.UtcNow.AddMinutes(-30));

        var middleTime = DateTimeOffset.UtcNow.AddMinutes(-15);

        var wf2 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await SetUpdatedAt(context, wf2.DatabaseId, DateTimeOffset.UtcNow.AddMinutes(-10));

        var wf3 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await SetUpdatedAt(context, wf3.DatabaseId, DateTimeOffset.UtcNow.AddMinutes(-5));

        // Act
        var result = await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed],
            since: middleTime,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert — wf2 and wf3 are newer than middleTime
        Assert.Equal(2, result.Workflows.Count);
    }

    [Fact]
    public async Task QueryWorkflows_RetriedOnly_FiltersToRetriedSteps()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf1 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        // Set one step to have RequeueCount > 0
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET requeue_count = 3 WHERE job_id = {wf1.DatabaseId}",
            TestContext.Current.CancellationToken
        );

        // Act
        var result = await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed],
            retriedOnly: true,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(result.Workflows);
        Assert.Equal(wf1.DatabaseId, result.Workflows[0].DatabaseId);
    }

    [Fact]
    public async Task QueryWorkflows_FilterByAppLabel_ReturnsOnlyMatchingApp()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, app: "app-alpha");
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, app: "app-beta");

        // Act
        var result = await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed],
            labelFilters: new Dictionary<string, string> { ["app"] = "app-alpha" },
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(result.Workflows);
        Assert.Equal("app-alpha", result.Workflows[0].Labels?["app"]);
    }

    [Fact]
    public async Task QueryWorkflows_FilterByOrgLabel_ReturnsOnlyMatchingOrg()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, org: "org-x");
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, org: "org-y");

        // Act
        var result = await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed],
            labelFilters: new Dictionary<string, string> { ["org"] = "org-x" },
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(result.Workflows);
        Assert.Equal("org-x", result.Workflows[0].Labels?["org"]);
    }

    [Fact]
    public async Task QueryWorkflows_FilterByMultipleLabels_ReturnsOnlyMatching()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            org: "org-m",
            app: "app-m"
        );
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            org: "org-m",
            app: "app-n"
        );

        // Act — filter by both org and app labels
        var result = await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed],
            labelFilters: new Dictionary<string, string> { ["org"] = "org-m", ["app"] = "app-m" },
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(result.Workflows);
        Assert.Equal("app-m", result.Workflows[0].Labels?["app"]);
    }

    [Fact]
    public async Task QueryWorkflows_SearchByNamespace_Matches()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var targetNamespace = Guid.NewGuid().ToString("N");
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: targetNamespace);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        // Act — search by a partial namespace ID substring
        var searchTerm = targetNamespace[..8];
        var result = await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed],
            search: searchTerm,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(result.Workflows);
        Assert.Equal(targetNamespace, result.Workflows[0].Namespace);
    }

    [Fact]
    public async Task QueryWorkflows_SearchByOperationId_Matches()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        // Act — the default OperationId from WorkflowTestHelper is "next"
        var result = await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed],
            search: "next",
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(result.Workflows);
        Assert.Equal(wf.DatabaseId, result.Workflows[0].DatabaseId);
    }

    [Fact]
    public async Task QueryWorkflows_NoMatches_ReturnsEmptyListAndZeroCount()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Act
        var result = await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed],
            includeTotalCount: true,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Empty(result.Workflows);
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task QueryWorkflows_IteratingAllPages_ReturnsCompleteNonOverlappingSet()
    {
        // Arrange — insert 11 completed workflows, page size 4 → cursor iteration (4, 4, 3)
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");
        const int totalWorkflows = 11;
        const int pageSize = 4;

        var insertedIds = new HashSet<Guid>();
        for (var i = 0; i < totalWorkflows; i++)
        {
            var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);
            insertedIds.Add(wf.DatabaseId);
        }

        // Act — iterate through all pages using cursor (ID DESC = newest first)
        var collectedIds = new List<Guid>();
        Guid? cursor = null;

        while (true)
        {
            var result = await repo.QueryWorkflows(
                pageSize: pageSize,
                statuses: [PersistentItemStatus.Completed],
                cursor: cursor,
                includeTotalCount: true,
                namespaceFilter: ns,
                cancellationToken: TestContext.Current.CancellationToken
            );

            Assert.Equal(totalWorkflows, result.TotalCount);
            collectedIds.AddRange(result.Workflows.Select(w => w.DatabaseId));

            if (result.NextCursor is null)
                break;

            cursor = result.NextCursor;
        }

        // Assert
        Assert.Equal(totalWorkflows, collectedIds.Count);
        Assert.Equal(totalWorkflows, collectedIds.Distinct().Count()); // no duplicates
        Assert.True(insertedIds.SetEquals(collectedIds)); // complete set

        // Verify DESC ordering — each ID should be smaller than the previous (UUIDv7)
        for (var i = 1; i < collectedIds.Count; i++)
            Assert.True(collectedIds[i] < collectedIds[i - 1], "Expected ID DESC ordering");
    }

    // ── GetActiveWorkflows (cursor pagination) ─────────────────────────

    [Fact]
    public async Task GetActiveWorkflows_Paginated_ReturnsCorrectTotalCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        for (var i = 0; i < 7; i++)
            await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: ns);

        var result = await repo.GetActiveWorkflows(
            pageSize: 3,
            includeTotalCount: true,
            ns: ns,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(7, result.TotalCount);
        Assert.Equal(3, result.Workflows.Count);
        Assert.NotNull(result.NextCursor);
    }

    [Fact]
    public async Task GetActiveWorkflows_Paginated_IteratingAllPages_ReturnsCompleteNonOverlappingSet()
    {
        // Arrange — insert 13 workflows, page size 5 → cursor iteration
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");
        const int totalWorkflows = 13;
        const int pageSize = 5;

        var insertedIds = new HashSet<Guid>();
        for (var i = 0; i < totalWorkflows; i++)
        {
            var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: ns);
            insertedIds.Add(wf.DatabaseId);
        }

        // Act — iterate through all pages using cursor
        var collectedIds = new List<Guid>();
        Guid? cursor = null;
        int? reportedTotal = null;

        while (true)
        {
            var result = await repo.GetActiveWorkflows(
                pageSize: pageSize,
                cursor: cursor,
                includeTotalCount: true,
                ns: ns,
                cancellationToken: TestContext.Current.CancellationToken
            );

            reportedTotal = result.TotalCount;
            collectedIds.AddRange(result.Workflows.Select(w => w.DatabaseId));

            if (result.NextCursor is null)
                break;

            cursor = result.NextCursor;
        }

        // Assert
        Assert.Equal(totalWorkflows, reportedTotal);
        Assert.Equal(totalWorkflows, collectedIds.Count);
        Assert.Equal(totalWorkflows, collectedIds.Distinct().Count()); // no duplicates
        Assert.True(insertedIds.SetEquals(collectedIds)); // complete set
    }

    [Fact]
    public async Task GetActiveWorkflows_Paginated_EmptyResult_ReturnsZeroTotalCount()
    {
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        var result = await repo.GetActiveWorkflows(
            pageSize: 10,
            includeTotalCount: true,
            ns: ns,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Empty(result.Workflows);
        Assert.Equal(0, result.TotalCount);
        Assert.Null(result.NextCursor);
    }

    [Fact]
    public async Task GetActiveWorkflows_Paginated_CursorBeyondLastItem_ReturnsEmpty()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        for (var i = 0; i < 3; i++)
            await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: ns);

        // Use a max GUID as cursor — should be beyond all items
        var result = await repo.GetActiveWorkflows(
            pageSize: 10,
            cursor: Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff"),
            includeTotalCount: true,
            ns: ns,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Empty(result.Workflows);
        Assert.Equal(3, result.TotalCount);
        Assert.Null(result.NextCursor);
    }

    [Fact]
    public async Task GetActiveWorkflows_Paginated_ExcludesTerminalWorkflows()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: ns);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: ns);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed, ns: ns);

        var result = await repo.GetActiveWorkflows(
            pageSize: 25,
            includeTotalCount: true,
            ns: ns,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Workflows.Count);
        Assert.All(result.Workflows, wf => Assert.Equal(PersistentItemStatus.Enqueued, wf.Status));
    }

    // ── GetScheduledWorkflows (cursor pagination) ──────────────────────

    [Fact]
    public async Task GetScheduledWorkflows_IteratingAllPages_ReturnsCompleteNonOverlappingSet()
    {
        // Arrange — insert 9 scheduled workflows (future StartAt), page size 4 → cursor iteration (4, 4, 1)
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");
        const int totalWorkflows = 9;
        const int pageSize = 4;

        var insertedIds = new HashSet<Guid>();
        for (var i = 0; i < totalWorkflows; i++)
        {
            var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest(
                ns: ns,
                startAt: DateTimeOffset.UtcNow.AddHours(1)
            );
            var wf = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata, ns: ns);
            insertedIds.Add(wf.DatabaseId);
        }

        // Act — iterate through all pages using cursor
        var collectedIds = new List<Guid>();
        Guid? cursor = null;

        while (true)
        {
            var result = await repo.GetScheduledWorkflows(
                pageSize: pageSize,
                cursor: cursor,
                ns: ns,
                cancellationToken: TestContext.Current.CancellationToken
            );

            collectedIds.AddRange(result.Workflows.Select(w => w.DatabaseId));

            if (result.NextCursor is null)
                break;

            cursor = result.NextCursor;
        }

        // Assert
        Assert.Equal(totalWorkflows, collectedIds.Count);
        Assert.Equal(totalWorkflows, collectedIds.Distinct().Count()); // no duplicates
        Assert.True(insertedIds.SetEquals(collectedIds)); // complete set
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private static async Task SetUpdatedAt(
        Data.Context.EngineDbContext context,
        Guid workflowId,
        DateTimeOffset updatedAt
    )
    {
        var utc = updatedAt.UtcDateTime;
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET updated_at = {utc} WHERE id = {workflowId}",
            TestContext.Current.CancellationToken
        );
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET updated_at = {utc} WHERE job_id = {workflowId}",
            TestContext.Current.CancellationToken
        );
    }
}
