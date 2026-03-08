using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.CommandHandlers.Altinn;
using WorkflowEngine.CommandHandlers.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.CommandHandlers;

/// <summary>
/// Handles "app" commands by making HTTP callbacks to the Altinn application.
/// Extracts actor, lockToken, and instance information from <see cref="Workflow.Context"/>
/// and command-specific data from <see cref="Command.Data"/>.
/// </summary>
public sealed class AppCommandHandler : ICommandHandler
{
    private readonly AppCommandSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConcurrencyLimiter _limiter;
    private readonly ILogger<AppCommandHandler> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public string CommandType => "app";

    public AppCommandHandler(
        IOptions<AppCommandSettings> settings,
        IHttpClientFactory httpClientFactory,
        IConcurrencyLimiter limiter,
        ILogger<AppCommandHandler> logger
    )
    {
        _settings = settings.Value;
        _httpClientFactory = httpClientFactory;
        _limiter = limiter;
        _logger = logger;
    }

    public string? Validate(JsonElement? commandData, JsonElement? workflowContext)
    {
        if (commandData is null)
            return "AppCommand requires command data with at least a 'commandKey'";

        try
        {
            var data = commandData.Value.Deserialize<AppCommandData>(JsonOptions);
            if (data is null || string.IsNullOrWhiteSpace(data.CommandKey))
                return "AppCommand requires a 'commandKey' in command data";

            if (!Uri.TryCreate(data.CommandKey, UriKind.Relative, out _))
                return $"AppCommand 'commandKey' value '{data.CommandKey}' is not a valid relative URI";
        }
        catch (JsonException)
        {
            return "AppCommand requires a 'commandKey' in command data";
        }

        if (workflowContext is null)
            return "AppCommand requires workflow context with actor and instance info";

        try
        {
            var ctx = workflowContext.Value.Deserialize<AppWorkflowContext>(JsonOptions);
            if (ctx is null)
                return "AppCommand workflow context could not be deserialized";

            if (string.IsNullOrWhiteSpace(ctx.Actor?.UserIdOrOrgNumber))
                return "AppCommand requires an 'actor' with 'userIdOrOrgNumber' in workflow context";

            if (string.IsNullOrWhiteSpace(ctx.Org) || string.IsNullOrWhiteSpace(ctx.App))
                return "AppCommand requires 'org' and 'app' in workflow context";

            if (ctx.InstanceOwnerPartyId <= 0)
                return "AppCommand requires a valid 'instanceOwnerPartyId' (> 0) in workflow context";

            if (ctx.InstanceGuid == Guid.Empty)
                return "AppCommand requires a non-empty 'instanceGuid' in workflow context";

            if (string.IsNullOrWhiteSpace(ctx.LockToken))
                return "AppCommand requires a 'lockToken' in workflow context";
        }
        catch (JsonException)
        {
            return "AppCommand workflow context is missing required fields (actor, org, app, instanceOwnerPartyId, instanceGuid)";
        }

        return null;
    }

    public async Task<ExecutionResult> ExecuteAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        var commandData = DeserializeCommandData(context.CommandData);
        var workflowContext = DeserializeWorkflowContext(context.Workflow.Context);

        if (string.IsNullOrWhiteSpace(workflowContext.LockToken))
            return ExecutionResult.CriticalError("Missing lockToken in workflow context for app callback");

        var parentCtx = context.ParentTraceContext ?? context.Step.EngineActivity?.Context;

        using var activity = Metrics.Source.StartActivity(
            "AppCommandHandler.Execute",
            parentContext: parentCtx,
            kind: ActivityKind.Client,
            tags: [("command.key", commandData.CommandKey)]
        );

        using var slot = await _limiter.AcquireHttpSlot(activity?.Context ?? parentCtx, cancellationToken);

        using var httpClient = CreateAuthorizedClient(workflowContext);

        var payload = new AppCallbackPayload
        {
            CommandKey = commandData.CommandKey,
            Actor = workflowContext.Actor,
            LockToken = workflowContext.LockToken,
            Payload = commandData.Payload,
            WorkflowId = context.Workflow.DatabaseId,
            State = context.StateIn,
        };

        var endpoint = commandData.CommandKey.ToUri(UriKind.Relative);
        using var jsonPayload = JsonContent.Create(payload);

        _logger.SendingAppCommand(endpoint, payload);

        using var response = await httpClient.PostAsync(endpoint, jsonPayload, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (body.Length > 0)
            {
                try
                {
                    var callbackResponse = JsonSerializer.Deserialize<AppCallbackResponse>(body, JsonOptions);
                    if (callbackResponse?.State is not null)
                        context.Step.StateOut = callbackResponse.State;
                }
                catch (JsonException ex)
                {
                    return ExecutionResult.CriticalError($"App returned invalid response body: {ex.Message}", ex);
                }
            }
            return ExecutionResult.Success();
        }

        var statusCode = (int)response.StatusCode;
        var errorBody = await response.GetContentOrDefault("<no body content>", cancellationToken);

        // 4xx client errors (except 408/429) are not worth retrying
        if (statusCode is >= 400 and < 500 and not 408 and not 429)
        {
            return ExecutionResult.CriticalError(
                $"AppCommand failed with client error {response.StatusCode}: {errorBody}"
            );
        }

        return ExecutionResult.RetryableError(
            $"AppCommand execution failed with status code {response.StatusCode}: {errorBody}"
        );
    }

    private HttpClient CreateAuthorizedClient(AppWorkflowContext workflowContext)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add(_settings.ApiKeyHeaderName, _settings.ApiKey);

        var baseUrl = _settings.CommandEndpoint.FormatWith(
            new
            {
                workflowContext.Org,
                workflowContext.App,
                workflowContext.InstanceOwnerPartyId,
                workflowContext.InstanceGuid,
            }
        );
        client.BaseAddress = new Uri(baseUrl);

        return client;
    }

    private static AppCommandData DeserializeCommandData(JsonElement? data) =>
        data?.Deserialize<AppCommandData>(JsonOptions)
        ?? throw new InvalidOperationException("AppCommand requires command data with at least a 'commandKey'");

    private static AppWorkflowContext DeserializeWorkflowContext(JsonElement? context) =>
        context?.Deserialize<AppWorkflowContext>(JsonOptions)
        ?? throw new InvalidOperationException("AppCommand requires workflow context with actor and instance info");

    /// <summary>Command.Data shape for app commands.</summary>
    public sealed record AppCommandData
    {
        [JsonPropertyName("commandKey")]
        public required string CommandKey { get; init; }

        [JsonPropertyName("payload")]
        public string? Payload { get; init; }
    }

    /// <summary>Workflow.Context shape for Altinn app commands.</summary>
    public sealed record AppWorkflowContext
    {
        [JsonPropertyName("actor")]
        public required Actor Actor { get; init; }

        [JsonPropertyName("lockToken")]
        public string? LockToken { get; init; }

        [JsonPropertyName("org")]
        public required string Org { get; init; }

        [JsonPropertyName("app")]
        public required string App { get; init; }

        [JsonPropertyName("instanceOwnerPartyId")]
        public required int InstanceOwnerPartyId { get; init; }

        [JsonPropertyName("instanceGuid")]
        public required Guid InstanceGuid { get; init; }
    }
}

internal static partial class AppCommandHandlerLogs
{
    [LoggerMessage(LogLevel.Information, "Sending AppCommand to {Endpoint} with payload: {Payload}")]
    public static partial void SendingAppCommand(
        this ILogger<AppCommandHandler> logger,
        Uri endpoint,
        AppCallbackPayload payload
    );
}
