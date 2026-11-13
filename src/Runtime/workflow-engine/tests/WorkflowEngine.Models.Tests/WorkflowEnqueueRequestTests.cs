using System.Text.Json;

namespace WorkflowEngine.Models.Tests;

public class WorkflowEnqueueRequestTests
{
    private static WorkflowEnqueueRequest CreateRequest(JsonElement? context, string operationId = "op") =>
        new()
        {
            Labels = new Dictionary<string, string> { ["k"] = "v" },
            Context = context,
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = operationId,
                    Steps = [],
                    State = "state",
                },
            ],
        };

    private static WorkflowEnqueueRequest CreateRequestWithStep(
        string? stepName,
        string payload = "payload",
        string workflowLabel = "Task_1"
    ) =>
        new()
        {
            Labels = new Dictionary<string, string> { ["processNextTargetTask"] = workflowLabel },
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = "op",
                    Steps =
                    [
                        new StepRequest
                        {
                            OperationId = "step",
                            Command = CommandDefinition.Create("app", new { payload }),
                            Labels = stepName is null
                                ? null
                                : new Dictionary<string, string> { ["stepName"] = stepName },
                        },
                    ],
                },
            ],
        };

    [Fact]
    public void ComputeHash_IsStableWhenOnlyContextDiffers()
    {
        // Context is opaque passthrough and may be rebuilt per attempt (e.g. a freshly minted auth token with
        // a new issued-at). The idempotency hash must ignore it so retries dedupe instead of conflicting.
        var first = CreateRequest(JsonSerializer.SerializeToElement(new { callbackToken = "aaa", iat = 1 }));
        var second = CreateRequest(JsonSerializer.SerializeToElement(new { callbackToken = "bbb", iat = 2 }));

        Assert.Equal(first.ComputeHash(), second.ComputeHash());
    }

    [Fact]
    public void ComputeHash_IsStableWhenContextIsNullOrPresent()
    {
        var withContext = CreateRequest(JsonSerializer.SerializeToElement(new { callbackToken = "aaa" }));
        var withoutContext = CreateRequest(context: null);

        Assert.Equal(withContext.ComputeHash(), withoutContext.ComputeHash());
    }

    [Fact]
    public void ComputeHash_DiffersWhenWorkflowsDiffer()
    {
        var context = JsonSerializer.SerializeToElement(new { callbackToken = "same" });
        var first = CreateRequest(context, operationId: "op-a");
        var second = CreateRequest(context, operationId: "op-b");

        Assert.NotEqual(first.ComputeHash(), second.ComputeHash());
    }

    [Theory]
    [InlineData("Validate data", "Validate the data")]
    [InlineData("Validate data", null)]
    public void ComputeHash_OnlyStepLabelsDiffer_HashesTheSame(string firstStepName, string? secondStepName)
    {
        // Arrange: a deploy renamed the step between an enqueue whose response was lost and its replay.
        var first = CreateRequestWithStep(firstStepName);
        var second = CreateRequestWithStep(secondStepName);

        // Act
        var firstHash = first.ComputeHash();
        var secondHash = second.ComputeHash();

        // Assert
        Assert.Equal(firstHash, secondHash);
    }

    [Fact]
    public void ComputeHash_StepPayloadDiffers_HashesDifferently()
    {
        // Arrange
        var first = CreateRequestWithStep("Validate data", payload: "a");
        var second = CreateRequestWithStep("Validate data", payload: "b");

        // Act
        var firstHash = first.ComputeHash();
        var secondHash = second.ComputeHash();

        // Assert
        Assert.NotEqual(firstHash, secondHash);
    }

    [Fact]
    public void ComputeHash_WorkflowLabelsDiffer_HashesDifferently()
    {
        // Arrange: workflow labels are indexed and read back by callers, so they identify the request.
        var first = CreateRequestWithStep("Validate data", workflowLabel: "Task_1");
        var second = CreateRequestWithStep("Validate data", workflowLabel: "Task_2");

        // Act
        var firstHash = first.ComputeHash();
        var secondHash = second.ComputeHash();

        // Assert
        Assert.NotEqual(firstHash, secondHash);
    }
}
