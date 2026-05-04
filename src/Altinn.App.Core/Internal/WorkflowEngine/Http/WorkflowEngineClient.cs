using System.Net;
using System.Net.Http.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.WorkflowEngine.Http;

/// <summary>
/// HTTP client for communicating with the workflow engine service.
/// </summary>
internal sealed class WorkflowEngineClient : IWorkflowEngineClient
{
    private const string IdempotencyKeyHeader = "Idempotency-Key";
    private const string CorrelationIdHeader = "Correlation-Id";

    private readonly HttpClient _httpClient;
    private readonly PlatformSettings _platformSettings;
    private readonly ILogger<WorkflowEngineClient> _logger;

    public WorkflowEngineClient(
        HttpClient httpClient,
        IOptions<PlatformSettings> platformSettings,
        ILogger<WorkflowEngineClient> logger
    )
    {
        _httpClient = httpClient;
        _platformSettings = platformSettings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
        string ns,
        string idempotencyKey,
        Guid? correlationId,
        WorkflowEnqueueRequest request,
        CancellationToken cancellationToken = default
    )
    {
        string url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Content = JsonContent.Create(request);
        httpRequest.Headers.Add(IdempotencyKeyHeader, idempotencyKey);
        if (correlationId.HasValue)
        {
            httpRequest.Headers.Add(CorrelationIdHeader, correlationId.Value.ToString());
        }

        HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            string body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "Workflow engine enqueue failed with status {StatusCode}. URL: {Url}. Response body: {Body}",
                response.StatusCode,
                url,
                body
            );
        }
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(
                cancellationToken: cancellationToken
            )
            ?? throw new InvalidOperationException(
                "The expected workflow enqueue response was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<WorkflowStatusResponse?> GetWorkflow(
        string ns,
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);

        HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await response.Content.ReadFromJsonAsync<WorkflowStatusResponse>(
                    cancellationToken: cancellationToken
                )
                ?? throw new InvalidOperationException(
                    "The expected workflow status was not found in the response content."
                );
        }

        return null;
    }

    /// <inheritdoc />
    public async Task<WorkflowHierarchyResponse?> GetWorkflowHierarchy(
        string ns,
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/hierarchy";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<WorkflowHierarchyResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException(
                "The expected workflow hierarchy was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
        string ns,
        Guid? correlationId = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        CancellationToken cancellationToken = default
    )
    {
        var workflows = new List<WorkflowStatusResponse>();
        Guid? cursor = null;

        while (true)
        {
            var url = BuildListWorkflowsUrl(ns, correlationId, labels, statuses, cursor);
            using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
            using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, cancellationToken);

            if (response.StatusCode == HttpStatusCode.NoContent)
            {
                return workflows;
            }

            response.EnsureSuccessStatusCode();

            var paginated =
                await response.Content.ReadFromJsonAsync<PaginatedResponse<WorkflowStatusResponse>>(
                    cancellationToken: cancellationToken
                )
                ?? throw new InvalidOperationException(
                    "The expected workflow list page was not found in the response content."
                );

            workflows.AddRange(paginated.Data);

            if (paginated.NextCursor is null)
            {
                return workflows;
            }

            cursor = paginated.NextCursor;
        }
    }

    /// <inheritdoc />
    public async Task<CancelWorkflowResponse> CancelWorkflow(
        string ns,
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/cancel";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);

        HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<CancelWorkflowResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException(
                "The expected cancel workflow response was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<ResumeWorkflowResponse> ResumeWorkflow(
        string ns,
        Guid workflowId,
        bool cascade = false,
        CancellationToken cancellationToken = default
    )
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/resume";
        if (cascade)
        {
            url += "?cascade=true";
        }

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);

        HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ResumeWorkflowResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException(
                "The expected resume workflow response was not found in the response content."
            );
    }

    private string BuildListWorkflowsUrl(
        string ns,
        Guid? correlationId,
        Dictionary<string, string>? labels,
        IReadOnlyList<PersistentItemStatus>? statuses,
        Guid? cursor
    )
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows";
        var queryParams = new List<string>();

        if (correlationId.HasValue)
        {
            queryParams.Add($"correlationId={correlationId.Value}");
        }
        if (labels is not null)
        {
            foreach (var (key, value) in labels)
            {
                queryParams.Add($"label={Uri.EscapeDataString(key)}:{Uri.EscapeDataString(value)}");
            }
        }
        if (statuses is not null)
        {
            foreach (var status in statuses)
            {
                queryParams.Add($"status={Uri.EscapeDataString(status.ToString())}");
            }
        }
        if (cursor.HasValue)
        {
            queryParams.Add($"cursor={cursor.Value}");
        }

        if (queryParams.Count > 0)
        {
            url += "?" + string.Join("&", queryParams);
        }

        return url;
    }

    private string GetWorkflowEngineEndpoint() => _platformSettings.ApiWorkflowEngineEndpoint.TrimEnd('/');
}
