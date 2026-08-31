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
}
