using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Operator.Commands.OperatorCommand;
using WorkflowEngine.Resilience;

// CA2000: The service provider owns the limiter and disposes of it
#pragma warning disable CA2000

namespace WorkflowEngine.Operator.Tests.Fixtures;

/// <summary>
/// Unit test fixture for <see cref="Operator.Commands.OperatorCommand.OperatorCommand"/>: a WireMock server in the role of the
/// operator's callback router, a token file, and the command resolved from DI with a real HTTP client factory.
/// </summary>
internal sealed class OperatorCommandTestFixture : IDisposable
{
    public const string CallbackPath = "/workflow-engine-callbacks/";
    public const string InitialToken = "token-1";

    private OperatorCommandTestFixture(bool withToken)
    {
        CallbackRouter = WireMockServer.Start();
        CallbackRouter.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(200));
        TokenDirectory = Directory.CreateTempSubdirectory("operator-token-").FullName;
        var tokenPath = Path.Combine(TokenDirectory, "token");
        if (withToken)
            File.WriteAllText(tokenPath, InitialToken);
        Settings = new OperatorCommandSettings
        {
            CommandEndpoint = $"{CallbackRouter.Url}{CallbackPath}",
            TokenPath = withToken ? tokenPath : "",
        };

        var engineSettings = new EngineSettings
        {
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            MaxStepCommandTimeout = TimeSpan.FromHours(2),
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

        var services = new ServiceCollection();
        services.AddHttpClient();
        services.AddLogging();
        services.AddSingleton(Options.Create(engineSettings));
        services.AddSingleton(Options.Create(Settings));
        services.AddSingleton<IConcurrencyLimiter>(
            new ConcurrencyLimiter(
                engineSettings.Concurrency.MaxDbOperations,
                engineSettings.Concurrency.MaxHttpCalls,
                engineSettings.Concurrency.MaxWorkers
            )
        );
        services.AddSingleton<ICommand, Operator.Commands.OperatorCommand.OperatorCommand>();
        ServiceProvider = services.BuildServiceProvider();
    }

    /// <summary>
    /// WireMock in the role of the operator's callback router.
    /// </summary>
    public WireMockServer CallbackRouter { get; }

    /// <summary>
    /// A temporary directory that holds the token file at <see cref="OperatorCommandSettings.TokenPath"/>.
    /// </summary>
    public string TokenDirectory { get; }

    public OperatorCommandSettings Settings { get; }

    public ServiceProvider ServiceProvider { get; }

    /// <summary>
    /// Creates a fixture whose command reads its token from a file.
    /// </summary>
    public static OperatorCommandTestFixture Create() => new(withToken: true);

    /// <summary>
    /// Creates a fixture whose command is configured to send no token.
    /// </summary>
    public static OperatorCommandTestFixture CreateWithoutToken() => new(withToken: false);

    public ICommand GetOperatorCommand() =>
        ServiceProvider.GetServices<ICommand>().Single(c => c.CommandType == "operator");

    /// <summary>
    /// Creates a command like the registered one that reads its token from <paramref name="tokenPath"/>.
    /// </summary>
    public ICommand CreateOperatorCommand(string tokenPath) =>
        new Operator.Commands.OperatorCommand.OperatorCommand(
            Options.Create(Settings with { TokenPath = tokenPath }),
            ServiceProvider.GetRequiredService<IHttpClientFactory>(),
            ServiceProvider.GetRequiredService<IConcurrencyLimiter>(),
            NullLogger<Operator.Commands.OperatorCommand.OperatorCommand>.Instance
        );

    /// <summary>
    /// Makes the callback router answer every callback with <paramref name="statusCode"/> and <paramref name="body"/>.
    /// </summary>
    public void RespondWith(int statusCode, string? body = null)
    {
        CallbackRouter.Reset();
        var response = Response.Create().WithStatusCode(statusCode);
        if (body is not null)
            response = response.WithHeader("Content-Type", "application/json").WithBody(body);
        CallbackRouter.Given(Request.Create().UsingAnyMethod()).RespondWith(response);
    }

    public static OperatorWorkflowContext DefaultContext =>
        new()
        {
            Domain = "runs",
            Caller = "assistant",
            SubjectId = "4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b",
        };

    public static OperatorCommandData CreateCommandData(string commandKey = "run.admit") =>
        new() { CommandKey = commandKey };

    /// <summary>
    /// Creates a <see cref="CommandExecutionContext"/> with pre-deserialized typed data, matching what the engine's
    /// executor would produce.
    /// </summary>
    public static CommandExecutionContext CreateExecutionContext(
        OperatorCommandData commandData,
        OperatorWorkflowContext? workflowContext = null,
        Guid workflowId = default,
        Guid stepId = default,
        DateTimeOffset createdAt = default,
        string? stateIn = null,
        int retryCount = 0,
        int deferCount = 0,
        DateTimeOffset? firstDeferredAt = null,
        DateTimeOffset? executionDeadline = null,
        DateTimeOffset? waitDeadline = null,
        bool isFinalWaitCheck = false
    )
    {
        var context = workflowContext ?? DefaultContext;
        var step = new Step
        {
            CreatedAt = createdAt,
            OperationId = commandData.CommandKey,
            ProcessingOrder = 0,
            Command = Operator.Commands.OperatorCommand.OperatorCommand.Create(commandData),
            RequeueCount = retryCount,
            DeferCount = deferCount,
            FirstDeferredAt = firstDeferredAt,
        };
        SetDatabaseId(step, stepId);

        var workflow = new Workflow
        {
            OperationId = "run",
            IdempotencyKey = "assistant:test",
            Namespace = "runs-assistant",
            Context = JsonSerializer.SerializeToElement(context),
            Steps = [step],
        };
        SetDatabaseId(workflow, workflowId);

        return new CommandExecutionContext
        {
            Workflow = workflow,
            Step = step,
            RawCommandData = step.Command.Data,
            TypedCommandData = commandData,
            TypedWorkflowContext = context,
            StateIn = stateIn,
            ExecutionDeadline = executionDeadline,
            WaitDeadline = waitDeadline,
            IsFinalWaitCheck = isFinalWaitCheck,
        };
    }

    public void Dispose()
    {
        ServiceProvider.Dispose();
        CallbackRouter.Stop();
        CallbackRouter.Dispose();
        Directory.Delete(TokenDirectory, recursive: true);
    }

    // The engine assigns database ids on insert, and the setter is internal to the models.
    private static void SetDatabaseId(PersistentItem item, Guid id) =>
        typeof(PersistentItem).GetProperty(nameof(PersistentItem.DatabaseId))!.SetValue(item, id);
}
