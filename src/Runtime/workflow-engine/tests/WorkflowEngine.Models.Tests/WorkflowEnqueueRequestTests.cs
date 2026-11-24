using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace WorkflowEngine.Models.Tests;

public class WorkflowEnqueueRequestTests
{
    private static WorkflowEnqueueRequest CreateRequest(
        JsonElement? context,
        string operationId = "op",
        string? state = "state"
    ) =>
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
                    State = state,
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

        Assert.Equal(first.ComputeHash(collectionKey: null), second.ComputeHash(collectionKey: null));
    }

    [Fact]
    public void ComputeHash_IsStableWhenContextIsNullOrPresent()
    {
        var withContext = CreateRequest(JsonSerializer.SerializeToElement(new { callbackToken = "aaa" }));
        var withoutContext = CreateRequest(context: null);

        Assert.Equal(withContext.ComputeHash(collectionKey: null), withoutContext.ComputeHash(collectionKey: null));
    }

    [Fact]
    public void ComputeHash_IsStableWhenOnlyStateDiffers()
    {
        // State is opaque passthrough too, and a retried caller may rebuild it with other bytes: signed under
        // a rotated key, read again from its source, or written by a newer version of the caller. A hash that
        // included it would answer such a retry with a conflict, though its first attempt was accepted.
        var first = CreateRequest(context: null, state: """{"payload":"p","signature":"a","secretId":"1"}""");
        var second = CreateRequest(context: null, state: """{"payload":"p","signature":"b","secretId":"2"}""");

        Assert.Equal(first.ComputeHash(collectionKey: null), second.ComputeHash(collectionKey: null));
    }

    [Fact]
    public void ComputeHash_IsStableWhenStateIsNullOrPresent()
    {
        var withState = CreateRequest(context: null, state: "state");
        var withoutState = CreateRequest(context: null, state: null);

        Assert.Equal(withState.ComputeHash(collectionKey: null), withoutState.ComputeHash(collectionKey: null));
    }

    [Fact]
    public void ComputeHash_DiffersWhenWorkflowsDiffer()
    {
        var context = JsonSerializer.SerializeToElement(new { callbackToken = "same" });
        var first = CreateRequest(context, operationId: "op-a");
        var second = CreateRequest(context, operationId: "op-b");

        Assert.NotEqual(first.ComputeHash(collectionKey: null), second.ComputeHash(collectionKey: null));
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
        var firstHash = first.ComputeHash(collectionKey: null);
        var secondHash = second.ComputeHash(collectionKey: null);

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
        var firstHash = first.ComputeHash(collectionKey: null);
        var secondHash = second.ComputeHash(collectionKey: null);

        // Assert
        Assert.NotEqual(firstHash, secondHash);
    }

    [Fact]
    public void ComputeHash_OnlyWorkflowLabelsDiffer_HashesTheSame()
    {
        // Arrange: the steps are the same work whatever the caller labels the workflow for its own lookups.
        var first = CreateRequestWithStep("Validate data", workflowLabel: "Task_1");
        var second = CreateRequestWithStep("Validate data", workflowLabel: "Task_2");

        // Act
        var firstHash = first.ComputeHash(collectionKey: null);
        var secondHash = second.ComputeHash(collectionKey: null);

        // Assert
        Assert.Equal(firstHash, secondHash);
    }

    [Theory]
    [InlineData("collection-1", "collection-2")]
    [InlineData("collection-1", null)]
    public void ComputeHash_CollectionKeyDiffers_HashesDifferently(string firstKey, string? secondKey)
    {
        // Arrange: the collection decides which workflows the new ones wait for, so it is part of the work.
        var request = CreateRequestWithStep("Validate data");

        // Act
        var firstHash = request.ComputeHash(firstKey);
        var secondHash = request.ComputeHash(secondKey);

        // Assert
        Assert.NotEqual(firstHash, secondHash);
    }

    [Fact]
    public void ComputeHash_FieldsLeftOutOrUnset_AreNotInTheHashedJson()
    {
        // Arrange: this is all the engine hashes for a request that sets nothing optional. If a field added to
        // the request models shows up here, deploying it makes every stored hash stale, and a replay across the
        // deploy gets a conflict.
        var request = CreateRequestWithStep("Validate data");
        const string hashedJson =
            """{"CollectionKey":"collection-1","Work":{"workflows":[{"operationId":"op","steps":["""
            + """{"operationId":"step","command":{"type":"app","data":{"payload":"payload"}}}]"""
            + ""","dependsOnHeads":true}]}}""";

        // Act
        var hash = request.ComputeHash("collection-1");

        // Assert
        Assert.Equal(SHA256.HashData(Encoding.UTF8.GetBytes(hashedJson)), hash);
    }
}
