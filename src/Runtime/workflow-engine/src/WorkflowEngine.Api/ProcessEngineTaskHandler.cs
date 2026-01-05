using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Headers;
using Altinn.App.ProcessEngine.Constants;
using Altinn.App.ProcessEngine.Extensions;
using Microsoft.Extensions.Options;
using WorkflowEngine.Models;

namespace Altinn.App.ProcessEngine;

internal interface IProcessEngineTaskHandler
{
    Task<ProcessEngineExecutionResult> Execute(
        ProcessEngineJob job,
        ProcessEngineTask task,
        CancellationToken cancellationToken
    );
}

internal class ProcessEngineTaskHandler : IProcessEngineTaskHandler
{
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeProvider _timeProvider;
    private readonly ProcessEngineSettings _settings;
    private readonly ILogger<ProcessEngineTaskHandler> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public ProcessEngineTaskHandler(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _httpClientFactory = serviceProvider.GetRequiredService<IHttpClientFactory>();
        _timeProvider = serviceProvider.GetService<TimeProvider>() ?? TimeProvider.System;
        _settings = serviceProvider.GetRequiredService<IOptions<ProcessEngineSettings>>().Value;
        _logger = serviceProvider.GetRequiredService<ILogger<ProcessEngineTaskHandler>>();
    }

    public async Task<ProcessEngineExecutionResult> Execute(
        ProcessEngineJob job,
        ProcessEngineTask task,
        CancellationToken cancellationToken
    )
    {
        _logger.LogInformation("Executing task {Task} for job {Job}", task, job);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(task.Command.MaxExecutionTime ?? _settings.DefaultTaskExecutionTimeout);

        var stopwatch = Stopwatch.StartNew();
        try
        {
            var result = task.Command switch
            {
                ProcessEngineCommand.AppCommand cmd => await AppCommand(cmd, job, task, cts.Token),
                ProcessEngineCommand.Timeout cmd => await Timeout(cmd, job, task, cts.Token),
                ProcessEngineCommand.Webhook cmd => await Webhook(cmd, job, task, cts.Token),
                ProcessEngineCommand.Delegate cmd => await Delegate(cmd, job, task, cts.Token),
                ProcessEngineCommand.Noop => ProcessEngineExecutionResult.Success(),
                ProcessEngineCommand.Throw => throw new InvalidOperationException("Intentional error thrown"),
                _ => throw new ArgumentException($"Unknown instruction: {task.Command}"),
            };

            if (result.IsSuccess())
                _logger.LogInformation("Task {Task} executed with success in {Elapsed}", task, stopwatch.Elapsed);
            else
                _logger.LogError(
                    "Task {Task} executed with error in {Elapsed}: {Message}",
                    task,
                    stopwatch.Elapsed,
                    result.Message ?? "no details specified"
                );

            return result;
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Execution of task {Task} failed after {Elapsed}: {Message}",
                task,
                stopwatch.Elapsed,
                e.Message
            );

            return ProcessEngineExecutionResult.Error(e.Message);
        }
        finally
        {
            stopwatch.Stop();
        }
    }

    private async Task<ProcessEngineExecutionResult> AppCommand(
        ProcessEngineCommand.AppCommand command,
        ProcessEngineJob job,
        ProcessEngineTask task,
        CancellationToken cancellationToken
    )
    {
        // TODO: Remove this. Demo purpose only
        if (command.CommandKey.StartsWith("*", StringComparison.OrdinalIgnoreCase))
        {
            return ProcessEngineExecutionResult.Success();
        }

        using var httpClient = GetAuthorizedAppClient(job.InstanceInformation);
        httpClient.Timeout = command.MaxExecutionTime ?? _settings.DefaultTaskExecutionTimeout;

        var payload = new ProcessEngineAppCallbackPayload
        {
            CommandKey = command.CommandKey,
            Actor = task.Actor,
            Metadata = command.Metadata,
        };
        using var response = await httpClient.PostAsync(
            command.CommandKey,
            JsonContent.Create(payload),
            cancellationToken
        );

        return response.IsSuccessStatusCode
            ? ProcessEngineExecutionResult.Success()
            : ProcessEngineExecutionResult.Error(
                $"AppCommand execution failed with status code {response.StatusCode}: {await response.GetContentOrDefault("<no body content>", cancellationToken)}"
            );
    }

    private static async Task<ProcessEngineExecutionResult> Timeout(
        ProcessEngineCommand.Timeout command,
        ProcessEngineJob job,
        ProcessEngineTask task,
        CancellationToken cancellationToken
    )
    {
        await Task.Delay(command.Duration, cancellationToken);
        return ProcessEngineExecutionResult.Success();
    }

    private async Task<ProcessEngineExecutionResult> Webhook(
        ProcessEngineCommand.Webhook command,
        ProcessEngineJob job,
        ProcessEngineTask task,
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
            ? ProcessEngineExecutionResult.Success()
            : ProcessEngineExecutionResult.Error(
                $"Webhook execution failed: {await response.Content.ReadAsStringAsync(cancellationToken)}"
            );
        response.Dispose();

        return result;
    }

    private async Task<ProcessEngineExecutionResult> Delegate(
        ProcessEngineCommand.Delegate command,
        ProcessEngineJob job,
        ProcessEngineTask task,
        CancellationToken cancellationToken
    )
    {
        try
        {
            await command.Action(job, task, cancellationToken);
            return ProcessEngineExecutionResult.Success();
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Delegate execution of task {Task} failed: {Message}", task, e.Message);
            return ProcessEngineExecutionResult.Error(e.Message);
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
