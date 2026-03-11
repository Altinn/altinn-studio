using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Commands.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

// CA1305: Specify IFormatProvider
#pragma warning disable CA1305

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Handles "app" commands by making HTTP callbacks to the Altinn application.
/// Extracts actor, lockToken, and instance information from the typed workflow context
/// and command-specific data from the typed command data.
/// </summary>
public sealed class AppCommand : Command<AppCommandData, AppWorkflowContext>
{
    private readonly AppCommandSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConcurrencyLimiter _limiter;
    private readonly ILogger<AppCommand> _logger;

    private const string CommandTypeId = "app";
    public override string CommandType => CommandTypeId;

    public AppCommand(
        IOptions<AppCommandSettings> settings,
        IHttpClientFactory httpClientFactory,
        IConcurrencyLimiter limiter,
        ILogger<AppCommand> logger
    )
    {
        _settings = settings.Value;
        _httpClientFactory = httpClientFactory;
        _limiter = limiter;
        _logger = logger;
    }

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> with <see cref="AppCommandData"/>.
    /// </summary>
    public static CommandDefinition Create(
        string operationId,
        AppCommandData data,
        TimeSpan? maxExecutionTime = null
    ) => CommandDefinition.Create(CommandTypeId, operationId, data, maxExecutionTime);

    /// <inheritdoc/>
    protected override CommandValidationResult Validate(
        AppCommandData? commandData,
        AppWorkflowContext? workflowContext
    )
    {
        if (commandData is null || string.IsNullOrWhiteSpace(commandData.CommandKey))
            return CommandValidationResult.Reject(
                "AppCommand requires a 'commandKey' in command data"
            );

        if (workflowContext is null)
            return CommandValidationResult.Reject("AppCommand requires workflow context");

        if (string.IsNullOrWhiteSpace(workflowContext.Actor?.UserIdOrOrgNumber))
            return CommandValidationResult.Reject(
                "AppCommand requires an 'actor' with 'userIdOrOrgNumber' in workflow context"
            );

        if (
            string.IsNullOrWhiteSpace(workflowContext.Org)
            || string.IsNullOrWhiteSpace(workflowContext.App)
        )
            return CommandValidationResult.Reject(
                "AppCommand requires 'org' and 'app' in workflow context"
            );

        if (workflowContext.InstanceOwnerPartyId <= 0)
            return CommandValidationResult.Reject(
                "AppCommand requires a valid 'instanceOwnerPartyId' (> 0) in workflow context"
            );

        if (workflowContext.InstanceGuid == Guid.Empty)
            return CommandValidationResult.Reject(
                "AppCommand requires a non-empty 'instanceGuid' in workflow context"
            );

        if (string.IsNullOrWhiteSpace(workflowContext.LockToken))
            return CommandValidationResult.Reject(
                "AppCommand requires a 'lockToken' in workflow context"
            );

        return CommandValidationResult.Accept();
    }

    /// <inheritdoc/>
    protected override async Task<ExecutionResult> ExecuteAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        var commandData = context.GetCommandData<AppCommandData>();
        var workflowContext = context.GetWorkflowContext<AppWorkflowContext>();

        using var activity = Metrics.Source.StartActivity(
            "AppCommand.Execute",
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
                    var callbackResponse = JsonSerializer.Deserialize<AppCallbackResponse>(
                        body,
                        CommandSerializerOptions.Default
                    );
                    if (callbackResponse?.State is not null)
                        context.Step.StateOut = callbackResponse.State;
                }
                catch (JsonException ex)
                {
                    return ExecutionResult.CriticalError(
                        $"App returned invalid response body: {ex.Message}",
                        ex
                    );
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
}

internal static partial class AppCommandDescriptorLogs
{
    [LoggerMessage(
        LogLevel.Information,
        "Sending AppCommand to {Endpoint} with payload: {Payload}"
    )]
    public static partial void SendingAppCommand(
        this ILogger<AppCommand> logger,
        Uri endpoint,
        AppCallbackPayload payload
    );
}
