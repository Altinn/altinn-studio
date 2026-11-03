using System.Globalization;
using System.Text.Json.Nodes;
using WorkflowEngine.Models;
using WorkflowEngine.Operator.Commands.OperatorCommand;
using WorkflowEngine.Operator.Tests.Fixtures;

namespace WorkflowEngine.Operator.Tests.Contract;

/// <summary>
/// Checks <see cref="Operator.Commands.OperatorCommand.OperatorCommand"/> against the callback contract examples in
/// <c>src/core/operator/api/callbacks</c>. The operator's tests read the same files, so the two sides cannot drift
/// apart without one of them failing.
/// </summary>
public class CallbackContractTests
{
    [Fact]
    public async Task Payload_ForTheExampleInputs_EqualsPayloadJson()
    {
        // Arrange
        var expected = ReadExample("payload.json");
        var context = expected["context"]!;
        using var fixture = OperatorCommandTestFixture.Create();
        var executionContext = OperatorCommandTestFixture.CreateExecutionContext(
            new OperatorCommandData { CommandKey = expected["commandKey"]!.GetValue<string>() },
            new OperatorWorkflowContext
            {
                Domain = context["domain"]!.GetValue<string>(),
                Caller = context["caller"]!.GetValue<string>(),
                SubjectId = context["subjectId"]!.GetValue<string>(),
            },
            workflowId: Guid.Parse(expected["workflowId"]!.GetValue<string>()),
            stepId: Guid.Parse(expected["stepId"]!.GetValue<string>()),
            createdAt: Time(expected["executionReferenceTime"])!.Value,
            stateIn: expected["state"]?.GetValue<string>(),
            retryCount: expected["retryCount"]!.GetValue<int>(),
            deferCount: expected["deferCount"]!.GetValue<int>(),
            firstDeferredAt: Time(expected["firstDeferredAt"]),
            executionDeadline: Time(expected["executionDeadline"]),
            waitDeadline: Time(expected["waitDeadline"]),
            isFinalWaitCheck: expected["isFinalWaitCheck"]!.GetValue<bool>()
        );

        // Act
        await fixture.GetOperatorCommand().Execute(executionContext, TestContext.Current.CancellationToken);

        // Assert
        var sent = JsonNode.Parse(Assert.Single(fixture.CallbackRouter.LogEntries).RequestMessage.Body!);
        Assert.True(
            JsonNode.DeepEquals(expected, sent),
            $"The callback differs from payload.json.\nExpected:\n{expected.ToJsonString()}\nSent:\n{sent?.ToJsonString()}"
        );
    }

    [Fact]
    public async Task ResponseDone_CompletesTheStepWithItsState()
    {
        // Arrange
        var example = ReadExample("response-done.json");
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith(200, example.ToJsonString());
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Equal(example["state"]!.GetValue<string>(), result.StateOut);
    }

    [Fact]
    public async Task ResponseDefer_DefersTheStepWithDelayReasonAndState()
    {
        // Arrange
        var example = ReadExample("response-defer.json");
        using var fixture = OperatorCommandTestFixture.Create();
        fixture.RespondWith(200, example.ToJsonString());
        var context = OperatorCommandTestFixture.CreateExecutionContext(OperatorCommandTestFixture.CreateCommandData());

        // Act
        var result = await fixture.GetOperatorCommand().Execute(context, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Deferred, result.Status);
        Assert.Equal(
            TimeSpan.Parse(example["defer"]!["delay"]!.GetValue<string>(), CultureInfo.InvariantCulture),
            result.DeferDelay
        );
        Assert.Equal(TimeSpan.FromSeconds(5), result.DeferDelay);
        Assert.Equal(example["defer"]!["reason"]!.GetValue<string>(), result.Message);
        Assert.Equal(example["state"]!.GetValue<string>(), result.StateOut);
    }

    private static JsonNode ReadExample(string fileName) =>
        JsonNode.Parse(File.ReadAllText(Path.Combine(RepositoryFiles.CallbackContractDirectory, fileName)))
        ?? throw new InvalidOperationException($"{fileName} is empty.");

    private static DateTimeOffset? Time(JsonNode? node) =>
        node is null ? null : DateTimeOffset.Parse(node.GetValue<string>(), CultureInfo.InvariantCulture);
}
