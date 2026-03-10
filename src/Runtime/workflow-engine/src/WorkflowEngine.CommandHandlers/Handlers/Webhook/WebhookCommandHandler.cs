using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using WorkflowEngine.CommandHandlers.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

// CA1822: Mark members as static
#pragma warning disable CA1822

namespace WorkflowEngine.CommandHandlers.Handlers.Webhook;

/// <summary>
/// Handles "webhook" commands by making HTTP requests to arbitrary endpoints.
/// If <c>Command.Data</c> includes a <c>payload</c>, sends a POST; otherwise sends a GET.
/// </summary>
public sealed class WebhookCommandHandler : ICommandHandler
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConcurrencyLimiter _limiter;
    private readonly ILogger<WebhookCommandHandler> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

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
        WebhookCommandData commandData;

        try
        {
            commandData = DeserializeCommandData(context.CommandData);
        }
        catch (Exception ex)
        {
            return ExecutionResult.CriticalError(
                $"An unrecoverable error occurred in {nameof(WebhookCommandHandler)}: {ex.Message}"
            );
        }

        using var activity = Metrics.Source.StartActivity(
            "WebhookCommandHandler.Execute",
            parentContext: context.ParentTraceContext ?? context.Step.EngineActivity?.Context,
            kind: ActivityKind.Client,
            tags: [("command.uri", commandData.Uri)]
        );

        using var slot = await _limiter.AcquireHttpSlot(activity?.Context, cancellationToken);
        using var httpClient = _httpClientFactory.CreateClient();

        var endpoint = commandData.Uri.ToUri(UriKind.Absolute);

        using var response = commandData.Payload is not null
            ? await Post(httpClient, endpoint, commandData.Payload, commandData.ContentType, cancellationToken)
            : await Get(httpClient, endpoint, cancellationToken);

        if (response.IsSuccessStatusCode)
            return ExecutionResult.Success();

        var statusCode = (int)response.StatusCode;
        var errorBody = await response.GetContentOrDefault("<no body content>", cancellationToken);

        // 4xx client errors (except 408/429) are not worth retrying
        if (statusCode is >= 400 and < 500 and not 408 and not 429)
            return ExecutionResult.CriticalError($"Webhook failed with client error {statusCode}: {errorBody}");

        return ExecutionResult.RetryableError($"Webhook execution failed with status {statusCode}: {errorBody}");
    }

    private async Task<HttpResponseMessage> Post(
        HttpClient httpClient,
        Uri endpoint,
        string payload,
        string? contentType,
        CancellationToken cancellationToken
    )
    {
        using var content = new StringContent(payload);
        content.Headers.ContentType = contentType is not null ? new MediaTypeHeaderValue(contentType) : null;

        _logger.SendingWebhookPost(endpoint, payload);
        return await httpClient.PostAsync(endpoint, content, cancellationToken);
    }

    private async Task<HttpResponseMessage> Get(
        HttpClient httpClient,
        Uri endpoint,
        CancellationToken cancellationToken
    )
    {
        _logger.SendingWebhookGet(endpoint);
        return await httpClient.GetAsync(endpoint, cancellationToken);
    }

    public CommandValidationResult Validate(JsonElement? commandData, JsonElement? workflowContext)
    {
        try
        {
            WebhookCommandData data = DeserializeCommandData(commandData);

            if (!Uri.TryCreate(data.Uri, UriKind.Absolute, out _))
                return CommandValidationResult.Reject($"Webhook uri '{data.Uri}' is not a valid absolute URI");

            return CommandValidationResult.Accept();
        }
        catch (Exception ex)
        {
            return CommandValidationResult.Reject(ex.Message);
        }
    }

    private static WebhookCommandData DeserializeCommandData(JsonElement? commandData)
    {
        if (commandData is null)
            throw new ArgumentNullException(nameof(commandData));

        WebhookCommandData? data = commandData.Value.Deserialize<WebhookCommandData>(_jsonOptions);

        if (string.IsNullOrWhiteSpace(data?.Uri))
            throw new InvalidOperationException("Webhook command requires a 'uri' in command data");

        return data;
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
