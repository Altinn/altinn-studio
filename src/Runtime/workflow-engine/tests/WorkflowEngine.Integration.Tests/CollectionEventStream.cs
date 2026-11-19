using System.Net.ServerSentEvents;
using System.Text.Json;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

/// <summary>Reads a collection event stream one event at a time, each within a deadline.</summary>
internal sealed class CollectionEventStream : IAsyncDisposable
{
    private readonly HttpResponseMessage _response;
    private readonly IAsyncEnumerator<SseItem<string>> _events;

    private CollectionEventStream(HttpResponseMessage response, IAsyncEnumerator<SseItem<string>> events)
    {
        _response = response;
        _events = events;
    }

    public static async Task<CollectionEventStream> Open(HttpResponseMessage response)
    {
        Assert.Equal("text/event-stream", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStreamAsync(TestContext.Current.CancellationToken);
        return new CollectionEventStream(
            response,
            SseParser.Create(body).EnumerateAsync(TestContext.Current.CancellationToken).GetAsyncEnumerator()
        );
    }

    /// <summary>The next event's data, or <see langword="null"/> when the stream has ended.</summary>
    public async Task<string?> NextData(TimeSpan? timeout = null) =>
        await _events.MoveNextAsync().AsTask().WaitAsync(timeout ?? TimeSpan.FromSeconds(10))
            ? _events.Current.Data
            : null;

    public async Task<WorkflowCollectionDetailResponse?> Next(TimeSpan? timeout = null) =>
        await NextData(timeout) is { } data
            ? JsonSerializer.Deserialize<WorkflowCollectionDetailResponse>(data, JsonSerializerOptions.Web)
            : null;

    /// <summary>Reads until a snapshot satisfies <paramref name="predicate"/>, and returns its data.</summary>
    public async Task<string> NextDataWhere(Func<WorkflowCollectionDetailResponse, bool> predicate)
    {
        while (true)
        {
            var data = await NextData() ?? throw new InvalidOperationException("The stream ended first.");
            var snapshot =
                JsonSerializer.Deserialize<WorkflowCollectionDetailResponse>(data, JsonSerializerOptions.Web)
                ?? throw new InvalidOperationException($"Not a collection snapshot: {data}");
            if (predicate(snapshot))
                return data;
        }
    }

    public async ValueTask DisposeAsync()
    {
        _response.Dispose();
        try
        {
            await _events.DisposeAsync();
        }
        catch (Exception ex) when (ex is IOException or OperationCanceledException or ObjectDisposedException)
        {
            // The response is gone; a read still pending on it fails rather than ends
        }
    }
}
