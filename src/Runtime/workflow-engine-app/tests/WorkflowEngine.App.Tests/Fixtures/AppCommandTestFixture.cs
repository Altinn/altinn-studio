using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Api;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestKit;

// CA2000: Objects are transferred to the returned fixture record which handles disposal
#pragma warning disable CA2000

namespace WorkflowEngine.App.Tests.Fixtures;

/// <summary>
/// Unit test fixture for AppCommand. Provides a configured <see cref="ServiceProvider"/>
/// with mocked HTTP, AppCommand and WebhookCommand registered.
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

        services.AddSingleton<ICommand, AppCommand>();
        services.AddSingleton<ICommand, WebhookCommand>();
        services.AddSingleton<ICommandRegistry, CommandRegistry>();
        services.AddSingleton<IWorkflowExecutor, WorkflowExecutor>();

        configureServices?.Invoke(services);

        return new AppCommandTestFixture(
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

    public static Workflow CreateWorkflow(Step step) =>
        new()
        {
            OperationId = "test-operation",
            IdempotencyKey = "test-wf-key",
            TenantId = "test-tenant",
            Context = DefaultWorkflowContext,
            Steps = [step],
        };

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
