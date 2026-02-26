using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests.Fixtures;

internal static class WorkflowTestHelper
{
    public static (WorkflowRequest Request, WorkflowRequestMetadata Metadata) CreateRequest(
        Guid? instanceGuid = null,
        WorkflowType type = WorkflowType.AppProcessChange,
        IEnumerable<long>? dependencies = null,
        IEnumerable<long>? links = null,
        string org = "ttd",
        string app = "test-app",
        int instanceOwnerPartyId = 50001234,
        DateTimeOffset? startAt = null
    )
    {
        instanceGuid ??= Guid.NewGuid();

        var request = new WorkflowRequest
        {
            Ref = "test-workflow",
            OperationId = "next",
            Type = type,
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
        IEngineRepository repository,
        EngineDbContext context,
        PersistentItemStatus status,
        Guid? instanceGuid = null,
        WorkflowType finalType = WorkflowType.AppProcessChange,
        IEnumerable<long>? dependencies = null
    )
    {
        // Insert as Generic to bypass constraint checks
        var (request, metadata) = CreateRequest(
            instanceGuid: instanceGuid,
            type: WorkflowType.Generic,
            dependencies: dependencies
        );

        var workflow = await repository.AddWorkflow(request, metadata);

        // Update status and type directly via raw SQL
        var typeInt = (int)finalType;
        var statusInt = (int)status;
        await context.Database.ExecuteSqlAsync(
            $"""UPDATE "Workflows" SET "Status" = {statusInt}, "Type" = {typeInt} WHERE "Id" = {workflow.DatabaseId}""",
            TestContext.Current.CancellationToken
        );

        return workflow;
    }
}
