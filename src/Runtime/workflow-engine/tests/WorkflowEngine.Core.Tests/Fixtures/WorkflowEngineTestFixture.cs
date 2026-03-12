using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Models;

// CA2000: Objects are transferred to the returned fixture record which handles disposal
#pragma warning disable CA2000

namespace WorkflowEngine.Core.Tests.Fixtures;

/// <summary>
/// Shared test fixture for WorkflowEngine.Core services.
/// Provides a configured <see cref="ServiceProvider"/> with mocked external dependencies
/// and sensible default settings.
/// <para>
/// Use the <see cref="Action{IServiceCollection}"/> delegate in the <see cref="Create"/> method
/// to register additional services or override defaults.
/// </para>
/// </summary>
internal sealed record WorkflowEngineTestFixture(
    ServiceProvider ServiceProvider,
    MockHttpHandler HttpHandler,
    Mock<IHttpClientFactory> HttpClientFactoryMock,
    EngineSettings EngineSettings
) : IDisposable
{
    /// <summary>
    /// Creates a new test fixture with sensible defaults.
    /// </summary>
    /// <param name="configureServices">Optional delegate to register additional services or override defaults.</param>
    /// <param name="engineSettings">Optional engine settings override.</param>
    public static WorkflowEngineTestFixture Create(
        Action<IServiceCollection>? configureServices = null,
        EngineSettings? engineSettings = null
    )
    {
        var handler = new MockHttpHandler();
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        httpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(() => new HttpClient(handler));

        engineSettings ??= new EngineSettings
        {
            QueueCapacity = 10,
            MaxDegreeOfParallelism = 5,
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MaxConcurrentDbOperations = 5,
            MaxConcurrentHttpCalls = 5,
        };

        var services = new ServiceCollection();
        services.AddSingleton(httpClientFactoryMock.Object);
        services.AddSingleton(Options.Create(engineSettings));
        services.AddLogging();
        services.AddSingleton<IConcurrencyLimiter>(
            new ConcurrencyLimiter(engineSettings.MaxConcurrentDbOperations, engineSettings.MaxConcurrentHttpCalls)
        );

        services.AddSingleton<ICommand, WebhookCommand>();
        services.AddSingleton<ICommandRegistry, CommandRegistry>();
        services.AddSingleton<IWorkflowExecutor, WorkflowExecutor>();

        configureServices?.Invoke(services);

        return new WorkflowEngineTestFixture(
            services.BuildServiceProvider(),
            handler,
            httpClientFactoryMock,
            engineSettings
        );
    }

    public static JsonElement DefaultWorkflowContext => JsonSerializer.SerializeToElement(new { });

    public static Workflow CreateWorkflow(Step? step = null, string? ns = "test-namespace")
    {
        return new Workflow
        {
            OperationId = "test-operation",
            IdempotencyKey = "test-wf-key",
            Namespace = ns ?? "test-namespace",
            Context = DefaultWorkflowContext,
            Steps = step != null ? [step] : [],
        };
    }

    public static Step CreateStep(CommandDefinition command, string operationId = "test-step-op") =>
        new()
        {
            OperationId = operationId,
            IdempotencyKey = $"test-step-key/{operationId}",
            ProcessingOrder = 0,
            Command = command,
        };

    public void Dispose()
    {
        ServiceProvider.Dispose();
        HttpHandler.Dispose();
    }
}

/// <summary>
/// A test-specific command descriptor that executes a delegate.
/// Since delegates cannot be serialized as Command.Data, this descriptor stores
/// the delegate externally and the test wires it up before execution.
/// </summary>
internal sealed class TestDelegateCommand : ICommand
{
    public string CommandType => "test-delegate";

    public Type? CommandDataType => null;

    public Type? WorkflowContextType => null;

    private Func<Workflow, Step, CancellationToken, Task>? _action;

    public void SetAction(Func<Workflow, Step, CancellationToken, Task> action) => _action = action;

    public CommandValidationResult Validate(object? commandData, object? workflowContext) =>
        CommandValidationResult.Accept();

    public Task<ExecutionResult> ExecuteAsync(CommandExecutionContext context, CancellationToken cancellationToken)
    {
        if (_action is null)
            return Task.FromResult(ExecutionResult.CriticalError("No delegate action was set"));

        return ExecuteInternalAsync(context, cancellationToken);
    }

    private async Task<ExecutionResult> ExecuteInternalAsync(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        await _action!(context.Workflow, context.Step, cancellationToken);
        return ExecutionResult.Success();
    }
}
