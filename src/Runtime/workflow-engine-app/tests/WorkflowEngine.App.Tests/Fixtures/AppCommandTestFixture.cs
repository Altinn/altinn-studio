using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestKit;

// CA2000: Objects are transferred to the returned fixture record which handles disposal
#pragma warning disable CA2000

namespace WorkflowEngine.App.Tests.Fixtures;

/// <summary>
/// Unit test fixture for AppCommand. Provides a configured <see cref="ServiceProvider"/>
/// with mocked HTTP and AppCommand registered.
/// </summary>
internal sealed record AppCommandTestFixture(
    ServiceProvider ServiceProvider,
    MockHttpHandler HttpHandler,
    Mock<IHttpClientFactory> HttpClientFactoryMock,
    EngineSettings EngineSettings,
    AppCommandSettings AppCommandSettings
) : IDisposable
{
    public static AppCommandTestFixture Create(
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
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            Concurrency = new ConcurrencySettings
            {
                MaxWorkers = 5,
                MaxDbOperations = 5,
                MaxHttpCalls = 5,
            },
        };

        appCommandSettings ??= new AppCommandSettings
        {
            CommandEndpoint = "https://app.example.com/{Org}/{App}/commands/",
        };

        var services = new ServiceCollection();
        services.AddSingleton(httpClientFactoryMock.Object);
        services.AddSingleton(Options.Create(engineSettings));
        services.AddSingleton(Options.Create(appCommandSettings));
        services.AddLogging();
        services.AddSingleton<IConcurrencyLimiter>(
            new ConcurrencyLimiter(
                engineSettings.Concurrency.MaxDbOperations,
                engineSettings.Concurrency.MaxHttpCalls,
                engineSettings.Concurrency.MaxWorkers
            )
        );

        services.AddSingleton<ICommand, AppCommand>();
        services.AddSingleton<ICommand, WebhookCommand>();

        configureServices?.Invoke(services);

        return new AppCommandTestFixture(
            services.BuildServiceProvider(),
            handler,
            httpClientFactoryMock,
            engineSettings,
            appCommandSettings
        );
    }

    /// <summary>
    /// Gets the AppCommand instance from DI, typed as <see cref="ICommand"/>.
    /// </summary>
    public ICommand GetAppCommand() => ServiceProvider.GetServices<ICommand>().Single(c => c.CommandType == "app");

    public static AppWorkflowContext DefaultContext =>
        new()
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user-123" },
            LockToken = "test-lock-key",
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
        };

    public static JsonElement DefaultWorkflowContext => JsonSerializer.SerializeToElement(DefaultContext);

    /// <summary>
    /// Creates a <see cref="CommandExecutionContext"/> with pre-deserialized typed data,
    /// matching what the engine's executor would produce.
    /// </summary>
    public static CommandExecutionContext CreateExecutionContext(
        Workflow workflow,
        Step step,
        AppCommandData commandData,
        AppWorkflowContext? workflowContext = null,
        string? stateIn = null
    ) =>
        new()
        {
            Workflow = workflow,
            Step = step,
            RawCommandData = step.Command.Data,
            TypedCommandData = commandData,
            TypedWorkflowContext = workflowContext ?? DefaultContext,
            StateIn = stateIn,
        };

    public static Workflow CreateWorkflow(Step step) =>
        new()
        {
            CollectionKey = EngineAppFixture.DefaultCollectionKey,
            OperationId = "test-operation",
            IdempotencyKey = "test-wf-key",
            Namespace = "test-namespace",
            Context = DefaultWorkflowContext,
            Steps = [step],
        };

    public static Step CreateStep(CommandDefinition command, string operationId = "test-step-op") =>
        new()
        {
            OperationId = operationId,
            ProcessingOrder = 0,
            Command = command,
        };

    public void Dispose()
    {
        ServiceProvider.Dispose();
        HttpHandler.Dispose();
    }
}
