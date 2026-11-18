using System.Diagnostics;
using System.Net;
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
/// Calls the core operator's callback router for "operator" commands. The router runs the step.
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

        // The key becomes one path segment under the callback router, so it must not point outside the router.
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
                // Without a token, the operator refuses the callback and fails the step permanently. The fault is
                // this pod's, not the step's, so the step retries.
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

        // The operator ends a step with a 422 problem, such as src/core/operator/testdata/callbacks/response-end.json.
        // The step keeps the problem unchanged as its error, and the operator reads it back.
        if (response.StatusCode == HttpStatusCode.UnprocessableEntity)
            return ExecutionResult.CriticalError(errorBody, httpStatusCode: statusCode);

        IReadOnlyList<int> nonRetryable =
            context.Step.RetryStrategy?.NonRetryableHttpStatusCodes ?? RetryStrategy.DefaultNonRetryableHttpStatusCodes;
        if (nonRetryable.Contains(statusCode))
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
        // Without a trailing slash, the command key would replace the base address's last segment.
#pragma warning disable S1075
        client.BaseAddress = new Uri(_settings.CommandEndpoint.TrimEnd('/') + '/');
#pragma warning restore S1075

        // The executor cancels the callback when the step's execution budget runs out. HttpClient's default timeout
        // of 100 seconds would stop a long poll before that.
        client.Timeout = Timeout.InfiniteTimeSpan;

        return client;
    }

    [GeneratedRegex("^[A-Za-z0-9][A-Za-z0-9._-]*$", RegexOptions.CultureInvariant)]
    private static partial Regex CommandKeyPattern();
}

internal static partial class OperatorCommandLogs
{
    // Log routing fields only. The state is the operator's own data, which the engine stores but does not read.
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

    // The engine logs the operator's reason with the deferral.
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
