using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using WorkflowEngine.Commands.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// Handles "operator" commands by calling the core operator's callback router, which runs the step.
/// </summary>
internal sealed partial class OperatorCommand : Command<OperatorCommandData, OperatorWorkflowContext>
{
    private readonly OperatorCommandSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConcurrencyLimiter _limiter;
    private readonly ILogger<OperatorCommand> _logger;

    private const string CommandTypeId = "operator";
    public override string CommandType => CommandTypeId;

    public OperatorCommand(
        IOptions<OperatorCommandSettings> settings,
        IHttpClientFactory httpClientFactory,
        IConcurrencyLimiter limiter,
        ILogger<OperatorCommand> logger
    )
    {
        _settings = settings.Value;
        _httpClientFactory = httpClientFactory;
        _limiter = limiter;
        _logger = logger;
    }

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> with <see cref="OperatorCommandData"/>.
    /// </summary>
    public static CommandDefinition Create(
        OperatorCommandData data,
        TimeSpan? maxExecutionTime = null,
        TimeSpan? waitBudget = null
    ) => CommandDefinition.Create(CommandTypeId, data, maxExecutionTime, waitBudget);

    /// <inheritdoc/>
    protected override CommandValidationResult Validate(
        OperatorCommandData? commandData,
        OperatorWorkflowContext? workflowContext
    )
    {
        if (commandData is null || string.IsNullOrWhiteSpace(commandData.CommandKey))
            return new CommandValidationResult.Invalid("OperatorCommand requires a 'commandKey' in command data");

        // The key becomes one path segment under the callback router, so it must not escape it.
        if (!CommandKeyPattern().IsMatch(commandData.CommandKey))
            return new CommandValidationResult.Invalid(
                "OperatorCommand requires a 'commandKey' of letters, digits, '.', '-' and '_' that starts with a letter or digit"
            );

        if (workflowContext is null)
            return new CommandValidationResult.Invalid("OperatorCommand requires workflow context");

        if (string.IsNullOrWhiteSpace(workflowContext.Domain))
            return new CommandValidationResult.Invalid("OperatorCommand requires a 'domain' in workflow context");

        if (string.IsNullOrWhiteSpace(workflowContext.Caller))
            return new CommandValidationResult.Invalid("OperatorCommand requires a 'caller' in workflow context");

        if (string.IsNullOrWhiteSpace(workflowContext.SubjectId))
            return new CommandValidationResult.Invalid("OperatorCommand requires a 'subjectId' in workflow context");

        return new CommandValidationResult.Valid();
    }

    /// <summary>
    /// Names what the workflow works on, so one trace search finds the engine's work on a run.
    /// </summary>
    protected override IReadOnlyList<KeyValuePair<string, object?>> GetTelemetryAttributes(
        OperatorCommandData? commandData,
        OperatorWorkflowContext? workflowContext
    ) =>
        workflowContext is null
            ? []
            :
            [
                new(OperatorTelemetryAttributes.Domain, workflowContext.Domain),
                new(OperatorTelemetryAttributes.Caller, workflowContext.Caller),
                new(OperatorTelemetryAttributes.SubjectId, workflowContext.SubjectId),
            ];

    /// <inheritdoc/>
    protected override async Task<ExecutionResult> Execute(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        var commandData = context.GetCommandData<OperatorCommandData>();
        var workflowContext = context.GetWorkflowContext<OperatorWorkflowContext>();

        using var activity = Metrics.Source.StartActivity(
            "OperatorCommand.Execute",
            parentContext: context.ParentTraceContext ?? context.Step.EngineActivity?.Context,
            kind: ActivityKind.Client,
            tags: [(OperatorTelemetryAttributes.OperatorCommandKey, commandData.CommandKey)]
        );

        string? token = null;
        if (!string.IsNullOrWhiteSpace(_settings.TokenPath))
        {
            try
            {
                token = await ReadToken(_settings.TokenPath, cancellationToken);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidDataException)
            {
                // The operator refuses a callback without a token, and a refusal fails the step for good. A token
                // that cannot be read is a fault of this pod, not of the step, so the step retries instead.
                _logger.TokenUnavailable(_settings.TokenPath, ex);
                return ExecutionResult.RetryableError(
                    $"OperatorCommand could not read the ServiceAccount token at '{_settings.TokenPath}': {ex.Message}",
                    ex
                );
            }
        }

        using var slot = await _limiter.AcquireHttpSlot(activity?.Context, cancellationToken);
        using var httpClient = CreateClient();

        var payload = new OperatorCallbackPayload
        {
            CommandKey = commandData.CommandKey,
            Payload = commandData.Payload,
            Context = workflowContext,
            WorkflowId = context.Workflow.DatabaseId,
            StepId = context.Step.DatabaseId,
            ExecutionReferenceTime = context.Workflow.StartAt ?? context.Step.CreatedAt,
            State = context.StateIn,
            RetryCount = context.Step.RequeueCount,
            ExecutionDeadline = context.ExecutionDeadline,
            DeferCount = context.Step.DeferCount,
            FirstDeferredAt = context.Step.FirstDeferredAt,
            WaitDeadline = context.WaitDeadline,
            IsFinalWaitCheck = context.IsFinalWaitCheck,
        };

        var endpoint = new Uri(Uri.EscapeDataString(commandData.CommandKey), UriKind.Relative);

        _logger.SendingOperatorCommand(
            commandData.CommandKey,
            endpoint,
            context.Workflow.DatabaseId,
            workflowContext.Domain,
            workflowContext.Caller,
            workflowContext.SubjectId
        );

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(payload),
        };
        httpRequest.AddWorkflowMetadataHeaders(context);
        if (token is not null)
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await httpClient.SendAsync(httpRequest, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (body.Length == 0)
                return ExecutionResult.Success();

            OperatorCallbackResponse? callbackResponse;
            try
            {
                callbackResponse = JsonSerializer.Deserialize<OperatorCallbackResponse>(
                    body,
                    CommandDefinition.SerializerOptions
                );
            }
            catch (JsonException ex)
            {
                return ExecutionResult.CriticalError($"Operator returned invalid response body: {ex.Message}", ex);
            }

            if (callbackResponse?.Defer is { } deferral)
            {
                _logger.OperatorCommandDeferred(commandData.CommandKey, context.Workflow.DatabaseId, deferral.Delay);
                return ExecutionResult.Defer(deferral.Delay, deferral.Reason, callbackResponse.State);
            }

            return ExecutionResult.Success(callbackResponse?.State);
        }

