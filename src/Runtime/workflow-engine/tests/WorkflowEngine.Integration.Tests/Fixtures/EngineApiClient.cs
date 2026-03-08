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

    public static string DefaultTenantId => $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}";

    /// <summary>
    /// Enqueues a batch and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(string tenantId, WorkflowEnqueueRequest request)
    {
        using var response = await _client.PostAsJsonAsync(GetTenantPath(tenantId), request);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <inheritdoc cref="Enqueue(string, WorkflowEnqueueRequest)" />
    public Task<WorkflowEnqueueResponse.Accepted> Enqueue(WorkflowEnqueueRequest request) =>
        Enqueue(DefaultTenantId, request);

    /// <summary>
    /// Enqueues a batch from raw JSON and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(string tenantId, string jsonRequest)
    {
        using var content = new StringContent(jsonRequest, new UTF8Encoding(), "application/json");
        using var response = await _client.PostAsync(GetTenantPath(tenantId), content);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <inheritdoc cref="Enqueue(string, string)" />
    public Task<WorkflowEnqueueResponse.Accepted> Enqueue(string jsonRequest) => Enqueue(DefaultTenantId, jsonRequest);

    /// <summary>
    /// Enqueues a batch and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> EnqueueRaw(string tenantId, WorkflowEnqueueRequest request) =>
        _client.PostAsJsonAsync(GetTenantPath(tenantId), request);

    /// <inheritdoc cref="EnqueueRaw(string, WorkflowEnqueueRequest)" />
    public Task<HttpResponseMessage> EnqueueRaw(WorkflowEnqueueRequest request) => EnqueueRaw(DefaultTenantId, request);

    /// <summary>
    /// Gets a workflow status and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> GetWorkflowRaw(string tenantId, Guid workflowId) =>
        _client.GetAsync($"{GetTenantPath(tenantId)}/{workflowId}", CancellationToken.None);

    /// <inheritdoc cref="GetWorkflowRaw(string, Guid)" />
    public Task<HttpResponseMessage> GetWorkflowRaw(Guid workflowId) => GetWorkflowRaw(DefaultTenantId, workflowId);

    /// <summary>
    /// Gets a workflow status and returns either a parsed result or <c>null</c> on 404.
    /// </summary>
    public async Task<WorkflowStatusResponse?> GetWorkflow(string tenantId, Guid workflowId)
    {
        using var response = await GetWorkflowRaw(tenantId, workflowId);

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

    /// <inheritdoc cref="GetWorkflow(string, Guid)" />
    public Task<WorkflowStatusResponse?> GetWorkflow(Guid workflowId) => GetWorkflow(DefaultTenantId, workflowId);

    /// <summary>
    /// Lists active workflows and returns either a parsed result or an empty list on 204 No Content.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> ListActiveWorkflows(string tenantId)
    {
        using var response = await _client.GetAsync(GetTenantPath(tenantId));

        if (response.StatusCode == HttpStatusCode.NoContent)
            return [];

        return await AssertSuccessAndDeserialize<List<WorkflowStatusResponse>>(response);
    }

    /// <inheritdoc cref="ListActiveWorkflows(string)" />
    public Task<List<WorkflowStatusResponse>> ListActiveWorkflows() => ListActiveWorkflows(DefaultTenantId);

    /// <summary>
    /// Polls <see cref="GetWorkflow(string,System.Guid)"/> every 100 ms until the workflow reaches
    /// <paramref name="expectedStatus"/> or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<WorkflowStatusResponse> WaitForWorkflowStatus(
        string tenantId,
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
    {
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            var workflow = await GetWorkflow(tenantId, workflowId);
            if (workflow?.OverallStatus == expectedStatus)
                return workflow;

            await Task.Delay(100, cts.Token);
        }
    }

    /// <inheritdoc cref="WaitForWorkflowStatus(string, Guid, PersistentItemStatus, TimeSpan?)"/>
    public Task<WorkflowStatusResponse> WaitForWorkflowStatus(
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    ) => WaitForWorkflowStatus(DefaultTenantId, workflowId, expectedStatus, timeout);

    /// <summary>
    /// Waits for all workflows in <paramref name="workflowIds"/> to reach
    /// <paramref name="expectedStatus"/> concurrently or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> WaitForWorkflowStatus(
        string tenantId,
        IEnumerable<Guid> workflowIds,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
    {
        var tasks = workflowIds.Select(id => WaitForWorkflowStatus(tenantId, id, expectedStatus, timeout));
        return [.. await Task.WhenAll(tasks)];
    }

    /// <inheritdoc cref="WaitForWorkflowStatus(string, IEnumerable{Guid}, PersistentItemStatus, TimeSpan?)"/>
    public Task<List<WorkflowStatusResponse>> WaitForWorkflowStatus(
        IEnumerable<Guid> workflowIds,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    ) => WaitForWorkflowStatus(DefaultTenantId, workflowIds, expectedStatus, timeout);

    internal static string GetTenantPath(string tenantId) => $"{EngineAppFixture.ApiBasePath}/{tenantId}/workflows";

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
