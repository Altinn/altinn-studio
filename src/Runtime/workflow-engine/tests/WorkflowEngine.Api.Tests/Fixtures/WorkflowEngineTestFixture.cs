using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
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

        configureServices?.Invoke(services);

        return new WorkflowEngineTestFixture(
            services.BuildServiceProvider(),
            handler,
            httpClientFactoryMock,
            engineSettings,
            appCommandSettings
        );
    }

    public static InstanceInformation DefaultInstanceInformation =>
        new()
        {
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
        };

    public static Actor DefaultActor => new() { UserIdOrOrgNumber = "test-user-123" };

    public static Workflow CreateWorkflow(Step? step = null, string? instanceLockKey = "test-lock-key")
    {
        return new Workflow
        {
            IdempotencyKey = Guid.NewGuid().ToString(),
            OperationId = "test-operation",
            Actor = DefaultActor,
            InstanceInformation = DefaultInstanceInformation,
            InstanceLockKey = instanceLockKey,
            Steps = step != null ? [step] : [],
        };
    }

    public static Step CreateStep(Command command) =>
        new()
        {
            IdempotencyKey = Guid.NewGuid().ToString(),
            OperationId = command.OperationId,
            ProcessingOrder = 0,
            Command = command,
            Actor = DefaultActor,
        };

    public void Dispose()
    {
        ServiceProvider.Dispose();
        HttpHandler.Dispose();
    }
}
