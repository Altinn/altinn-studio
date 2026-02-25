using System.Net;
using System.Net.Http.Json;
using WorkflowEngine.Models;

// CA2234: Pass System.Uri objects instead of strings
#pragma warning disable CA2234

namespace WorkflowEngine.EndToEndTests.Fixtures;

/// <summary>
/// Typed wrapper around <see cref="HttpClient"/> for the workflow-engine REST API.
/// Handles serialization, path building, and status-polling.
/// </summary>
internal sealed class EngineApiClient(HttpClient client) : IDisposable
{
    private const string BasePath = "/api/v1/workflows";

    // ── Enqueue ───────────────────────────────────────────────────────────────

    /// <summary>Enqueues a batch and asserts a 2xx response. Throws on failure.</summary>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(
        string org,
        string app,
        int partyId,
        Guid instanceGuid,
        WorkflowEnqueueRequest request
    )
    {
        using var response = await client.PostAsJsonAsync(InstancePath(org, app, partyId, instanceGuid), request);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <summary>Enqueues a batch and returns the raw <see cref="HttpResponseMessage"/>.</summary>
    public Task<HttpResponseMessage> EnqueueRaw(
        string org,
        string app,
        int partyId,
        Guid instanceGuid,
        WorkflowEnqueueRequest request
    ) => client.PostAsJsonAsync(InstancePath(org, app, partyId, instanceGuid), request);

    // ── Queries ───────────────────────────────────────────────────────────────

    /// <summary>Returns <c>null</c> on 404.</summary>
    public async Task<WorkflowStatusResponse?> GetWorkflow(
        string org,
        string app,
        int partyId,
        Guid instanceGuid,
        long workflowId
    )
    {
        using var response = await client.GetAsync(
            $"{InstancePath(org, app, partyId, instanceGuid)}/{workflowId}",
            CancellationToken.None
        );

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"GetWorkflow returned {(int)response.StatusCode} {response.StatusCode}: {body}",
                inner: null,
                statusCode: response.StatusCode
            );
        }

        return await AssertSuccessAndDeserialize<WorkflowStatusResponse>(response);
    }

    /// <summary>Returns an empty list on 204 No Content.</summary>
    public async Task<List<WorkflowStatusResponse>> ListActiveWorkflows(
        string org,
        string app,
        int partyId,
        Guid instanceGuid
    )
    {
        using var response = await client.GetAsync(InstancePath(org, app, partyId, instanceGuid));

        if (response.StatusCode == HttpStatusCode.NoContent)
            return [];

        return await AssertSuccessAndDeserialize<List<WorkflowStatusResponse>>(response);
    }

    // ── Polling ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Polls <see cref="GetWorkflow"/> every 100 ms until the workflow reaches
    /// <paramref name="expectedStatus"/> or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<WorkflowStatusResponse> WaitForStatus(
        string org,
        string app,
        int partyId,
        Guid instanceGuid,
        long workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    )
    {
        timeout ??= TimeSpan.FromSeconds(15);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(timeout.Value);

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            var workflow = await GetWorkflow(org, app, partyId, instanceGuid, workflowId);
            if (workflow?.OverallStatus == expectedStatus)
                return workflow;

            await Task.Delay(100, cts.Token);
        }
    }

    /// <summary>
    /// Waits for all workflows in <paramref name="workflowIds"/> to reach
    /// <paramref name="expectedStatus"/> concurrently.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> WaitForAllStatus(
        string org,
        string app,
        int partyId,
        Guid instanceGuid,
        IEnumerable<long> workflowIds,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    )
    {
        var tasks = workflowIds.Select(id =>
            WaitForStatus(org, app, partyId, instanceGuid, id, expectedStatus, timeout, cancellationToken)
        );
        return [.. await Task.WhenAll(tasks)];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string InstancePath(string org, string app, int partyId, Guid instanceGuid) =>
        $"{BasePath}/{org}/{app}/{partyId}/{instanceGuid}";

    public void Dispose() => client.Dispose();

    private static async Task<T> AssertSuccessAndDeserialize<T>(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException(
                $"Request failed with status code {response.StatusCode}: {await response.Content.ReadAsStringAsync()}"
            );

        var content = await response.Content.ReadFromJsonAsync<T>();
        Assert.NotNull(content);

        return content;
    }
}
