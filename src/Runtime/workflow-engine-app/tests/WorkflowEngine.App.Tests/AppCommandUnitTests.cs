using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Api;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.App.Tests;

public class AppCommandUnitTests
{
    private static CommandDefinition CreateAppCommand(string commandKey, string? payload = null) =>
        AppCommand.Create(new AppCommandData { CommandKey = commandKey, Payload = payload });

    [Fact]
    public async Task Execute_AppCommand_SuccessResponse_ReturnsSuccess()
    {
        // Arrange
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);
        Assert.Equal(HttpMethod.Post, fixture.HttpHandler.Requests[0].Method);
    }

    [Fact]
    public async Task Execute_AppCommand_ErrorResponse_ReturnsRetryableError()
    {
        // Arrange
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseStatusCode = System.Net.HttpStatusCode.InternalServerError;
        fixture.HttpHandler.ResponseContent = "Internal Server Error";
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("InternalServerError", result.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_AppCommand_SendsCorrectPayload()
    {
        // Arrange
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command", payload: "test-payload-data");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.NotNull(captured.Body);

        var payload = JsonSerializer.Deserialize<AppCallbackPayload>(captured.Body);
        Assert.NotNull(payload);
        Assert.Equal("test-command", payload.CommandKey);
        Assert.Equal("test-user-123", payload.Actor.UserIdOrOrgNumber);
        Assert.Equal("test-lock-key", payload.LockToken);
        Assert.Equal("test-payload-data", payload.Payload);
    }

    [Fact]
    public async Task Execute_AppCommand_MissingLockToken_ReturnsCriticalError()
    {
        // Arrange
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);

        // Create workflow with context that has no lockToken
        var contextWithoutLock = JsonSerializer.SerializeToElement(
            new
            {
                Actor = new Actor { UserIdOrOrgNumber = "test-user-123" },
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            }
        );
        var workflow = new Workflow
        {
            OperationId = "test-operation",
            IdempotencyKey = "test-wf-key",
            Namespace = "test-namespace",
            Context = contextWithoutLock,
            Steps = [step],
        };

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Empty(fixture.HttpHandler.Requests);
    }
}
