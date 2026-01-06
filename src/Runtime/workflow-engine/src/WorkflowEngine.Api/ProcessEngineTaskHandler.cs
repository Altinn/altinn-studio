using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal interface IProcessEngineTaskHandler
{
    Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken);
}

internal class ProcessEngineTaskHandler : IProcessEngineTaskHandler
{
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeProvider _timeProvider;
    private readonly WorkflowEngineSettings _settings;
    private readonly ILogger<ProcessEngineTaskHandler> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public ProcessEngineTaskHandler(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _httpClientFactory = serviceProvider.GetRequiredService<IHttpClientFactory>();
        _timeProvider = serviceProvider.GetService<TimeProvider>() ?? TimeProvider.System;
        _settings = serviceProvider.GetRequiredService<IOptions<WorkflowEngineSettings>>().Value;
        _logger = serviceProvider.GetRequiredService<ILogger<ProcessEngineTaskHandler>>();
    }

    public async Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Executing step {Step} for workflow {Workflow}", step, workflow);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(step.Command.MaxExecutionTime ?? _settings.DefaultTaskExecutionTimeout);

        var stopwatch = Stopwatch.StartNew();
        try
        {
            var result = step.Command switch
            {
                Command.AppCommand cmd => await AppCommand(cmd, workflow, step, cts.Token),
                Command.Timeout cmd => await Timeout(cmd, workflow, step, cts.Token),
                Command.Webhook cmd => await Webhook(cmd, workflow, step, cts.Token),
                Command.Delegate cmd => await Delegate(cmd, workflow, step, cts.Token),
                Command.Noop => ExecutionResult.Success(),
                Command.Throw => throw new InvalidOperationException("Intentional error thrown"),
                _ => throw new ArgumentException($"Unknown instruction: {step.Command}"),
            };

            if (result.IsSuccess())
                _logger.LogInformation("Step {Step} executed with success in {Elapsed}", step, stopwatch.Elapsed);
            else
                _logger.LogError(
                    "Step {Step} executed with error in {Elapsed}: {Message}",
                    step,
                    stopwatch.Elapsed,
                    result.Message ?? "no details specified"
                );

            return result;
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Execution of step {Step} failed after {Elapsed}: {Message}",
                step,
                stopwatch.Elapsed,
                e.Message
            );

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
        // TODO: Remove this. Demo purpose only
        if (command.CommandKey.StartsWith("*", StringComparison.OrdinalIgnoreCase))
        {
            return ExecutionResult.Success();
        }

        using var httpClient = GetAuthorizedAppClient(workflow.InstanceInformation);
        httpClient.Timeout = command.MaxExecutionTime ?? _settings.DefaultTaskExecutionTimeout;

        var payload = new AppCallbackPayload
        {
            CommandKey = command.CommandKey,
            Actor = step.Actor,
            Metadata = command.Metadata,
        };
        using var response = await httpClient.PostAsync(
            command.CommandKey,
            JsonContent.Create(payload),
            cancellationToken
        );

        return response.IsSuccessStatusCode
            ? ExecutionResult.Success()
            : ExecutionResult.Error(
                $"AppCommand execution failed with status code {response.StatusCode}: {await response.GetContentOrDefault("<no body content>", cancellationToken)}"
            );
    }

    private static async Task<ExecutionResult> Timeout(
        Command.Timeout command,
        Workflow workflow,
        Step step,
        CancellationToken cancellationToken
    )
    {
        await System.Threading.Tasks.Task.Delay(command.Duration, cancellationToken);
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
            response = await httpClient.PostAsync(command.Uri, content, cancellationToken);
        }
        else
        {
            response = await httpClient.GetAsync(command.Uri, cancellationToken);
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
        Command.Delegate command,
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
        catch (Exception e)
        {
            _logger.LogError(e, "Delegate execution of step {Step} failed: {Message}", step, e.Message);
            return ExecutionResult.Error(e.Message);
        }
    }

    [SuppressMessage(
        "Globalization",
        "CA1305:Specify IFormatProvider",
        Justification = "Method explicitly uses InvariantCulture"
    )]
    internal HttpClient GetAuthorizedAppClient(InstanceInformation instanceInformation)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add(AuthConstants.ApiKeyHeaderName, _settings.ApiKey);
        client.BaseAddress = new Uri(_settings.AppCommandEndpoint.FormatWith(instanceInformation).TrimEnd('/') + "/");

        return client;
    }
}
