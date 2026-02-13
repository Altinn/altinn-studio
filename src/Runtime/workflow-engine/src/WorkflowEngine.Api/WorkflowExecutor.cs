using System.Diagnostics;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Resilience;

// CA1305: Specify IFormatProvider
#pragma warning disable CA1305

// Keep unused parameters in worker methods for now
#pragma warning disable S1172

namespace WorkflowEngine.Api;

internal interface IWorkflowExecutor
{
    Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken);
}

internal class WorkflowExecutor : IWorkflowExecutor
{
    private readonly EngineSettings _engineSettings;
    private readonly AppCommandSettings _appCommandSettings;
    private readonly ILogger<WorkflowExecutor> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConcurrencyLimiter _limiter;

    public WorkflowExecutor(IServiceProvider serviceProvider)
    {
        _httpClientFactory = serviceProvider.GetRequiredService<IHttpClientFactory>();
        _engineSettings = serviceProvider.GetRequiredService<IOptions<EngineSettings>>().Value;
        _appCommandSettings = serviceProvider.GetRequiredService<IOptions<AppCommandSettings>>().Value;
        _logger = serviceProvider.GetRequiredService<ILogger<WorkflowExecutor>>();
        _limiter = serviceProvider.GetRequiredService<IConcurrencyLimiter>();
    }

    public async Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity(
            "WorkflowExecutor.Execute",
            parentContext: step.EngineTraceContext
        );
        using var slot = await _limiter.AcquireHttpSlotAsync(cancellationToken); // TODO: Perhaps move to actual http methods?
        _logger.ExecutingStep(step, workflow);

        using CancellationTokenSource cts = CreateExecutionTokenSource(step, cancellationToken);
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var result = step.Command switch
            {
                Command.AppCommand cmd => await AppCommand(cmd, workflow, step, cts.Token),
                Command.Webhook cmd => await Webhook(cmd, workflow, step, cts.Token),
                Command.Debug.Timeout cmd => await Timeout(cmd, workflow, step, cts.Token),
                Command.Debug.Delegate cmd => await Delegate(cmd, workflow, step, cts.Token),
                Command.Debug.Noop => ExecutionResult.Success(),
                Command.Debug.Throw => throw new InvalidOperationException("Intentional error thrown"),
                _ => throw new ArgumentException($"Unknown instruction: {step.Command}"),
            };

            if (result.IsSuccess())
                _logger.SuccessfulExecution(step, stopwatch.Elapsed);
            else
                _logger.FailedExecution(step, stopwatch.Elapsed, result.Message ?? "no details specified");

