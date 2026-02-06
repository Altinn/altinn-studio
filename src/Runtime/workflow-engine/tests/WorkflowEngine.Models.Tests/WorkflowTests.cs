namespace WorkflowEngine.Models.Tests;

public class WorkflowTests
{
    [Fact]
    public void Equality_Uses_IdempotencyKey()
    {
        // Arrange
        var getRandomActor = () => new Actor { UserIdOrOrgNumber = Guid.NewGuid().ToString() };
        var getRandomInstance = () =>
            new InstanceInformation
            {
                Org = Guid.NewGuid().ToString(),
                App = Guid.NewGuid().ToString(),
                InstanceOwnerPartyId = Guid.NewGuid().GetHashCode(),
                InstanceGuid = Guid.NewGuid(),
            };

        var sharedKey1 = new Workflow
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "workflow-1-operation",
            Actor = getRandomActor(),
            InstanceInformation = getRandomInstance(),
            Steps = [],
        };
        var sharedKey2 = new Workflow
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "workflow-2-operation",
            Actor = getRandomActor(),
            InstanceInformation = getRandomInstance(),
            Steps = [],
        };
        var uniqueKey = new Workflow
        {
            IdempotencyKey = "unique-idempotency-key",
            OperationId = "workflow-3-operation",
            Actor = getRandomActor(),
            InstanceInformation = getRandomInstance(),
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
