using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.CommandHandlers.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

// CA1305: Specify IFormatProvider
#pragma warning disable CA1305

namespace WorkflowEngine.CommandHandlers.Handlers.AppCommand;

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

    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

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

    public CommandValidationResult Validate(JsonElement? commandData, JsonElement? workflowContext)
    {
        try
        {
            _ = DeserializeCommandData(commandData);
            _ = DeserializeWorkflowContext(workflowContext);

            return CommandValidationResult.Accept();
        }
        catch (Exception ex)
        {
            return CommandValidationResult.Reject(ex.Message);
        }
    }

    public async Task<ExecutionResult> ExecuteAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        AppCommandData commandData;
        AppWorkflowContext workflowContext;

        try
        {
            commandData = DeserializeCommandData(context.CommandData);
            workflowContext = DeserializeWorkflowContext(context.Workflow.Context);
        }
        catch (Exception ex)
        {
            return ExecutionResult.CriticalError(
                $"An unrecoverable error occurred in {nameof(AppCommandHandler)}: {ex.Message}"
            );
        }

        using var activity = Metrics.Source.StartActivity(
            "AppCommandHandler.Execute",
            parentContext: context.ParentTraceContext ?? context.Step.EngineActivity?.Context,
            kind: ActivityKind.Client,
            tags: [("command.key", commandData.CommandKey)]
        );

        using var slot = await _limiter.AcquireHttpSlot(activity?.Context, cancellationToken);
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
                    var callbackResponse = JsonSerializer.Deserialize<AppCallbackResponse>(body, _jsonOptions);
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

        // 4xx client errors (except 408/418/429) are not worth retrying
        if (statusCode is >= 400 and < 500 and not 408 and not 418 and not 429)
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
        var baseUrl = _settings.CommandEndpoint.FormatWith(workflowContext);
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add(_settings.ApiKeyHeaderName, _settings.ApiKey);
        client.BaseAddress = new Uri(baseUrl);

        return client;
    }

    private static AppCommandData DeserializeCommandData(JsonElement? commandData)
    {
        if (commandData is null)
            throw new ArgumentNullException(nameof(commandData));

        AppCommandData? data = commandData.Value.Deserialize<AppCommandData>(_jsonOptions);

        if (string.IsNullOrWhiteSpace(data?.CommandKey))
            throw new InvalidOperationException("AppCommand requires a 'commandKey' in command data");

        return data;
    }

    private static AppWorkflowContext DeserializeWorkflowContext(JsonElement? context)
    {
        if (context is null)
            throw new ArgumentNullException(nameof(context));

        AppWorkflowContext? ctx = context.Value.Deserialize<AppWorkflowContext>(_jsonOptions);

        if (string.IsNullOrWhiteSpace(ctx?.Actor?.UserIdOrOrgNumber))
            throw new CommandValidationException(
                "AppCommand requires an 'actor' with 'userIdOrOrgNumber' in workflow context"
            );

        if (string.IsNullOrWhiteSpace(ctx.Org) || string.IsNullOrWhiteSpace(ctx.App))
            throw new CommandValidationException("AppCommand requires 'org' and 'app' in workflow context");

        if (ctx.InstanceOwnerPartyId <= 0)
            throw new CommandValidationException(
                "AppCommand requires a valid 'instanceOwnerPartyId' (> 0) in workflow context"
            );

        if (ctx.InstanceGuid == Guid.Empty)
            throw new CommandValidationException("AppCommand requires a non-empty 'instanceGuid' in workflow context");

        if (string.IsNullOrWhiteSpace(ctx.LockToken))
            throw new CommandValidationException("AppCommand requires a 'lockToken' in workflow context");

        return ctx;
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
