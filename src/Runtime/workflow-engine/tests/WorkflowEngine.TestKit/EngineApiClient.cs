using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using WorkflowEngine.Models;

namespace WorkflowEngine.TestKit;

/// <summary>
/// Typed wrapper around <see cref="HttpClient"/> for the workflow-engine REST API.
/// Handles serialization, path building, and status-polling.
/// </summary>
public sealed class EngineApiClient : IDisposable
{
    private const string BasePath = "/api/v1/workflows";
    private readonly HttpClient _client;

    public EngineApiClient(EngineAppFixture fixture, params DelegatingHandler[] handlers)
    {
        _client = handlers.Length > 0 ? fixture.CreateEngineClient(handlers) : fixture.CreateEngineClient();
    }

    public static string DefaultNamespace => $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}";

    /// <summary>
    /// Enqueues a batch and asserts a 2xx response. Throws on failure.
    /// Automatically generates an idempotency key and sets default namespace/correlation ID headers.
    /// </summary>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(
        WorkflowEnqueueRequest request,
        string? ns = null,
        string? idempotencyKey = null,
        Guid? correlationId = null
    )
    {
        using var response = await EnqueueRaw(request, ns, idempotencyKey, correlationId);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <summary>
    /// Enqueues a batch from raw JSON and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(
        string jsonRequest,
        string? ns = null,
        string? idempotencyKey = null,
        Guid? correlationId = null
    )
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, BasePath)
        {
            Content = new StringContent(jsonRequest, new UTF8Encoding(), "application/json"),
        };
        AddMetadataHeaders(httpRequest.Headers, ns, idempotencyKey, correlationId);

        using var response = await _client.SendAsync(httpRequest);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <summary>
    /// Enqueues a batch and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> EnqueueRaw(
        WorkflowEnqueueRequest request,
        string? ns = null,
        string? idempotencyKey = null,
        Guid? correlationId = null
    )
    {
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, BasePath)
        {
            Content = new StringContent(JsonSerializer.Serialize(request), new UTF8Encoding(), "application/json"),
        };
        AddMetadataHeaders(httpRequest.Headers, ns, idempotencyKey, correlationId);

        return _client.SendAsync(httpRequest);
    }

    /// <summary>
    /// Gets a workflow status and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> GetWorkflowRaw(Guid workflowId, string? ns = null) =>
        _client.GetAsync(GetWorkflowPath(workflowId, ns), CancellationToken.None);

    /// <summary>
    /// Gets a workflow status and returns either a parsed result or <c>null</c> on 404.
    /// </summary>
    public async Task<WorkflowStatusResponse?> GetWorkflow(Guid workflowId, string? ns = null)
    {
        using var response = await GetWorkflowRaw(workflowId, ns);

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
    /// Requests cancellation of a workflow and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> CancelWorkflowRaw(Guid workflowId, string? ns = null)
    {
        var path = $"{BasePath}/{workflowId}/cancel?namespace={Uri.EscapeDataString(ns ?? DefaultNamespace)}";
        return _client.PostAsync(path, content: null);
    }

    /// <summary>
    /// Requests cancellation of a workflow and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<CancelWorkflowResponse> CancelWorkflow(Guid workflowId, string? ns = null)
    {
        using var response = await CancelWorkflowRaw(workflowId, ns);
        return await AssertSuccessAndDeserialize<CancelWorkflowResponse>(response);
    }

    /// <summary>
    /// Requests resume of a workflow and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> ResumeWorkflowRaw(Guid workflowId, bool cascade = false, string? ns = null)
    {
        var path =
            $"{BasePath}/{workflowId}/resume?cascade={cascade}&namespace={Uri.EscapeDataString(ns ?? DefaultNamespace)}";
        return _client.PostAsync(path, content: null);
    }

    /// <summary>
    /// Requests resume of a workflow and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<ResumeWorkflowResponse> ResumeWorkflow(Guid workflowId, bool cascade = false, string? ns = null)
    {
        using var response = await ResumeWorkflowRaw(workflowId, cascade, ns);
        return await AssertSuccessAndDeserialize<ResumeWorkflowResponse>(response);
    }

    /// <summary>
    /// Lists active workflows and returns either a parsed result or an empty list on 204 No Content.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> ListActiveWorkflows(string? ns = null)
    {
        ns ??= DefaultNamespace;
        var path = $"{BasePath}?namespace={Uri.EscapeDataString(ns)}";
        using var response = await _client.GetAsync(path);

        if (response.StatusCode == HttpStatusCode.NoContent)
            return [];

        return await AssertSuccessAndDeserialize<List<WorkflowStatusResponse>>(response);
    }

    /// <summary>
    /// Polls <see cref="GetWorkflow(Guid, string?)"/> every 100 ms until the workflow reaches
    /// <paramref name="expectedStatus"/> or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<WorkflowStatusResponse> WaitForWorkflowStatus(
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null,
        string? ns = null
    )
    {
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            var workflow = await GetWorkflow(workflowId, ns);
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
        TimeSpan? timeout = null,
        string? ns = null
    )
    {
        var tasks = workflowIds.Select(id => WaitForWorkflowStatus(id, expectedStatus, timeout, ns));
        return [.. await Task.WhenAll(tasks)];
    }

    private static string GetWorkflowPath(Guid workflowId, string? ns) =>
        $"{BasePath}/{workflowId}?namespace={Uri.EscapeDataString(ns ?? DefaultNamespace)}";

    private static void AddMetadataHeaders(
        HttpRequestHeaders headers,
        string? ns,
        string? idempotencyKey,
        Guid? correlationId
    )
    {
        headers.Add(WorkflowMetadataConstants.Headers.Namespace, ns ?? DefaultNamespace);
        headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, idempotencyKey ?? $"idem-{Guid.NewGuid()}");
        if (correlationId.HasValue)
            headers.Add(WorkflowMetadataConstants.Headers.CorrelationId, correlationId.Value.ToString());
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
