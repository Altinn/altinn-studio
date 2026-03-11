using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Repository.Tests.Fixtures;

internal static class WorkflowTestHelper
{
    public static async Task<BatchEnqueueResult[]> EnqueueWorkflows(
        IEngineRepository repository,
        WorkflowRequestMetadata metadata,
        IReadOnlyList<WorkflowRequest> workflows,
        string? idempotencyKey = null,
        string tenantId = "test-tenant",
        Dictionary<string, string>? labels = null
    )
    {
        var request = new WorkflowEnqueueRequest
        {
            TenantId = tenantId,
            IdempotencyKey = idempotencyKey ?? Guid.NewGuid().ToString("N"),
            Labels = labels,
            Workflows = workflows,
        };

        var buffered = new BufferedEnqueueRequest(
            request,
            metadata,
            Guid.NewGuid().ToByteArray(),
            new TaskCompletionSource<Guid[]>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

        return await repository.BatchEnqueueWorkflowsAsync([buffered], TestContext.Current.CancellationToken);
    }

    public static async Task<Workflow> EnqueueWorkflow(
        IEngineRepository repository,
        EngineDbContext context,
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        string? idempotencyKey = null,
        string tenantId = "test-tenant",
        Dictionary<string, string>? labels = null
    )
    {
        var results = await EnqueueWorkflows(
            repository,
            metadata,
            [request],
            idempotencyKey,
            tenantId: tenantId,
            labels: labels
        );
        var result = Assert.Single(results);
        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);

        var workflowId = Assert.Single(result.WorkflowIds!);
        var entity = await context
            .Workflows.Include(w => w.Steps)
            .Include(w => w.Dependencies)
            .Include(w => w.Links)
            .SingleAsync(w => w.Id == workflowId, TestContext.Current.CancellationToken);

        return entity.ToDomainModel();
    }

    public static (
        WorkflowRequest Request,
        WorkflowRequestMetadata Metadata,
        string TenantId,
        Dictionary<string, string> Labels
    ) CreateRequest(
        string? tenantId = null,
        IEnumerable<Guid>? dependencies = null,
        IEnumerable<Guid>? links = null,
        string org = "ttd",
        string app = "test-app",
        DateTimeOffset? startAt = null
    )
    {
        tenantId ??= Guid.NewGuid().ToString("N");

        var request = new WorkflowRequest
        {
            OperationId = "next",
            Steps =
            [
                new StepRequest
                {
                    Command = new CommandDefinition { Type = "app", OperationId = "test-step" },
                },
            ],
            StartAt = startAt,
            DependsOn = dependencies?.Select(id => (WorkflowRef)id).ToList(),
            Links = links?.Select(id => (WorkflowRef)id).ToList(),
        };

        var metadata = new WorkflowRequestMetadata(DateTimeOffset.UtcNow, null);
        var labels = new Dictionary<string, string> { ["org"] = org, ["app"] = app };

        return (request, metadata, tenantId, labels);
    }

    public static async Task<Workflow> InsertAndSetStatus(
        IEngineRepository repository,
        EngineDbContext context,
        PersistentItemStatus status,
        string? tenantId = null,
        IEnumerable<Guid>? dependencies = null,
        string org = "ttd",
        string app = "test-app"
    )
    {
        var (request, metadata, tid, labels) = CreateRequest(
            tenantId: tenantId,
            dependencies: dependencies,
            org: org,
            app: app
        );

        var workflow = await EnqueueWorkflow(repository, context, request, metadata, tenantId: tid, labels: labels);

        // Update status directly via raw SQL
        var statusInt = (int)status;
        await context.Database.ExecuteSqlAsync(
            $"""UPDATE "Workflows" SET "Status" = {statusInt} WHERE "Id" = {workflow.DatabaseId}""",
            TestContext.Current.CancellationToken
        );

        return workflow;
    }
}
