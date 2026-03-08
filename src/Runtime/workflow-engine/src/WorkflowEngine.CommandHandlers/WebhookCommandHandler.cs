using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using WorkflowEngine.CommandHandlers.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.CommandHandlers;

/// <summary>
/// Handles "webhook" commands by making HTTP requests to arbitrary endpoints.
/// If <c>Command.Data</c> includes a <c>payload</c>, sends a POST; otherwise sends a GET.
/// </summary>
public sealed class WebhookCommandHandler : ICommandHandler
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConcurrencyLimiter _limiter;
    private readonly ILogger<WebhookCommandHandler> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public string CommandType => "webhook";

    public WebhookCommandHandler(
        IHttpClientFactory httpClientFactory,
        IConcurrencyLimiter limiter,
        ILogger<WebhookCommandHandler> logger
    )
    {
        _httpClientFactory = httpClientFactory;
        _limiter = limiter;
        _logger = logger;
    }

    public async Task<ExecutionResult> ExecuteAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        var data = DeserializeCommandData(context.CommandData);
        var parentCtx = context.ParentTraceContext ?? context.Step.EngineActivity?.Context;

        using var activity = Metrics.Source.StartActivity(
            "WebhookCommandHandler.Execute",
            parentContext: parentCtx,
            kind: ActivityKind.Client,
            tags: [("command.uri", data.Uri)]
        );

        using var slot = await _limiter.AcquireHttpSlot(activity?.Context ?? parentCtx, cancellationToken);

        var endpoint = data.Uri.ToUri(UriKind.Absolute);
        using var httpClient = _httpClientFactory.CreateClient();

        using HttpResponseMessage response = data.Payload is not null
            ? await PostWithPayload(httpClient, endpoint, data, cancellationToken)
            : await GetWithoutPayload(httpClient, endpoint, cancellationToken);

        if (response.IsSuccessStatusCode)
            return ExecutionResult.Success();

        var statusCode = (int)response.StatusCode;
        var errorBody = await response.GetContentOrDefault("<no body content>", cancellationToken);

        // 4xx client errors (except 408/429) are not worth retrying
        if (statusCode is >= 400 and < 500 and not 408 and not 429)
            return ExecutionResult.CriticalError($"Webhook failed with client error {statusCode}: {errorBody}");

        return ExecutionResult.RetryableError($"Webhook execution failed with status {statusCode}: {errorBody}");
    }

    private async Task<HttpResponseMessage> PostWithPayload(
        HttpClient httpClient,
        Uri endpoint,
        WebhookCommandData data,
        CancellationToken cancellationToken
    )
    {
        using var content = new StringContent(data.Payload!);
        content.Headers.ContentType = data.ContentType is not null ? new MediaTypeHeaderValue(data.ContentType) : null;

        _logger.SendingWebhookPost(endpoint, data.Payload!);
        return await httpClient.PostAsync(endpoint, content, cancellationToken);
    }

    private async Task<HttpResponseMessage> GetWithoutPayload(
        HttpClient httpClient,
        Uri endpoint,
        CancellationToken cancellationToken
    )
    {
        _logger.SendingWebhookGet(endpoint);
        return await httpClient.GetAsync(endpoint, cancellationToken);
    }

    public string? Validate(JsonElement? commandData, JsonElement? workflowContext)
    {
        if (commandData is null)
            return "Webhook command requires data with a 'uri' field";

        WebhookCommandData? data;
        try
        {
            data = commandData.Value.Deserialize<WebhookCommandData>(JsonOptions);
        }
        catch (JsonException)
        {
            return "Webhook command requires a 'uri' in command data";
        }

        if (data is null || string.IsNullOrWhiteSpace(data.Uri))
            return "Webhook command requires a 'uri' in command data";

        if (!Uri.TryCreate(data.Uri, UriKind.Absolute, out _))
            return $"Webhook uri '{data.Uri}' is not a valid absolute URI";

        return null;
    }

    private static WebhookCommandData DeserializeCommandData(JsonElement? data) =>
        data?.Deserialize<WebhookCommandData>(JsonOptions)
        ?? throw new InvalidOperationException("Webhook command requires data with at least a 'uri'");

    private sealed record WebhookCommandData
    {
        [JsonPropertyName("uri")]
        public required string Uri { get; init; }

        [JsonPropertyName("payload")]
        public string? Payload { get; init; }

        [JsonPropertyName("contentType")]
        public string? ContentType { get; init; }
    }
}

internal static partial class WebhookCommandHandlerLogs
{
    [LoggerMessage(LogLevel.Information, "[POST] Sending Webhook to {Endpoint} with payload: {Payload}")]
    public static partial void SendingWebhookPost(
        this ILogger<WebhookCommandHandler> logger,
        Uri endpoint,
        string payload
    );

    [LoggerMessage(LogLevel.Information, "[GET] Sending Webhook to {Endpoint} without payload")]
    public static partial void SendingWebhookGet(this ILogger<WebhookCommandHandler> logger, Uri endpoint);
}
