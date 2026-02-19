using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests.Helpers;

internal static class WorkflowTestHelper
{
    public static WorkflowEnqueueRequest CreateRequest(
        Guid? instanceGuid = null,
        WorkflowType type = WorkflowType.AppProcessChange,
        IEnumerable<long>? dependencies = null,
        string? idempotencyKey = null,
        string org = "ttd",
        string app = "test-app",
        int instanceOwnerPartyId = 50001234,
        DateTimeOffset? startAt = null
    )
    {
        instanceGuid ??= Guid.NewGuid();
        idempotencyKey ??= Guid.NewGuid().ToString();

        return new WorkflowEnqueueRequest(
            IdempotencyKey: idempotencyKey,
            OperationId: "next",
            InstanceInformation: new InstanceInformation
            {
                Org = org,
                App = app,
                InstanceOwnerPartyId = instanceOwnerPartyId,
                InstanceGuid = instanceGuid.Value,
            },
            Actor: new Actor { UserIdOrOrgNumber = "12345" },
            CreatedAt: DateTimeOffset.UtcNow,
            StartAt: startAt,
            Steps: [new StepRequest { Command = new Command.AppCommand("test-step") }],
            Type: type,
            Dependencies: dependencies
        );
    }

    public static async Task<Workflow> InsertAndSetStatus(
        IEngineRepository repository,
        EngineDbContext context,
        PersistentItemStatus status,
        Guid? instanceGuid = null,
        WorkflowType finalType = WorkflowType.AppProcessChange,
        IEnumerable<long>? dependencies = null,
        string? idempotencyKey = null
    )
    {
        // Insert as Generic to bypass constraint checks
        var request = CreateRequest(
            instanceGuid: instanceGuid,
            type: WorkflowType.Generic,
            dependencies: dependencies,
            idempotencyKey: idempotencyKey
        );

        var workflow = await repository.AddWorkflow(request);

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
