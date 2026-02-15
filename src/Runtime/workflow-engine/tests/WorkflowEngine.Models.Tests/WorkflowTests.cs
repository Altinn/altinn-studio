namespace WorkflowEngine.Models.Tests;

public class WorkflowTests
{
    private static Actor _randomActor => new() { UserIdOrOrgNumber = Guid.NewGuid().ToString() };
    private static InstanceInformation _randomInstance =>
        new()
        {
            Org = Guid.NewGuid().ToString(),
            App = Guid.NewGuid().ToString(),
            InstanceOwnerPartyId = Guid.NewGuid().GetHashCode(),
            InstanceGuid = Guid.NewGuid(),
        };

    [Fact]
    public void Equality_Uses_IdempotencyKey()
    {
        // Arrange

        var sharedKey1 = new Workflow
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "workflow-1-operation",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };
        var sharedKey2 = new Workflow
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "workflow-2-operation",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };
        var uniqueKey = new Workflow
        {
            IdempotencyKey = "unique-idempotency-key",
            OperationId = "workflow-3-operation",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };

        // Act
        bool shouldBeEqual1 = sharedKey1 == sharedKey2;
        bool shouldBeEqual2 = sharedKey1.Equals(sharedKey2);

        bool shouldNotBeEqual1 = uniqueKey == sharedKey1;
        bool shouldNotBeEqual2 = uniqueKey.Equals(sharedKey1);

        bool shouldContain = new[] { sharedKey1, uniqueKey }.Contains(sharedKey2);

        // Assert
        Assert.True(shouldBeEqual1);
        Assert.True(shouldBeEqual2);

        Assert.False(shouldNotBeEqual1);
        Assert.False(shouldNotBeEqual2);

        Assert.True(shouldContain);
    }
}
