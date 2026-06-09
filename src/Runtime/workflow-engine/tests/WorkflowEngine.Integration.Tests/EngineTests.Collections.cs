using System.Net;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task ListCollections_ReturnsCollectionsForNamespace()
    {
        // Arrange — two batches under distinct collection keys materialize two collection rows.
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "col-1"
        );
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-b", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "col-2"
        );

        // Act
        var collections = await _client.ListCollections();

        // Assert
        Assert.Equal(2, collections.Count);
        Assert.Contains(collections, c => c.Key == "col-1");
        Assert.Contains(collections, c => c.Key == "col-2");
        Assert.All(collections, c => Assert.NotEmpty(c.Heads));
    }

    [Fact]
    public async Task ListCollections_WhenNoneExist_ReturnsNoContent()
    {
        // Arrange — enqueue a workflow without a collection key, so no collection row exists.
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            )
        );

        // Act
        using var response = await _client.ListCollectionsRaw();

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ListCollections_IsolatedByNamespace()
    {
        // Arrange — same collection key in two namespaces.
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            ns: "ns-a",
            collectionKey: "shared-key"
        );
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            ns: "ns-b",
            collectionKey: "shared-key"
        );

        // Act
        var nsA = await _client.ListCollections("ns-a");
        var nsB = await _client.ListCollections("ns-b");

        // Assert — each namespace sees only its own collection.
        Assert.Single(nsA);
        Assert.Single(nsB);
        Assert.Equal("ns-a", nsA[0].Namespace);
        Assert.Equal("ns-b", nsB[0].Namespace);
    }
}
