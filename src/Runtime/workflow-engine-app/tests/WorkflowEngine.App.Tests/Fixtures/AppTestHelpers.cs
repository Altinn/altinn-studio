using System.Text.Json;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.App.Tests.Fixtures;

/// <summary>
/// AppCommand-specific test helpers extending the base <see cref="TestHelpers"/>.
/// </summary>
internal sealed class AppTestHelpers(AppTestFixture fixture)
{
    private readonly TestHelpers _base = new(fixture);

    /// <summary>
    /// Creates an AppCommand step with the given command key.
    /// </summary>
    public StepRequest CreateAppCommandStep(
        string command,
        string? payload = null,
        TimeSpan? maxExecutionTime = null,
        RetryStrategy? retryStrategy = null
    ) =>
        new()
        {
            OperationId = command,
            Command = AppCommand.Create(
                new AppCommandData { CommandKey = command, Payload = payload },
                maxExecutionTime
            ),
            RetryStrategy = retryStrategy,
        };

    public StepRequest CreateWebhookStep(
        string path,
        string? payload = null,
        string? contentType = null,
        TimeSpan? maxExecutionTime = null,
        RetryStrategy? retryStrategy = null
    ) => _base.CreateWebhookStep(path, payload, contentType, maxExecutionTime, retryStrategy);

    public WorkflowRequest CreateWorkflow(
        string wfRef,
        IEnumerable<StepRequest> steps,
        IEnumerable<WorkflowRef>? dependsOn = null
    ) => _base.CreateWorkflow(wfRef, steps, dependsOn);

    /// <summary>
    /// Creates an enqueue request with AppCommand-compatible context (includes lockToken, actor, instance info).
    /// </summary>
    public WorkflowEnqueueRequest CreateEnqueueRequest(WorkflowRequest workflow, string? lockToken = null) =>
        new()
        {
            Namespace = $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}",
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Context = CreateAppContext(lockToken),
            Labels = new Dictionary<string, string>
            {
                ["org"] = EngineAppFixture.DefaultOrg,
                ["app"] = EngineAppFixture.DefaultApp,
            },
            Workflows = [workflow],
        };

    /// <inheritdoc cref="CreateEnqueueRequest(WorkflowRequest, string?)"/>
    public WorkflowEnqueueRequest CreateEnqueueRequest(
        IEnumerable<WorkflowRequest> workflows,
        string? lockToken = null
    ) =>
        new()
        {
            Namespace = $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}",
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Context = CreateAppContext(lockToken),
            Labels = new Dictionary<string, string>
            {
                ["org"] = EngineAppFixture.DefaultOrg,
                ["app"] = EngineAppFixture.DefaultApp,
            },
            Workflows = [.. workflows],
        };

    public Task AssertDbEmpty() => _base.AssertDbEmpty();

    public Task AssertDbWorkflowCount(int expectedCount) => _base.AssertDbWorkflowCount(expectedCount);

    public Task AssertDbStepCount(int expectedCount) => _base.AssertDbStepCount(expectedCount);

    private static JsonElement CreateAppContext(string? lockToken = null) =>
        JsonSerializer.SerializeToElement(
            new
            {
                Actor = new Actor { UserIdOrOrgNumber = "test-user" },
                LockToken = lockToken,
                Org = EngineAppFixture.DefaultOrg,
                App = EngineAppFixture.DefaultApp,
                InstanceOwnerPartyId = int.Parse(EngineAppFixture.DefaultPartyId),
                InstanceGuid = EngineAppFixture.DefaultInstanceGuid,
            }
        );
}
