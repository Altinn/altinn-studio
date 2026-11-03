using System.Net;
using System.Text.Json;
using WorkflowEngine.Models;
using WorkflowEngine.Operator.Commands.OperatorCommand;
using WorkflowEngine.Operator.Tests.Fixtures;

namespace WorkflowEngine.Operator.Tests.Commands.OperatorCommand;

/// <summary>
/// Tests <see cref="Operator.Commands.OperatorCommand.OperatorCommand"/>'s execution against WireMock in the role of
/// the operator's callback router.
/// </summary>
public class OperatorCommandExecutionTests
{
    [Fact]
    public async Task Execute_PostsPayloadToCommandKeyUnderCallbackRouter()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        var context = OperatorCommandTestFixture.CreateExecutionContext(
            OperatorCommandTestFixture.CreateCommandData("run.create-job", payload: "{\"kind\":\"upgrade-v9\"}"),
            stateIn: "previous-state"
        );

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        var request = Assert.Single(fixture.CallbackRouter.LogEntries).RequestMessage;
        Assert.Equal("POST", request.Method, ignoreCase: true);
        Assert.Equal("/workflow-engine-callbacks/run.create-job", request.AbsolutePath);

        var payload = JsonSerializer.Deserialize<OperatorCallbackPayload>(request.Body!);
        Assert.NotNull(payload);
        Assert.Equal("run.create-job", payload.CommandKey);
        Assert.Equal("{\"kind\":\"upgrade-v9\"}", payload.Payload);
        Assert.Equal(OperatorCommandTestFixture.DefaultContext, payload.Context);
        Assert.Equal("previous-state", payload.State);
    }

    [Fact]
    public async Task Execute_SendsWorkflowMetadataHeaders()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        var stepId = Guid.Parse("7c9e6679-7425-40de-944b-e07fc1f90ae7");
        var workflowId = Guid.Parse("0f8fad5b-d9cb-469f-a165-70867728950e");
        var context = OperatorCommandTestFixture.CreateExecutionContext(
            OperatorCommandTestFixture.CreateCommandData(),
            workflowId: workflowId,
            stepId: stepId
        );

        // Act
        await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        var headers = Assert.Single(fixture.CallbackRouter.LogEntries).RequestMessage.Headers!;
        Assert.Equal(stepId.ToString(), Assert.Single(headers[WorkflowMetadataConstants.Headers.IdempotencyKey]));
        Assert.Equal(workflowId.ToString(), Assert.Single(headers[WorkflowMetadataConstants.Headers.WorkflowId]));
        Assert.Equal("runs-assistant", Assert.Single(headers[WorkflowMetadataConstants.Headers.Namespace]));
    }

    // --- Authorization ---

    [Fact]
    public async Task Execute_SendsProjectedTokenAsBearerToken()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(
            $"Bearer {OperatorCommandTestFixture.InitialToken}",
            Assert.Single(Assert.Single(fixture.CallbackRouter.LogEntries).RequestMessage.Headers!["Authorization"])
        );
    }

    [Fact]
    public async Task Execute_TokenRotated_SendsNewTokenOnNextCallback()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        var command = fixture.GetOperatorCommand();
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        await command.Execute(context, TestContext.Current.CancellationToken);
        await File.WriteAllTextAsync(fixture.Settings.TokenPath, "token-2\n", TestContext.Current.CancellationToken);
        await command.Execute(context, TestContext.Current.CancellationToken);

        // Assert
        string[] authorizations =
        [
            .. fixture.CallbackRouter.LogEntries.Select(entry =>
                entry.RequestMessage.Headers!["Authorization"].Single()
            ),
        ];
        Assert.Equal(["Bearer token-1", "Bearer token-2"], authorizations);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(" \n")]
    public async Task Execute_TokenFileMissingOrEmpty_ReturnsRetryableErrorWithoutCallingOperator(string? content)
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        var tokenPath = Path.Combine(fixture.TokenDirectory, "other-token");
        if (content is not null)
            await File.WriteAllTextAsync(tokenPath, content, TestContext.Current.CancellationToken);
        var command = fixture.CreateOperatorCommand(tokenPath);
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains(tokenPath, result.Message, StringComparison.Ordinal);
        Assert.Empty(fixture.CallbackRouter.LogEntries);
    }

    [Fact]
    public async Task Execute_NoTokenPath_SendsNoAuthorization()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.CreateWithoutToken();
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.False(
            Assert.Single(fixture.CallbackRouter.LogEntries).RequestMessage.Headers!.ContainsKey("Authorization")
        );
    }

    // --- Response classification ---

    [Fact]
    public async Task Execute_EmptySuccessBody_ReturnsSuccessWithoutState()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith(204);
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Null(result.StateOut);
    }

    [Fact]
    public async Task Execute_SuccessWithState_ReturnsState()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith(200, """{"state": "next-step-state"}""");
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Equal("next-step-state", result.StateOut);
    }

    [Fact]
    public async Task Execute_SuccessWithNullStateAndDefer_ReturnsSuccessWithoutState()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith(200, """{"state": null, "defer": null}""");
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Null(result.StateOut);
    }

    [Fact]
    public async Task Execute_Defer_ReturnsDeferralWithDelayReasonAndState()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith(200, """{"state": "carried-state", "defer": {"delay": "00:00:05", "reason": "queued"}}""");
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Deferred, result.Status);
        Assert.Equal(TimeSpan.FromSeconds(5), result.DeferDelay);
        Assert.Equal("queued", result.Message);
        Assert.Equal("carried-state", result.StateOut);
    }

    [Fact]
    public async Task Execute_InvalidJson_ReturnsCriticalError()
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith(200, "not-json{{{");
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Contains("invalid response body", result.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(result.HttpStatusCode);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Conflict)]
    [InlineData((HttpStatusCode)422)]
    public async Task Execute_NonRetryable4xx_ReturnsCriticalError(HttpStatusCode statusCode)
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith((int)statusCode, """{"title": "refused"}""");
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Contains("client error", result.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal((int)statusCode, result.HttpStatusCode);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.BadGateway)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.RequestTimeout)] // 408, retryable although 4xx
    [InlineData((HttpStatusCode)418)] // retryable although 4xx
    [InlineData(HttpStatusCode.TooManyRequests)] // 429, retryable although 4xx
    public async Task Execute_RetryableStatusCodes_ReturnsRetryableError(HttpStatusCode statusCode)
    {
        // Arrange
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith((int)statusCode);
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Equal((int)statusCode, result.HttpStatusCode);
    }
}