            return result;
        }
        catch (OperationCanceledException) when (cts.IsCancellationRequested)
        {
            throw; // handle this gracefully upstream
        }
        catch (Exception e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, stopwatch.Elapsed, e.Message, e);
            return ExecutionResult.RetryableError(e);
        }
        finally
        {
            stopwatch.Stop();
        }
    }

    private async Task<ExecutionResult> AppCommand(
        Command.AppCommand command,
        Workflow workflow,
        Step step,
        CancellationToken cancellationToken
    )
    {
        using var activity = Telemetry.Source.StartActivity(
            "WorkflowExecutor.AppCommand",
            kind: ActivityKind.Client,
            tags: [("command.key", command.CommandKey)]
        );

        using var httpClient = GetAuthorizedAppClient(workflow.InstanceInformation);
        httpClient.Timeout = command.MaxExecutionTime ?? _engineSettings.DefaultStepCommandTimeout;

        var payload = new AppCallbackPayload
        {
            CommandKey = command.CommandKey,
            Actor = step.Actor,
            LockToken =
                workflow.InstanceLockKey
                ?? throw new InvalidOperationException("Missing InstanceLockKey for app callback payload"),
            Payload = command.Payload,
        };
        var endpoint = command.CommandKey.ToUri(UriKind.Relative);
        using var jsonPayload = JsonContent.Create(payload);

        _logger.SendingAppCommandToEndpoint(endpoint, payload);

        using var response = await httpClient.PostAsync(endpoint, jsonPayload, cancellationToken);

        return response.IsSuccessStatusCode
            ? ExecutionResult.Success()
            : ExecutionResult.RetryableError(
                $"AppCommand execution failed with status code {response.StatusCode}: {await response.GetContentOrDefault("<no body content>", cancellationToken)}"
            );
    }

    private static async Task<ExecutionResult> Timeout(
        Command.Debug.Timeout command,
        Workflow workflow,
        Step step,
        CancellationToken cancellationToken
    )
    {
        using var activity = Telemetry.Source.StartActivity("WorkflowExecutor.Timeout", kind: ActivityKind.Internal);

        await Task.Delay(command.Duration, cancellationToken);
        return ExecutionResult.Success();
    }

    private async Task<ExecutionResult> Webhook(
        Command.Webhook command,
        Workflow workflow,
        Step step,
        CancellationToken cancellationToken
    )
    {
        using var activity = Telemetry.Source.StartActivity(
            "WorkflowExecutor.Webhook",
            kind: ActivityKind.Client,
            tags: [("command.uri", command.Uri)]
        );

        var endpoint = command.Uri.ToUri(UriKind.Absolute);
        using var httpClient = _httpClientFactory.CreateClient();
        HttpResponseMessage response;

        if (command.Payload != null)
        {
            using var content = new StringContent(command.Payload);
            content.Headers.ContentType = command.ContentType is not null
                ? new MediaTypeHeaderValue(command.ContentType)
                : null;

            _logger.SendingWebhookToEndpoint(endpoint, command.Payload);

            response = await httpClient.PostAsync(command.Uri.ToUri(UriKind.Absolute), content, cancellationToken);
        }
        else
        {
            _logger.SendingWebhookToEndpoint(endpoint);
            response = await httpClient.GetAsync(command.Uri.ToUri(UriKind.Absolute), cancellationToken);
        }

        var result = response.IsSuccessStatusCode
            ? ExecutionResult.Success()
            : ExecutionResult.RetryableError(
                $"Webhook execution failed: {await response.Content.ReadAsStringAsync(cancellationToken)}"
            );
        response.Dispose();

        return result;
    }

    private async Task<ExecutionResult> Delegate(
        Command.Debug.Delegate command,
        Workflow workflow,
        Step step,
        CancellationToken cancellationToken
    )
    {
        using var activity = Telemetry.Source.StartActivity("WorkflowExecutor.Delegate", kind: ActivityKind.Internal);

        try
        {
            await command.Action(workflow, step, cancellationToken);
            return ExecutionResult.Success();
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.LogDelegateExecutionOfStepStepFailedMessage(step, ex.Message, ex);
            return ExecutionResult.RetryableError(ex.Message);
        }
    }

    internal HttpClient GetAuthorizedAppClient(InstanceInformation instanceInformation)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add(ApiKeyAuthenticationHandler.HeaderName, _appCommandSettings.ApiKey);
        client.BaseAddress = new Uri(_appCommandSettings.CommandEndpoint.FormatWith(instanceInformation));

        return client;
    }

    private CancellationTokenSource CreateExecutionTokenSource(Step step, CancellationToken cancellationToken)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var timeout = step.Command.MaxExecutionTime ?? _engineSettings.DefaultStepCommandTimeout;
        cts.CancelAfter(timeout);

        return cts;
    }
}

internal static partial class WorkflowExecutorLogs
{
    [LoggerMessage(LogLevel.Information, "Executing step {Step} for workflow {Workflow}")]
    public static partial void ExecutingStep(this ILogger<WorkflowExecutor> logger, Step step, Workflow workflow);

    [LoggerMessage(LogLevel.Information, "Step {Step} executed with success in {Elapsed}")]
    public static partial void SuccessfulExecution(this ILogger<WorkflowExecutor> logger, Step step, TimeSpan elapsed);

    [LoggerMessage(LogLevel.Error, "Step {Step} executed with error in {Elapsed}: {Message}")]
    public static partial void FailedExecution(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        TimeSpan elapsed,
        string message
    );

    [LoggerMessage(LogLevel.Error, "Execution of step {Step} failed after {Elapsed}: {Message}")]
    public static partial void UnhandledExecutionError(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        TimeSpan elapsed,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Delegate execution of step {Step} failed: {Message}")]
    public static partial void LogDelegateExecutionOfStepStepFailedMessage(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "Sending AppCommand to {Endpoint} with payload: {Payload}")]
    public static partial void SendingAppCommandToEndpoint(
        this ILogger<WorkflowExecutor> logger,
        Uri endpoint,
        AppCallbackPayload payload
    );

    [LoggerMessage(LogLevel.Information, "[POST] Sending Webhook to {Endpoint} with payload: {Payload}")]
    public static partial void SendingWebhookToEndpoint(
        this ILogger<WorkflowExecutor> logger,
        Uri endpoint,
        string payload
    );

    [LoggerMessage(LogLevel.Information, "[GET] Sending Webhook to {Endpoint} without payload")]
    public static partial void SendingWebhookToEndpoint(this ILogger<WorkflowExecutor> logger, Uri endpoint);
}
