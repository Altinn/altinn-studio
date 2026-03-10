using System.Net;
using System.Net.Http.Json;
using System.Text;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests.Fixtures;

/// <summary>
/// Typed wrapper around <see cref="HttpClient"/> for the workflow-engine REST API.
/// Handles serialization, path building, and status-polling.
/// </summary>
internal sealed class EngineApiClient(EngineAppFixture fixture) : IDisposable
{
    private readonly HttpClient _client = fixture.CreateEngineClient();

    /// <summary>
    /// Enqueues a batch and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(WorkflowEnqueueRequest request)
    {
        using var response = await _client.PostAsJsonAsync(EngineAppFixture.ApiBasePath, request);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <summary>
    /// Enqueues a batch from raw JSON and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(string jsonRequest)
    {
        using var content = new StringContent(jsonRequest, new UTF8Encoding(), "application/json");
        using var response = await _client.PostAsync(EngineAppFixture.ApiBasePath, content);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <summary>
    /// Enqueues a batch and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> EnqueueRaw(WorkflowEnqueueRequest request) =>
        _client.PostAsJsonAsync(EngineAppFixture.ApiBasePath, request);

    /// <summary>
    /// Gets a workflow status and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> GetWorkflowRaw(Guid workflowId) =>
        _client.GetAsync($"{EngineAppFixture.ApiBasePath}/{workflowId}", CancellationToken.None);

    /// <summary>
    /// Gets a workflow status and returns either a parsed result or <c>null</c> on 404.
    /// </summary>
    public async Task<WorkflowStatusResponse?> GetWorkflow(Guid workflowId)
    {
        using var response = await GetWorkflowRaw(workflowId);

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

    /// <summary>
    /// Lists active workflows by correlation ID and returns either a parsed result or an empty list on 204 No Content.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> ListActiveWorkflows(Guid correlationId)
    {
        using var response = await _client.GetAsync($"{EngineAppFixture.ApiBasePath}?correlationId={correlationId}");

        if (response.StatusCode == HttpStatusCode.NoContent)
            return [];

        return await AssertSuccessAndDeserialize<List<WorkflowStatusResponse>>(response);
    }

    /// <summary>
    /// Polls <see cref="GetWorkflow(System.Guid)"/> every 100 ms until the workflow reaches
    /// <paramref name="expectedStatus"/> or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<WorkflowStatusResponse> WaitForWorkflowStatus(
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
    {
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            var workflow = await GetWorkflow(workflowId);
            if (workflow?.OverallStatus == expectedStatus)
                return workflow;

            await Task.Delay(100, cts.Token);
        }
    }

    /// <summary>
    /// Waits for all workflows in <paramref name="workflowIds"/> to reach
    /// <paramref name="expectedStatus"/> concurrently or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> WaitForWorkflowStatus(
        IEnumerable<Guid> workflowIds,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
    {
        var tasks = workflowIds.Select(id => WaitForWorkflowStatus(id, expectedStatus, timeout));
        return [.. await Task.WhenAll(tasks)];
    }

    public static async Task<T> AssertSuccessAndDeserialize<T>(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException(
                $"Request failed with status code {response.StatusCode}: {await response.Content.ReadAsStringAsync()}"
            );

        var content = await response.Content.ReadFromJsonAsync<T>();
        Assert.NotNull(content);

        return content;
    }

    public void Dispose() => _client.Dispose();
}
