namespace WorkflowEngine.Models.Tests;

public class StepTests
{
    private static Command.AppCommand _randomAppCommand => new(Guid.NewGuid().ToString());
    private static Actor _randomActor => new() { UserIdOrOrgNumber = Guid.NewGuid().ToString() };

    [Fact]
    public void Equality_Uses_IdempotencyKey()
    {
        // Arrange

        var sharedKey1 = new Step
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "step-1-command",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
        };
        var sharedKey2 = new Step
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "step-2-command",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
        };
        var uniqueKey = new Step
        {
            IdempotencyKey = "unique-idempotency-key",
            OperationId = "step-3-command",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
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
