namespace WorkflowEngine.Models.Tests;

public class StepTests
{
    [Fact]
    public void Equality_Uses_IdempotencyKey()
    {
        // Arrange
        var getRandomAppCommand = () => new Command.AppCommand(Guid.NewGuid().ToString());
        var getRandomActor = () => new Actor { UserIdOrOrgNumber = Guid.NewGuid().ToString() };

        using var sharedKey1 = new Step
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "step-1-command",
            Actor = getRandomActor(),
            ProcessingOrder = 0,
            Command = getRandomAppCommand(),
        };
        using var sharedKey2 = new Step
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "step-2-command",
            Actor = getRandomActor(),
            ProcessingOrder = 0,
            Command = getRandomAppCommand(),
        };
        using var uniqueKey = new Step
        {
            IdempotencyKey = "unique-idempotency-key",
            OperationId = "step-3-command",
            Actor = getRandomActor(),
            ProcessingOrder = 0,
            Command = getRandomAppCommand(),
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
