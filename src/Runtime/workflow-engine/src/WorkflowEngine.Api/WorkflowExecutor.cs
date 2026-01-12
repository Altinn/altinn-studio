using System.Diagnostics;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using WorkflowEngine.Api.Authentication;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;

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

    public WorkflowExecutor(IServiceProvider serviceProvider)
    {
        _httpClientFactory = serviceProvider.GetRequiredService<IHttpClientFactory>();
        _engineSettings = serviceProvider.GetRequiredService<IOptions<EngineSettings>>().Value;
        _appCommandSettings = serviceProvider.GetRequiredService<IOptions<AppCommandSettings>>().Value;
        _logger = serviceProvider.GetRequiredService<ILogger<WorkflowExecutor>>();
    }

    public async Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken)
    {
        _logger.ExecutingStep(step, workflow);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(step.Command.MaxExecutionTime ?? _engineSettings.DefaultTaskExecutionTimeout);

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
        catch (Exception e)
        {
            _logger.UnhandledExecutionError(step, stopwatch.Elapsed, e.Message, e);
            return ExecutionResult.Error(e.Message);
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
        using var httpClient = GetAuthorizedAppClient(workflow.InstanceInformation);
        httpClient.Timeout = command.MaxExecutionTime ?? _engineSettings.DefaultTaskExecutionTimeout;

        var payload = new AppCallbackPayload
        {
            CommandKey = command.CommandKey,
            Actor = step.Actor,
            Metadata = command.Metadata,
        };
        using var jsonPayload = JsonContent.Create(payload);
        using var response = await httpClient.PostAsync(
            command.CommandKey.ToUri(UriKind.Relative),
            jsonPayload,
            cancellationToken
        );

        return response.IsSuccessStatusCode
            ? ExecutionResult.Success()
            : ExecutionResult.Error(
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
        using var httpClient = _httpClientFactory.CreateClient();
        HttpResponseMessage response;

        if (command.Payload != null)
        {
            using var content = new StringContent(command.Payload);
            content.Headers.ContentType = command.ContentType is not null
                ? new MediaTypeHeaderValue(command.ContentType)
                : null;
            response = await httpClient.PostAsync(command.Uri.ToUri(UriKind.Absolute), content, cancellationToken);
        }
        else
        {
            response = await httpClient.GetAsync(command.Uri.ToUri(UriKind.Absolute), cancellationToken);
        }

        var result = response.IsSuccessStatusCode
            ? ExecutionResult.Success()
            : ExecutionResult.Error(
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
        try
        {
            await command.Action(workflow, step, cancellationToken);
            return ExecutionResult.Success();
        }
        catch (Exception ex)
        {
            _logger.LogDelegateExecutionOfStepStepFailedMessage(step, ex.Message, ex);
            return ExecutionResult.Error(ex.Message);
        }
    }

    internal HttpClient GetAuthorizedAppClient(InstanceInformation instanceInformation)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add(ApiKeyAuthenticationHandler.HeaderName, _appCommandSettings.ApiKey);
        client.BaseAddress = new Uri(_appCommandSettings.CommandEndpoint.FormatWith(instanceInformation));

        return client;
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
}
