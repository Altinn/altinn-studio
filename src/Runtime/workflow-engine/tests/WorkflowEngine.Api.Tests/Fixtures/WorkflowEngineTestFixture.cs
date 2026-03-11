using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.CommandHandlers;
using WorkflowEngine.CommandHandlers.Handlers.AppCommand;
using WorkflowEngine.CommandHandlers.Handlers.Webhook;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Models;

// CA2000: Objects are transferred to the returned fixture record which handles disposal
#pragma warning disable CA2000

namespace WorkflowEngine.Api.Tests.Fixtures;

/// <summary>
/// Shared test fixture for WorkflowEngine.Api services.
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
    EngineSettings EngineSettings,
    AppCommandSettings AppCommandSettings
) : IDisposable
{
    /// <summary>
    /// Creates a new test fixture with sensible defaults.
    /// </summary>
    /// <param name="configureServices">Optional delegate to register additional services or override defaults.</param>
    /// <param name="engineSettings">Optional engine settings override.</param>
    /// <param name="appCommandSettings">Optional app command settings override.</param>
    public static WorkflowEngineTestFixture Create(
        Action<IServiceCollection>? configureServices = null,
        EngineSettings? engineSettings = null,
        AppCommandSettings? appCommandSettings = null
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

        appCommandSettings ??= new AppCommandSettings
        {
            ApiKey = "test-api-key",
            CommandEndpoint = "https://app.example.com/{Org}/{App}/commands/",
        };

        var services = new ServiceCollection();
        services.AddSingleton(httpClientFactoryMock.Object);
        services.AddSingleton(Options.Create(engineSettings));
        services.AddSingleton(Options.Create(appCommandSettings));
        services.AddLogging();
        services.AddSingleton<IConcurrencyLimiter>(
            new ConcurrencyLimiter(engineSettings.MaxConcurrentDbOperations, engineSettings.MaxConcurrentHttpCalls)
        );

        // Register default command descriptors and the registry
        services.AddSingleton<ICommand, AppCommand>();
        services.AddSingleton<ICommand, WebhookCommand>();
        services.AddSingleton<ICommandRegistry, CommandRegistry>();
        services.AddSingleton<IWorkflowExecutor, WorkflowExecutor>();

        configureServices?.Invoke(services);

        return new WorkflowEngineTestFixture(
            services.BuildServiceProvider(),
            handler,
            httpClientFactoryMock,
            engineSettings,
            appCommandSettings
        );
    }

    public static JsonElement DefaultWorkflowContext =>
        JsonSerializer.SerializeToElement(
            new
            {
                Actor = new Actor { UserIdOrOrgNumber = "test-user-123" },
                LockToken = "test-lock-key",
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            }
        );

    public static Workflow CreateWorkflow(Step? step = null, string? tenantId = "test-tenant")
    {
        return new Workflow
        {
            OperationId = "test-operation",
            IdempotencyKey = "test-wf-key",
            TenantId = tenantId ?? "test-tenant",
            Context = DefaultWorkflowContext,
            Steps = step != null ? [step] : [],
        };
    }

    public static Step CreateStep(CommandDefinition command) =>
        new()
        {
            OperationId = command.OperationId,
            IdempotencyKey = $"test-step-key/{command.OperationId}",
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
