using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Testcontainers.PostgreSql;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.TestApp;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Two engine instances against one database, as two replicas run. The subscribing instance sweeps only once an
/// hour, so within a test it learns of a change only through PostgreSQL's notification from the instance that
/// wrote it.
/// </summary>
public sealed class CollectionEventsAcrossInstancesTests(CollectionEventsAcrossInstancesTests.Replicas replicas)
    : IClassFixture<CollectionEventsAcrossInstancesTests.Replicas>
{
    private const string Namespace = "ttd-replicas";

    // The database serves every test of the class, so each test has a collection of its own
    private readonly string _collectionKey = $"replicated-{Guid.NewGuid():N}";

    /// <summary>One database, and the writing and the subscribing instance on it, shared by the class's tests.</summary>
    public sealed class Replicas : IAsyncLifetime
    {
        private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18").Build();

        public string ConnectionString => _postgres.GetConnectionString();

        public WireMockServer WireMock { get; private set; } = null!;

        public EngineWebApplicationFactory<Program> Writer { get; private set; } = null!;

        public EngineWebApplicationFactory<Program> Subscriber { get; private set; } = null!;

        public async ValueTask InitializeAsync()
        {
            await _postgres.StartAsync();
            await new DbMigrationService(NullLogger<DbMigrationService>.Instance).Migrate(ConnectionString);
            WireMock = WireMockServer.Start();
            WireMock
                .Given(Request.Create().WithPath("/fails").UsingAnyMethod())
                .RespondWith(Response.Create().WithStatusCode(500));
            WireMock
                .Given(Request.Create().WithPath("/slow").UsingAnyMethod())
                .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(1)));

            Writer = new EngineWebApplicationFactory<Program>(ConnectionString);
            Subscriber = new EngineWebApplicationFactory<Program>(
                ConnectionString,
                builder => builder.UseSetting("EngineSettings:CollectionEvents:SweepInterval", "01:00:00")
            );
            _ = Writer.Server;
            _ = Subscriber.Server;
        }

        public async ValueTask DisposeAsync()
        {
            await Subscriber.DisposeAsync();
            await Writer.DisposeAsync();
            WireMock.Stop();
            WireMock.Dispose();
            await _postgres.DisposeAsync();
        }
    }

    [Fact]
    public async Task ChangeWrittenThroughAnotherInstance_ReachesTheSubscriberThroughPostgres()
    {
        // Arrange
        using var writer = replicas.Writer.CreateClient();
        using var subscriber = replicas.Subscriber.CreateClient();
        var workflowId = await EnqueueFailingWorkflow(writer);
        await WaitForStatus(writer, workflowId, PersistentItemStatus.Failed);
        await WaitForListeners(count: 2);

        await using var stream = await CollectionEventStream.Open(await OpenEvents(subscriber));
        Assert.Equal(PersistentItemStatus.Failed, Assert.Single((await stream.Next())!.Heads).Status);

        // Act
        using var abandon = await writer.PostAsync(
            $"/api/v1/{Namespace}/workflows/{workflowId}/abandon",
            null,
            TestContext.Current.CancellationToken
        );
        abandon.EnsureSuccessStatusCode();

        // Assert
        var next = await stream.Next(TimeSpan.FromSeconds(10));
        Assert.Equal(PersistentItemStatus.Abandoned, Assert.Single(next!.Heads).Status);
    }

    [Fact]
    public async Task ChangeWrittenWhileTheListenerWasDisconnected_ReachesTheSubscriberWhenItReconnects()
    {
        // Arrange
        using var writer = replicas.Writer.CreateClient();
        using var subscriber = replicas.Subscriber.CreateClient();
        var workflowId = await EnqueueFailingWorkflow(writer);
        await WaitForStatus(writer, workflowId, PersistentItemStatus.Failed);
        await WaitForListeners(count: 2);
        await using var stream = await CollectionEventStream.Open(await OpenEvents(subscriber));
        await stream.Next();

        // Act: the listeners wait a second before they reconnect, and the write lands in that gap
        await TerminateListeners();
        using var abandon = await writer.PostAsync(
            $"/api/v1/{Namespace}/workflows/{workflowId}/abandon",
            null,
            TestContext.Current.CancellationToken
        );
        abandon.EnsureSuccessStatusCode();
        var listenersWhenWritten = await CountListeners();

        // Assert
        Assert.Equal(0, listenersWhenWritten);
        var next = await stream.Next(TimeSpan.FromSeconds(10));
        Assert.Equal(PersistentItemStatus.Abandoned, Assert.Single(next!.Heads).Status);
    }

    [Fact]
    public async Task WorkflowOutcome_ReachesTheSubscriber_WithoutTheSweep()
    {
        // Arrange: a slow step, so that the stream's first snapshot shows the workflow in flight
        using var writer = replicas.Writer.CreateClient();
        using var subscriber = replicas.Subscriber.CreateClient();
        await WaitForListeners(count: 2);
        await Enqueue(writer, new WorkflowRequest { OperationId = "slow", Steps = [Webhook("/slow")] });
        await using var stream = await CollectionEventStream.Open(await OpenEvents(subscriber));
        await stream.Next();

        // Act and assert: NextDataWhere throws when the stream stays silent or ends first
        await stream.NextDataWhere(c => c.Heads[0].Status == PersistentItemStatus.Completed);
    }

    private Task<Guid> EnqueueFailingWorkflow(HttpClient client) =>
        Enqueue(client, new WorkflowRequest { OperationId = "fails", Steps = [Webhook("/fails")] });

    private async Task<Guid> Enqueue(HttpClient client, WorkflowRequest workflow)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/{Namespace}/workflows")
        {
            Content = JsonContent.Create(new WorkflowEnqueueRequest { Workflows = [workflow] }),
        };
        message.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, Guid.NewGuid().ToString("N"));
        message.Headers.Add(WorkflowMetadataConstants.Headers.CollectionKey, _collectionKey);

        using var response = await client.SendAsync(message, TestContext.Current.CancellationToken);
        var accepted = await EngineApiClient.AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
        return Assert.Single(accepted.Workflows).DatabaseId;
    }

    private StepRequest Webhook(string path) =>
        new()
        {
            OperationId = path,
            Command = WebhookCommand.Create(
                new WebhookCommandData { Uri = $"http://localhost:{replicas.WireMock.Port}{path}" }
            ),
            RetryStrategy = RetryStrategy.None(),
        };

    private async Task<HttpResponseMessage> OpenEvents(HttpClient client)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/v1/{Namespace}/collections/{_collectionKey}/events"
        );
        return await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            TestContext.Current.CancellationToken
        );
    }

    private static async Task WaitForStatus(HttpClient client, Guid workflowId, PersistentItemStatus status)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        while (true)
        {
            var workflow = await client.GetFromJsonAsync<WorkflowStatusResponse>(
                $"/api/v1/{Namespace}/workflows/{workflowId}",
                cts.Token
            );
            if (workflow?.OverallStatus == status)
                return;

            await Task.Delay(50, cts.Token);
        }
    }

    // A listener session runs nothing after its LISTEN, so that stays its last query, and no other session runs one
    private const string ListenerSessions = "FROM pg_stat_activity WHERE query LIKE 'LISTEN %'";
    private const string CountListenersSql = $"SELECT count(*) {ListenerSessions}";
    private const string TerminateListenersSql = $"SELECT count(pg_terminate_backend(pid)) {ListenerSessions}";

    /// <summary>
    /// Waits until <paramref name="count"/> sessions listen on <c>collection_changed</c>, so a notification sent
    /// next reaches every instance rather than being covered by a listener's reconnect.
    /// </summary>
    private async Task WaitForListeners(int count)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        while (await CountListeners() < count)
            await Task.Delay(50, cts.Token);
    }

    private async Task<long> CountListeners()
    {
        await using var conn = await OpenConnection();
        await using var cmd = new NpgsqlCommand(CountListenersSql, conn);
        return (long)(await cmd.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
    }

    private async Task TerminateListeners()
    {
        await using var conn = await OpenConnection();
        await using var cmd = new NpgsqlCommand(TerminateListenersSql, conn);
        await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
    }

    private async Task<NpgsqlConnection> OpenConnection()
    {
        var conn = new NpgsqlConnection(replicas.ConnectionString);
        await conn.OpenAsync(TestContext.Current.CancellationToken);
        return conn;
    }
}
