using System.Net;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Core;
using WorkflowEngine.Data;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    private const string EventsCollectionKey = "events-collection";
    private static readonly CollectionId _eventsCollection = new(EngineApiClient.DefaultNamespace, EventsCollectionKey);

    [Fact]
    public async Task CollectionEvents_SendsTheCollectionAsGetCollectionReturnsIt()
    {
        // Arrange
        var enqueued = await EnqueueIntoEventsCollection(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );
        await _client.WaitForWorkflowStatus(
            Assert.Single(enqueued.Workflows).DatabaseId,
            PersistentItemStatus.Completed
        );

        // Act
        await using var stream = await CollectionEventStream.Open(
            await _client.StreamCollectionEvents(EventsCollectionKey)
        );
        var data = await stream.NextData();

        // Assert
        using var getResponse = await _client.GetCollectionRaw(EventsCollectionKey);
        var body = await getResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Equal(WithoutCurrentTime(body).ToJsonString(), WithoutCurrentTime(data!).ToJsonString());
    }

    [Fact]
    public async Task CollectionEvents_KeyWithAnEncodedSlash_StreamsTheCollection()
    {
        // Arrange
        await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
            ),
            collectionKey: "events/1"
        );

        // Act: the API client encodes the slash in the route as %2F
        await using var stream = await CollectionEventStream.Open(await _client.StreamCollectionEvents("events/1"));
        var snapshot = await stream.Next();

        // Assert
        Assert.Equal("events/1", snapshot?.Key);
    }

    [Fact]
    public async Task CollectionEvents_UntilSettled_EndsAfterTheFirstSettledSnapshot()
    {
        // Arrange: a slow step, so that the stream opens while the workflow runs
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow-events").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(1)));
        fixture.SetupDefaultStub();
        await EnqueueIntoEventsCollection(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/slow-events")])
        );

        // Act
        await using var stream = await CollectionEventStream.Open(
            await _client.StreamCollectionEvents(EventsCollectionKey, until: "Settled")
        );
        await stream.NextDataWhere(c => c.Heads.Single().Status == PersistentItemStatus.Completed);
        var afterTheSettledSnapshot = await stream.NextData();

        // Assert
        Assert.Null(afterTheSettledSnapshot);
    }

    [Fact]
    public async Task CollectionEvents_UntilSettled_StaysOpenOnAParkedCollection()
    {
        // Arrange: a receive workflow is held until its mailbox gets a message
        var mailbox = await _client.MintMailbox("events-mailbox", TimeSpan.FromHours(1));
        await EnqueueIntoEventsCollection(
            _testHelpers.CreateWorkflow("receive", [_testHelpers.CreateWebhookStep("/never-called")]) with
            {
                Mailbox = new MailboxReference { Id = mailbox.Id },
            }
        );
        await using var stream = await CollectionEventStream.Open(
            await _client.StreamCollectionEvents(EventsCollectionKey, until: "Settled")
        );
        Assert.Equal(PersistentItemStatus.Held, Assert.Single((await stream.Next())!.Heads).Status);

        // Act
        fixture.Services.GetRequiredService<CollectionEventHub>().MarkDirty(_eventsCollection);

        // Assert
        Assert.NotNull(await stream.Next());
    }

    [Fact]
    public async Task CollectionEvents_UnknownCollection_Returns404()
    {
        // Act
        using var response = await _client.StreamCollectionEvents("no-such-collection");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CollectionEvents_UnknownUntilValue_Returns400()
    {
        // Arrange
        await EnqueueIntoEventsCollection(_testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")]));

        // Act
        using var response = await _client.StreamCollectionEvents(EventsCollectionKey, until: "Forever");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CollectionEvents_WhenTheInstanceServesItsMaximumOfStreams_Returns429()
    {
        // Arrange
        var hub = fixture.Services.GetRequiredService<CollectionEventHub>();
        List<CollectionEventSubscription> taken = [];
        while (hub.TrySubscribe(_eventsCollection) is { } subscription)
            taken.Add(subscription);

        try
        {
            // Act
            using var response = await _client.StreamCollectionEvents(EventsCollectionKey);

            // Assert
            Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        }
        finally
        {
            taken.ForEach(subscription => subscription.Dispose());
        }
    }

    [Fact]
    public async Task CollectionEvents_ClientHangingUp_EndsItsSubscription()
    {
        // Arrange: the instance serves its maximum of streams, one of them the client's
        var enqueued = await EnqueueIntoEventsCollection(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );
        await _client.WaitForWorkflowStatus(
            Assert.Single(enqueued.Workflows).DatabaseId,
            PersistentItemStatus.Completed
        );
        var response = await _client.StreamCollectionEvents(EventsCollectionKey);
        await using var stream = await CollectionEventStream.Open(response);
        await stream.Next();
        var hub = fixture.Services.GetRequiredService<CollectionEventHub>();
        var otherCollection = _eventsCollection with { Key = "other-collection" };
        List<CollectionEventSubscription> taken = [];
        while (hub.TrySubscribe(otherCollection) is { } subscription)
            taken.Add(subscription);

        try
        {
            // Act
            response.Dispose();

            // Assert: the test server signals the hang-up before Dispose returns
            var freed = hub.TrySubscribe(otherCollection);
            Assert.NotNull(freed);
            taken.Add(freed);
        }
        finally
        {
            taken.ForEach(subscription => subscription.Dispose());
        }
    }

    private Task<WorkflowEnqueueResponse.Accepted> EnqueueIntoEventsCollection(WorkflowRequest workflow) =>
        _client.Enqueue(_testHelpers.CreateEnqueueRequest(workflow), collectionKey: EventsCollectionKey);

    private static JsonObject WithoutCurrentTime(string json)
    {
        var node = JsonNode.Parse(json)!.AsObject();
        node.Remove("currentTime");
        return node;
    }
}
