using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class WorkflowQueryTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.ResetAsync();

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
        var fetched = await repo.GetWorkflow(workflow.DatabaseId, TestContext.Current.CancellationToken);

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
        var fetched = await repo.GetWorkflow(Guid.NewGuid(), TestContext.Current.CancellationToken);

        // Assert
        Assert.Null(fetched);
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
        var results = await repo.GetActiveWorkflows(namespaceA, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(2, results.Count);
        Assert.All(results, wf => Assert.Equal(namespaceA, wf.Namespace));
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
        var results = await repo.GetActiveWorkflows(ns, TestContext.Current.CancellationToken);

        // Assert
        Assert.Single(results);
        Assert.Equal(PersistentItemStatus.Enqueued, results[0].Status);
    }

    [Fact]
    public async Task GetActiveWorkflows_NoMatches_ReturnsEmptyList()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Act
        var results = await repo.GetActiveWorkflows(
            Guid.NewGuid().ToString("N"),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Empty(results);
    }

    // ── GetFinishedWorkflows ───────────────────────────────────────────

    [Fact]
    public async Task GetFinishedWorkflows_BeforeCursor_ExcludesNewerWorkflows()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf1 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await SetUpdatedAt(context, wf1.DatabaseId, DateTimeOffset.UtcNow.AddMinutes(-30));

        var wf2 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        var middleTime = DateTimeOffset.UtcNow.AddMinutes(-15);
        await SetUpdatedAt(context, wf2.DatabaseId, middleTime);

        var wf3 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await SetUpdatedAt(context, wf3.DatabaseId, DateTimeOffset.UtcNow.AddMinutes(-5));

        // Act — pass `before` = middleTime, which should exclude wf3 and wf2 (UpdatedAt >= before is excluded)
        var results = await repo.GetFinishedWorkflows(
            [PersistentItemStatus.Completed],
            before: middleTime,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert — only wf1 is older than middleTime
        Assert.Single(results);
        Assert.Equal(wf1.DatabaseId, results[0].DatabaseId);
    }

    [Fact]
    public async Task GetFinishedWorkflows_Since_ExcludesOlderWorkflows()
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
        var results = await repo.GetFinishedWorkflows(
            [PersistentItemStatus.Completed],
            since: middleTime,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert — wf2 and wf3 are newer than middleTime
        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task GetFinishedWorkflows_RetriedOnly_FiltersToRetriedSteps()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf1 = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        // Set one step to have RequeueCount > 0
        await context.Database.ExecuteSqlAsync(
            $"""UPDATE "Steps" SET "RequeueCount" = 3 WHERE "JobId" = {wf1.DatabaseId}""",
            TestContext.Current.CancellationToken
        );

        // Act
        var results = await repo.GetFinishedWorkflows(
            [PersistentItemStatus.Completed],
            retriedOnly: true,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(results);
        Assert.Equal(wf1.DatabaseId, results[0].DatabaseId);
    }

    [Fact]
    public async Task GetFinishedWorkflows_FilterByAppLabel_ReturnsOnlyMatchingApp()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, app: "app-alpha");
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, app: "app-beta");

        // Act
        var results = await repo.GetFinishedWorkflows(
            [PersistentItemStatus.Completed],
            labelFilters: new Dictionary<string, string> { ["app"] = "app-alpha" },
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(results);
        Assert.Equal("app-alpha", results[0].Labels?["app"]);
    }

    [Fact]
    public async Task GetFinishedWorkflows_FilterByOrgLabel_ReturnsOnlyMatchingOrg()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, org: "org-x");
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, org: "org-y");

        // Act
        var results = await repo.GetFinishedWorkflows(
            [PersistentItemStatus.Completed],
            labelFilters: new Dictionary<string, string> { ["org"] = "org-x" },
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(results);
        Assert.Equal("org-x", results[0].Labels?["org"]);
    }

    [Fact]
    public async Task GetFinishedWorkflows_FilterByMultipleLabels_ReturnsOnlyMatching()
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
        var results = await repo.GetFinishedWorkflows(
            [PersistentItemStatus.Completed],
            labelFilters: new Dictionary<string, string> { ["org"] = "org-m", ["app"] = "app-m" },
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(results);
        Assert.Equal("app-m", results[0].Labels?["app"]);
    }

    [Fact]
    public async Task GetFinishedWorkflows_SearchByNamespace_Matches()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var targetNamespace = Guid.NewGuid().ToString("N");
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: targetNamespace);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        // Act — search by a partial namespace ID substring
        var searchTerm = targetNamespace[..8];
        var results = await repo.GetFinishedWorkflows(
            [PersistentItemStatus.Completed],
            search: searchTerm,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(results);
        Assert.Equal(targetNamespace, results[0].Namespace);
    }

    [Fact]
    public async Task GetFinishedWorkflows_SearchByOperationId_Matches()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        // Act — the default OperationId from WorkflowTestHelper is "next"
        var results = await repo.GetFinishedWorkflows(
            [PersistentItemStatus.Completed],
            search: "next",
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Single(results);
        Assert.Equal(wf.DatabaseId, results[0].DatabaseId);
    }

    [Fact]
    public async Task GetFinishedWorkflows_NoMatches_ReturnsEmptyListAndZeroCount()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Act
        var (workflows, totalCount) = await repo.GetFinishedWorkflowsWithCount(
            [PersistentItemStatus.Completed],
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Empty(workflows);
        Assert.Equal(0, totalCount);
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
            $"""UPDATE "Workflows" SET "UpdatedAt" = {utc} WHERE "Id" = {workflowId}""",
            TestContext.Current.CancellationToken
        );
        await context.Database.ExecuteSqlAsync(
            $"""UPDATE "Steps" SET "UpdatedAt" = {utc} WHERE "JobId" = {workflowId}""",
            TestContext.Current.CancellationToken
        );
    }
}
