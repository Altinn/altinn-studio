using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
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
    private const string CollectionKeyHeader = "Collection-Key";

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
        string? collectionKey,
        WorkflowEnqueueRequest request,
        CancellationToken ct = default
    )
    {
        string url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Content = JsonContent.Create(request);
        httpRequest.Headers.Add(IdempotencyKeyHeader, idempotencyKey);

        if (!string.IsNullOrWhiteSpace(collectionKey))
        {
            httpRequest.Headers.Add(CollectionKeyHeader, collectionKey);
        }

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);
        if (!response.IsSuccessStatusCode)
        {
            string body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "Workflow engine enqueue failed with status {StatusCode}. URL: {Url}. Response body: {Body}",
                response.StatusCode,
                url,
                body
            );
        }
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(ct)
            ?? throw new InvalidOperationException(
                "The expected workflow enqueue response was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<WorkflowCollectionDetailResponse?> GetCollection(
        string ns,
        string key,
        CancellationToken ct = default
    )
    {
        string url =
            $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/collections/{Uri.EscapeDataString(key)}";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<WorkflowCollectionDetailResponse>(ct)
            ?? throw new InvalidOperationException(
                "The expected workflow collection detail was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
        string ns,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        CancellationToken ct = default
    )
    {
        var workflows = new List<WorkflowStatusResponse>();
        Guid? cursor = null;

        while (true)
        {
            var url = BuildListWorkflowsUrl(ns, collectionKey, labels, statuses, cursor);
            using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
            using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);

            if (response.StatusCode == HttpStatusCode.NoContent)
            {
                return workflows;
            }

            response.EnsureSuccessStatusCode();

            var paginated =
                await response.Content.ReadFromJsonAsync<PaginatedResponse<WorkflowStatusResponse>>(ct)
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
    public async Task<CancelWorkflowResponse> CancelWorkflow(string ns, Guid workflowId, CancellationToken ct = default)
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/cancel";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<CancelWorkflowResponse>(ct)
            ?? throw new InvalidOperationException(
                "The expected cancel workflow response was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<ResumeWorkflowResponse> ResumeWorkflow(
        string ns,
        Guid workflowId,
        bool cascade = false,
        CancellationToken ct = default
    )
    {
        var cascadeValue = cascade ? "true" : "false";
        var url =
            $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/resume?cascade={cascadeValue}";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ResumeWorkflowResponse>(ct)
            ?? throw new InvalidOperationException(
                "The expected resume workflow response was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<bool> AbandonWorkflow(string ns, Guid workflowId, CancellationToken ct = default)
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/abandon";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);
        if (response.StatusCode == HttpStatusCode.Conflict)
        {
            // Compare-and-set lost: the workflow is not in an abandonable state (e.g. a concurrent
            // resume revived it). The caller must re-read engine state and re-decide.
            return false;
        }

        response.EnsureSuccessStatusCode();
        return true;
    }

    /// <inheritdoc />
    public async Task<MailboxMintResult> MintMailbox(
        string ns,
        MailboxCreateRequest request,
        CancellationToken ct = default
    )
    {
        string url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/mailboxes";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Content = JsonContent.Create(request);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);

        // A 400 cannot change on retry, so it is a value the caller fails permanently on rather than an
        // exception the retry ladder chews on.
        if (response.StatusCode == HttpStatusCode.BadRequest)
        {
            string detail = await ReadProblemDetail(response, ct);
            _logger.LogError(
                "Workflow engine refused the mailbox mint as invalid. URL: {Url}. Detail: {Detail}",
                url,
                detail
            );
            return new MailboxMintResult.Rejected(detail);
        }

        // A 429 (collection cap) stays retryable, but carries the engine's detail so the first failure names
        // the runaway.
        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            string detail = await ReadProblemDetail(response, ct);
            _logger.LogError(
                "Workflow engine mailbox mint hit the open-mailbox cap. URL: {Url}. Detail: {Detail}",
                url,
                detail
            );
            return new MailboxMintResult.AtCapacity(detail);
        }

        if (!response.IsSuccessStatusCode)
        {
            string body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "Workflow engine mailbox mint failed with status {StatusCode}. URL: {Url}. Response body: {Body}",
                response.StatusCode,
                url,
                body
            );
        }
        response.EnsureSuccessStatusCode();

        MailboxResponse mailbox =
            await response.Content.ReadFromJsonAsync<MailboxResponse>(ct)
            ?? throw new InvalidOperationException("The expected mailbox was not found in the mint response content.");

        return new MailboxMintResult.Minted(mailbox);
    }

    /// <inheritdoc />
    public async Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken ct = default)
    {
        string url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/mailboxes/{mailboxId}";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, url);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);

        // A 404 is modeled: the caller's only sensible answer is "nothing left to close".
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogWarning(
                "Workflow engine reported no mailbox to close. URL: {Url}. The mailbox was purged, or it was never "
                    + "minted in this namespace.",
                url
            );
            return null;
        }

        if (!response.IsSuccessStatusCode)
        {
            string body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "Workflow engine mailbox close failed with status {StatusCode}. URL: {Url}. Response body: {Body}",
                response.StatusCode,
                url,
                body
            );
        }
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<MailboxResponse>(ct)
            ?? throw new InvalidOperationException("The expected mailbox was not found in the close response content.");
    }

    /// <summary>
    /// How much of a refused delivery's body travels back for diagnostics; the useful part of ProblemDetails
    /// is at the front.
    /// </summary>
    private const int MaxErrorDetailLength = 512;

    /// <inheritdoc />
    public async Task<MailboxDeliveryResult> DeliverToMailbox(
        string ns,
        Guid mailboxId,
        MailboxDeliveryRequest request,
        CancellationToken ct = default
    )
    {
        string url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/mailboxes/{mailboxId}/deliveries";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Content = JsonContent.Create(request);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);

        if (response.StatusCode is HttpStatusCode.Accepted or HttpStatusCode.OK)
        {
            // The status is the outcome; an unreadable body must not turn an accepted message into a reported
            // failure the caller would forward again.
            MailboxDeliveryResponse? body = null;
            try
            {
                body = await response.Content.ReadFromJsonAsync<MailboxDeliveryResponse>(ct);
            }
            catch (Exception ex) when (ex is JsonException or NotSupportedException)
            {
                _logger.LogWarning(
                    ex,
                    "Workflow engine accepted the delivery into mailbox {MailboxId} with {StatusCode}, but its "
                        + "response body could not be read. The message is delivered; only its position is unknown.",
                    mailboxId,
                    (int)response.StatusCode
                );
            }

            return new MailboxDeliveryResult(response.StatusCode, body, ErrorDetail: null);
        }

        string errorBody = await response.Content.ReadAsStringAsync(ct);
        return new MailboxDeliveryResult(
            response.StatusCode,
            Body: null,
            ErrorDetail: errorBody.Length > MaxErrorDetailLength ? errorBody[..MaxErrorDetailLength] : errorBody
        );
    }

    /// <summary>The <c>detail</c> of a ProblemDetails body, or the raw body when it is not one.</summary>
    private static async Task<string> ReadProblemDetail(HttpResponseMessage response, CancellationToken ct)
    {
        string body = await response.Content.ReadAsStringAsync(ct);
        try
        {
            using JsonDocument document = JsonDocument.Parse(body);
            if (
                document.RootElement.ValueKind == JsonValueKind.Object
                && document.RootElement.TryGetProperty("detail", out JsonElement detail)
                && detail.ValueKind == JsonValueKind.String
            )
            {
                return detail.GetString() ?? body;
            }
        }
        catch (JsonException)
        {
            // Not JSON at all (a proxy's HTML error page, say) — the raw body is the best we have.
        }

        return body;
    }

    private string BuildListWorkflowsUrl(
        string ns,
        string? collectionKey,
        Dictionary<string, string>? labels,
        IReadOnlyList<PersistentItemStatus>? statuses,
        Guid? cursor
    )
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows";
        var queryParams = new List<string>();

        if (!string.IsNullOrWhiteSpace(collectionKey))
        {
            queryParams.Add($"collectionKey={Uri.EscapeDataString(collectionKey)}");
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