        var statusCode = (int)response.StatusCode;
        var errorBody = await response.GetContentOrDefault("<no body content>", cancellationToken);

        // 4xx client errors (except 408/418/429) are not worth retrying
        if (statusCode is >= 400 and < 500 and not 408 and not 418 and not 429)
        {
            return ExecutionResult.CriticalError(
                $"OperatorCommand failed with client error {response.StatusCode}: {errorBody}",
                httpStatusCode: statusCode
            );
        }

        return ExecutionResult.RetryableError(
            $"OperatorCommand execution failed with status code {response.StatusCode}: {errorBody}",
            httpStatusCode: statusCode
        );
    }

    // The kubelet rotates the token before it expires, so the command reads the file for every callback.
    private static async Task<string> ReadToken(string path, CancellationToken cancellationToken)
    {
        var token = (await File.ReadAllTextAsync(path, cancellationToken)).Trim();
        if (token.Length == 0)
            throw new InvalidDataException($"The token file '{path}' is empty.");

        return token;
    }

    private HttpClient CreateClient()
    {
        var client = _httpClientFactory.CreateClient();
        // Without a trailing slash, the base address would lose its last segment when the command key is resolved
        // against it.
#pragma warning disable S1075
        client.BaseAddress = new Uri(_settings.CommandEndpoint.TrimEnd('/') + '/');
#pragma warning restore S1075

        // The step's execution budget is the single authority over how long a callback may run: the executor
        // cancels the token passed to SendAsync when the step's MaxExecutionTime (or the engine's default) is up.
        // HttpClient's own 100 s default would cut off a long poll regardless of that budget, and its timeout
        // would not be classified as cleanly as the cancellation is.
        client.Timeout = Timeout.InfiniteTimeSpan;

        return client;
    }

    [GeneratedRegex("^[A-Za-z0-9][A-Za-z0-9._-]*$", RegexOptions.CultureInvariant)]
    private static partial Regex CommandKeyPattern();
}

internal static partial class OperatorCommandLogs
{
    // Routing fields only. Never log the OperatorCallbackPayload: its payload and state are the operator's own data,
    // which the engine stores without reading.
    [LoggerMessage(
        LogLevel.Information,
        "Sending OperatorCommand '{CommandKey}' to {Endpoint} (workflowId: {WorkflowId}, domain: {Domain}, caller: {Caller}, subject: {SubjectId})"
    )]
    internal static partial void SendingOperatorCommand(
        this ILogger<OperatorCommand> logger,
        string commandKey,
        Uri endpoint,
        Guid workflowId,
        string domain,
        string caller,
        string subjectId
    );

    // The operator's reason is not logged here. It reaches the engine log with the deferral.
    [LoggerMessage(
        LogLevel.Information,
        "OperatorCommand '{CommandKey}' deferred (workflowId: {WorkflowId}); re-checking in {Delay}"
    )]
    internal static partial void OperatorCommandDeferred(
        this ILogger<OperatorCommand> logger,
        string commandKey,
        Guid workflowId,
        TimeSpan delay
    );

    [LoggerMessage(LogLevel.Error, "Could not read the ServiceAccount token at {TokenPath}")]
    internal static partial void TokenUnavailable(
        this ILogger<OperatorCommand> logger,
        string tokenPath,
        Exception exception
    );
}
