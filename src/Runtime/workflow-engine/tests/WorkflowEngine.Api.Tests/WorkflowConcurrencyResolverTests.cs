using Moq;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Tests;

public class WorkflowConcurrencyResolverTests
{
    private readonly WorkflowConcurrencyResolver _resolver = new();
    private readonly IEngineRepository _repository = new Mock<IEngineRepository>().Object;

    private static WorkflowEnqueueRequest CreateRequest(WorkflowType type) =>
        new(
            Guid.NewGuid().ToString(),
            "test",
            new InstanceInformation
            {
                Org = "ttd",
                App = "app-1",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.NewGuid(),
            },
            new Actor { UserIdOrOrgNumber = "user-1" },
            DateTimeOffset.UtcNow,
            null,
            [new StepRequest { Command = new Command.Debug.Noop() }],
            type
        );

    [Fact]
    public void CanAccept_Generic_AlwaysAllows()
    {
        // Arrange
        var request = CreateRequest(WorkflowType.Generic);

        // Act
        var result = _resolver.CanAcceptWorkflow(request, _repository);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void CanAccept_AppProcessChange_ThrowsNotImplemented()
    {
        // Arrange
        var request = CreateRequest(WorkflowType.AppProcessChange);

        // Act & Assert
        Assert.Throws<NotImplementedException>(() => _resolver.CanAcceptWorkflow(request, _repository));
    }
}
