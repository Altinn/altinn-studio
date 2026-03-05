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
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(
        string org,
        string app,
        string partyId,
        Guid instanceGuid,
        WorkflowEnqueueRequest request
    )
    {
        using var response = await _client.PostAsJsonAsync(GetInstancePath(org, app, partyId, instanceGuid), request);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <inheritdoc cref="Enqueue(string, string, string, Guid, WorkflowEnqueueRequest)" />
    public Task<WorkflowEnqueueResponse.Accepted> Enqueue(Guid instanceGuid, WorkflowEnqueueRequest request) =>
        Enqueue(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid,
            request
        );

    /// <inheritdoc cref="Enqueue(string, string, string, Guid, WorkflowEnqueueRequest)" />
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(
        string org,
        string app,
        string partyId,
        Guid instanceGuid,
        string jsonRequest
    )
    {
        using var content = new StringContent(jsonRequest, new UTF8Encoding(), "application/json");
        using var response = await _client.PostAsync(GetInstancePath(org, app, partyId, instanceGuid), content);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <inheritdoc cref="Enqueue(string, string, string, Guid, WorkflowEnqueueRequest)" />
    public Task<WorkflowEnqueueResponse.Accepted> Enqueue(Guid instanceGuid, string jsonRequest) =>
        Enqueue(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid,
            jsonRequest
        );

    /// <summary>
    /// Enqueues a batch and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> EnqueueRaw(
        string org,
        string app,
        string partyId,
        Guid instanceGuid,
        WorkflowEnqueueRequest request
    ) => _client.PostAsJsonAsync(GetInstancePath(org, app, partyId, instanceGuid), request);

    /// <inheritdoc cref="EnqueueRaw(string, string, string, Guid, WorkflowEnqueueRequest)" />
    public Task<HttpResponseMessage> EnqueueRaw(Guid instanceGuid, WorkflowEnqueueRequest request) =>
        EnqueueRaw(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid,
            request
        );

    /// <summary>
    /// Gets a workflow status and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> GetWorkflowRaw(
        string org,
        string app,
        string partyId,
        Guid instanceGuid,
        Guid workflowId
    ) => _client.GetAsync($"{GetInstancePath(org, app, partyId, instanceGuid)}/{workflowId}", CancellationToken.None);

    /// <inheritdoc cref="GetWorkflowRaw(string, string, string, Guid, Guid)" />
    public Task<HttpResponseMessage> GetWorkflowRaw(Guid instanceGuid, Guid workflowId) =>
        GetWorkflowRaw(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid,
            workflowId
        );

    /// <summary>
    /// Gets a workflow status and returns either a parsed result or <c>null</c> on 404.
    /// </summary>
    public async Task<WorkflowStatusResponse?> GetWorkflow(
        string org,
        string app,
        string partyId,
        Guid instanceGuid,
        Guid workflowId
    )
    {
        using var response = await GetWorkflowRaw(org, app, partyId, instanceGuid, workflowId);

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

    /// <inheritdoc cref="GetWorkflow(string, string, string, Guid, Guid)" />
    public Task<WorkflowStatusResponse?> GetWorkflow(Guid instanceGuid, Guid workflowId) =>
        GetWorkflow(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid,
            workflowId
        );

    /// <summary>
    /// Lists active workflows and returns either a parsed result or an empty list on 204 No Content.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> ListActiveWorkflows(
        string org,
        string app,
        string partyId,
        Guid instanceGuid
    )
    {
        using var response = await _client.GetAsync(GetInstancePath(org, app, partyId, instanceGuid));

        if (response.StatusCode == HttpStatusCode.NoContent)
            return [];

        return await AssertSuccessAndDeserialize<List<WorkflowStatusResponse>>(response);
    }

    /// <inheritdoc cref="ListActiveWorkflows(string, string, string, Guid)" />
    public Task<List<WorkflowStatusResponse>> ListActiveWorkflows(Guid instanceGuid) =>
        ListActiveWorkflows(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid
        );

    /// <summary>
    /// Polls <see cref="GetWorkflow(string,string,string,System.Guid,System.Guid)"/> every 100 ms until the workflow reaches
    /// <paramref name="expectedStatus"/> or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<WorkflowStatusResponse> WaitForWorkflowStatus(
        string org,
        string app,
        string partyId,
        Guid instanceGuid,
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
    {
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            var workflow = await GetWorkflow(org, app, partyId, instanceGuid, workflowId);
            if (workflow?.OverallStatus == expectedStatus)
                return workflow;

            await Task.Delay(100, cts.Token);
        }
    }

    /// <inheritdoc cref="WaitForWorkflowStatus"/>
    public Task<WorkflowStatusResponse> WaitForWorkflowStatus(
        Guid instanceGuid,
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    ) =>
        WaitForWorkflowStatus(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid,
            workflowId,
            expectedStatus,
            timeout
        );

    /// <summary>
    /// Waits for all workflows in <paramref name="workflowIds"/> to reach
    /// <paramref name="expectedStatus"/> concurrently or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> WaitForWorkflowStatus(
        string org,
        string app,
        string partyId,
        Guid instanceGuid,
        IEnumerable<Guid> workflowIds,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
    {
        var tasks = workflowIds.Select(id =>
            WaitForWorkflowStatus(org, app, partyId, instanceGuid, id, expectedStatus, timeout)
        );
        return [.. await Task.WhenAll(tasks)];
    }

    /// <inheritdoc cref="WaitForWorkflowStatus(string,string,string,System.Guid,System.Collections.Generic.IEnumerable{System.Guid},WorkflowEngine.Models.PersistentItemStatus,System.TimeSpan?)"/>
    public Task<List<WorkflowStatusResponse>> WaitForWorkflowStatus(
        Guid instanceGuid,
        IEnumerable<Guid> workflowIds,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    ) =>
        WaitForWorkflowStatus(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid,
            workflowIds,
            expectedStatus,
            timeout
        );

    internal static string GetInstancePath(string org, string app, string partyId, Guid instanceGuid) =>
        $"{EngineAppFixture.ApiBasePath}/{org}/{app}/{partyId}/{instanceGuid}";

    internal static string GetInstancePath(Guid instanceGuid) =>
        GetInstancePath(
            EngineAppFixture.DefaultOrg,
            EngineAppFixture.DefaultApp,
            EngineAppFixture.DefaultPartyId,
            instanceGuid
        );

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
