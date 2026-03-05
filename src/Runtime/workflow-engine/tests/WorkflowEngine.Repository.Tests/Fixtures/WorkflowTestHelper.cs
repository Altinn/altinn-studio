using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Repository.Tests.Fixtures;

internal static class WorkflowTestHelper
{
    public static async Task<BatchEnqueueResult[]> EnqueueWorkflows(
        IEngineNpgsqlRepository repository,
        WorkflowRequestMetadata metadata,
        IReadOnlyList<WorkflowRequest> workflows,
        string? idempotencyKey = null
    )
    {
        var request = new WorkflowEnqueueRequest
        {
            Actor = metadata.Actor,
            IdempotencyKey = idempotencyKey ?? Guid.NewGuid().ToString("N"),
            LockToken = metadata.InstanceLockKey,
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
        IEngineNpgsqlRepository repository,
        EngineDbContext context,
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        string? idempotencyKey = null
    )
    {
        var results = await EnqueueWorkflows(repository, metadata, [request], idempotencyKey);
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

    public static (WorkflowRequest Request, WorkflowRequestMetadata Metadata) CreateRequest(
        Guid? instanceGuid = null,
        IEnumerable<Guid>? dependencies = null,
        IEnumerable<Guid>? links = null,
        string org = "ttd",
        string app = "test-app",
        int instanceOwnerPartyId = 50001234,
        DateTimeOffset? startAt = null
    )
    {
        instanceGuid ??= Guid.NewGuid();

        var request = new WorkflowRequest
        {
            OperationId = "next",
            Steps = [new StepRequest { Command = new Command.AppCommand("test-step") }],
            StartAt = startAt,
            DependsOn = dependencies?.Select(id => (WorkflowRef)id).ToList(),
            Links = links?.Select(id => (WorkflowRef)id).ToList(),
        };

        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: new InstanceInformation
            {
                Org = org,
                App = app,
                InstanceOwnerPartyId = instanceOwnerPartyId,
                InstanceGuid = instanceGuid.Value,
            },
            Actor: new Actor { UserIdOrOrgNumber = "12345" },
            CreatedAt: DateTimeOffset.UtcNow,
            TraceContext: null,
            InstanceLockKey: null
        );

        return (request, metadata);
    }

    public static async Task<Workflow> InsertAndSetStatus(
        IEngineNpgsqlRepository repository,
        EngineDbContext context,
        PersistentItemStatus status,
        Guid? instanceGuid = null,
        IEnumerable<Guid>? dependencies = null,
        string org = "ttd",
        string app = "test-app"
    )
    {
        var (request, metadata) = CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: dependencies,
            org: org,
            app: app
        );

        var workflow = await EnqueueWorkflow(repository, context, request, metadata);

        // Update status directly via raw SQL
        var statusInt = (int)status;
        await context.Database.ExecuteSqlAsync(
            $"""UPDATE "Workflows" SET "Status" = {statusInt} WHERE "Id" = {workflow.DatabaseId}""",
            TestContext.Current.CancellationToken
        );

        return workflow;
    }
}
