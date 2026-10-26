using System.Runtime.CompilerServices;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Altinn.App.PlatformServices.Tests.Internal.Process.StubGatewayFilters;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessTaskConfigurationValidationServiceTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task StartAsync_DisposesScopedTaskDependenciesAfterValidation(bool invalidConfiguration)
    {
        ServiceCollection services = CreateServices(
            ProcessTestUtils.SetupProcessReader("service-task-custom-type.bpmn")
        );
        ScopedDependency? dependency = null;
        services.AddScoped(_ => dependency = new ScopedDependency());
        services.AddTransient<IServiceTask>(provider =>
        {
            ScopedDependency scopedDependency = provider.GetRequiredService<ScopedDependency>();
            return new ValidatedServiceTask("archive", _ => scopedDependency.Validate(invalidConfiguration));
        });
        await using ServiceProvider provider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );
        var service = new ProcessTaskConfigurationValidationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            services,
            NullLogger<ProcessTaskConfigurationValidationService>.Instance
        );

        Exception? exception = await Record.ExceptionAsync(() => service.StartAsync(CancellationToken.None));

        if (invalidConfiguration)
            Assert.Contains("invalid app configuration", Assert.IsType<ApplicationConfigException>(exception).Message);
        else
            Assert.Null(exception);
        Assert.NotNull(dependency);
        Assert.True(dependency.Validated);
        // The validation scope must dispose the dependency before the root provider is disposed.
        Assert.True(dependency.Disposed);
    }

    private sealed class ScopedDependency : IAsyncDisposable
    {
        public bool Validated { get; private set; }
        public bool Disposed { get; private set; }

        public IEnumerable<string> Validate(bool invalidConfiguration)
        {
            Assert.False(Disposed);
            Validated = true;
            if (invalidConfiguration)
                yield return "invalid app configuration";
        }

        public ValueTask DisposeAsync()
        {
            Disposed = true;
            return ValueTask.CompletedTask;
        }
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" \t")]
    public async Task StartAsync_MissingOrBlankTaskType_FailsValidation(string? taskType)
    {
        var reader = new Mock<IProcessReader>();
        reader.Setup(r => r.GetExclusiveGateways()).Returns([]);
        reader
            .Setup(r => r.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "Task_Missing",
                    ExtensionElements = new ExtensionElements
                    {
                        TaskExtension = new AltinnTaskExtension { TaskType = taskType },
                    },
                },
                new ProcessTask { Id = "Task_NoExtension" },
            ]);

        var exception = await Validate(_ => { }, reader.Object);

        Assert.NotNull(exception);
        Assert.Contains("Task_Missing", exception.Message);
        Assert.Contains("Task_NoExtension", exception.Message);
        Assert.Contains("missing or blank", exception.Message);
    }

    [Fact]
    public async Task StartAsync_UsesLastExactTypeMatchAndPrefersServiceTasks()
    {
        var contexts = new List<ProcessTaskValidationContext>();
        var exception = await Validate(
            services =>
            {
                services.AddSingleton<IProcessTask>(
                    new TestTask("data", _ => throw new InvalidOperationException("replaced"))
                );
                services.AddSingleton<IProcessTask>(
                    new TestTask(
                        "data",
                        context =>
                        {
                            contexts.Add(context);
                            return [];
                        }
                    )
                );
                services.AddSingleton<IProcessTask>(
                    new TestTask("archive", _ => throw new InvalidOperationException("service task takes precedence"))
                );
                services.AddSingleton<IServiceTask>(
                    new ValidatedServiceTask(
                        "archive",
                        _ => throw new InvalidOperationException("replaced service task")
                    )
                );
                services.AddSingleton<IServiceTask>(
                    new ValidatedServiceTask(
                        "archive",
                        context =>
                        {
                            contexts.Add(context);
                            return [];
                        }
                    )
                );
                services.AddSingleton<IProcessTask>(
                    new TestTask("DATA", _ => throw new InvalidOperationException("different case"))
                );
            },
            ProcessTestUtils.SetupProcessReader("service-task-custom-type.bpmn")
        );

        Assert.Null(exception);
        Assert.Contains(contexts, context => context.TaskId == "Task_Custom");
        Assert.All(
            contexts,
            context =>
            {
                Assert.Equal(HostingEnvironment.Staging, context.Environment);
                Assert.Equal("ttd/app", context.ApplicationMetadata.Id);
            }
        );
    }

    [Fact]
    public async Task StartAsync_ReportsValidationErrorsAndExceptionsFromAllTasks()
    {
        var exception = await Validate(
            services =>
            {
                services.AddSingleton<IProcessTask>(new TestTask("data", _ => ["first problem", "second problem"]));
                services.AddSingleton<IProcessTask>(
                    new TestTask("archive", _ => throw new InvalidOperationException("broken configuration"))
                );
            },
            ProcessTestUtils.SetupProcessReader("plain-task-custom-type.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("first problem", exception.Message);
        Assert.Contains("second problem", exception.Message);
        Assert.Contains(
            "Task 'Task_Custom': validating its configuration failed: broken configuration",
            exception.Message
        );
    }

    [Theory]
    [InlineData("bpmn")]
    [InlineData("metadata")]
    [InlineData("task")]
    public async Task StartAsync_WhenConfigurationOrTaskResolutionFails_Throws(string failingDependency)
    {
        var reader = new Mock<IProcessReader>();
        reader.Setup(r => r.GetProcessTasks()).Returns([]);
        if (failingDependency == "bpmn")
            reader.Setup(r => r.GetProcessTasks()).Throws(new InvalidOperationException("unreadable bpmn"));

        var exception = await Validate(
            services =>
            {
                if (failingDependency == "metadata")
                {
                    var metadata = new Mock<IAppMetadata>();
                    metadata
                        .Setup(m => m.ApplicationMetadata)
                        .Throws(new InvalidOperationException("unreadable metadata"));
                    services.AddSingleton(metadata.Object);
                }
                if (failingDependency == "task")
                    services.AddTransient<IProcessTask>(_ => throw new InvalidOperationException("unreadable task"));
            },
            reader.Object
        );

        Assert.NotNull(exception);
        Assert.Contains($"unreadable {failingDependency}", exception.Message);
        Assert.IsType<InvalidOperationException>(exception.InnerException);
    }

    private sealed class ValidatedServiceTask(
        string type,
        Func<ProcessTaskValidationContext, IEnumerable<string>> validate
    ) : IServiceTask
    {
        public string Type => type;

        public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context) => validate(context);

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            throw new InvalidOperationException("Validation must not execute the task.");
    }

    // Validation uses altinn:taskType for both BPMN tasks and service tasks, as task execution does.
    [Theory]
    [InlineData("pdf-service-task.bpmn", "Task_Pdf", "pdf")]
    [InlineData("plain-task-custom-type.bpmn", "Task_Custom", "archive")]
    public async Task StartAsync_UnregisteredTaskType_FailsValidation(string bpmn, string taskId, string taskType)
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new SimpleTask("simple")),
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        Assert.NotNull(exception);
        Assert.Contains(taskId, exception.Message, StringComparison.Ordinal);
        Assert.Contains($"<altinn:taskType>{taskType}</altinn:taskType>", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'simple'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'data'", exception.Message, StringComparison.Ordinal);
        Assert.Single(
            exception.Message.Split(Environment.NewLine),
            line => line.Contains("Registered task types:", StringComparison.Ordinal)
        );
    }

    [Theory]
    [InlineData("pdf-service-task.bpmn", "pdf", true)]
    [InlineData("service-task-custom-type.bpmn", "archive", true)]
    [InlineData("plain-task-custom-type.bpmn", "archive", false)]
    public async Task StartAsync_RegisteredTaskTypeOnMatchingElement_PassesValidation(
        string bpmn,
        string taskType,
        bool isServiceTask
    )
    {
        var exception = await Validate(
            s =>
            {
                if (isServiceTask)
                    s.AddSingleton<IServiceTask>(new SimpleTask(taskType));
                else
                    s.AddSingleton<IProcessTask>(new TestTask(taskType));
            },
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        Assert.Null(exception);
    }

    [Theory]
    [InlineData("plain-task-custom-type.bpmn", "Task_Custom", "archive", true, true)]
    [InlineData("pdf-plain-task.bpmn", "Task_Pdf", "pdf", true, true)]
    [InlineData("service-task-custom-type.bpmn", "Task_Custom", "archive", false, true)]
    // CreateServices registers the data task, as the built-in registrations do.
    [InlineData("data-service-task.bpmn", "Task_Data", "data", false, false)]
    public async Task StartAsync_ElementDoesNotMatchTaskType_FailsValidation(
        string bpmn,
        string taskId,
        string taskType,
        bool isServiceTask,
        bool register
    )
    {
        var exception = await Validate(
            s =>
            {
                if (!register)
                    return;
                if (isServiceTask)
                    s.AddSingleton<IServiceTask>(new SimpleTask(taskType));
                else
                    s.AddSingleton<IProcessTask>(new TestTask(taskType));
            },
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        string expected = isServiceTask
            ? $"  - Task '{taskId}' declares <altinn:taskType>{taskType}</altinn:taskType>, which is a service task, "
                + "but is a <bpmn:task> element. Change it to a <bpmn:serviceTask> element."
            : $"  - Task '{taskId}' declares <altinn:taskType>{taskType}</altinn:taskType>, which is not a service task, "
                + "but is a <bpmn:serviceTask> element. Change it to a <bpmn:task> element.";
        Assert.NotNull(exception);
        string finding = Assert.Single(
            exception.Message.Split(Environment.NewLine),
            line => line.StartsWith("  - ", StringComparison.Ordinal)
        );
        Assert.Equal(expected, finding);
    }

    [Fact]
    public async Task StartAsync_ElementMismatch_StillReportsTaskConfigurationFindings()
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new ValidatedServiceTask("archive", _ => ["missing archive settings"])),
            ProcessTestUtils.SetupProcessReader("plain-task-custom-type.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("but is a <bpmn:task> element", exception.Message, StringComparison.Ordinal);
        Assert.Contains("Task 'Task_Custom': missing archive settings", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("plain-task-custom-type.bpmn", false)]
    [InlineData("service-task-custom-type.bpmn", true)]
    public async Task StartAsync_ServiceTaskRegisteredOnlyAsProcessTask_IsValidatedAsProcessTask(
        string bpmn,
        bool expectMismatch
    )
    {
        // The runtime runs a task as a service task only when the service-task lookup finds it, so a
        // service task implementation registered as an IProcessTask alone is a process task.
        var exception = await Validate(
            s => s.AddSingleton<IProcessTask>(new SimpleTask("archive")),
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        if (expectMismatch)
        {
            Assert.NotNull(exception);
            Assert.Contains("which is not a service task", exception.Message, StringComparison.Ordinal);
        }
        else
        {
            Assert.Null(exception);
        }
    }

    [Fact]
    public async Task StartAsync_BlankTypeOnTaskOrServiceTask_FailsValidation()
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new SimpleTask("pdf")),
            ProcessTestUtils.SetupProcessReader("service-task-empty-type.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("Task_Generic", exception.Message, StringComparison.Ordinal);
        Assert.Contains("Task_Blank", exception.Message, StringComparison.Ordinal);
        Assert.Contains(
            "has no task type: its <altinn:taskType> is missing or blank",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("Registered task types:", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'pdf'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task StartAsync_TaskTypeWithDifferentCase_FailsValidation()
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new SimpleTask("PDF")),
            ProcessTestUtils.SetupProcessReader("pdf-service-task.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("Task_Pdf", exception.Message, StringComparison.Ordinal);
        Assert.Contains("matched exactly, including case", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task StartAsync_BuiltInTasksWithoutServiceTasks_PassValidation()
    {
        var exception = await Validate(_ => { }, ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"));

        Assert.Null(exception);
    }

    [Fact]
    public async Task StartAsync_DisabledBuiltInTask_ReportsRequiredBuilderMethod()
    {
        var exception = await Validate(_ => { }, ProcessTestUtils.SetupProcessReader("fiks-arkiv-service-task.bpmn"));

        Assert.NotNull(exception);
        Assert.Contains("Task_Arkiv", exception.Message, StringComparison.Ordinal);
        Assert.Contains("services.AddFiksArkiv()", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("AddTransient", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task StartAsync_UnreferencedAppServiceTask_LogsWarning()
    {
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();

        var exception = await Validate(
            s =>
            {
                s.AddSingleton<IServiceTask>(new SimpleTask("archive"));
                s.AddSingleton<IServiceTask>(new SimpleTask("archive"));
                s.AddSingleton<IPipelineServiceTask>(new SimpleTask("notify"));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"),
            logger
        );

        Assert.Null(exception);
        FakeLogRecord[] warnings = logger
            .Collector.GetSnapshot()
            .Where(record => record.Level == LogLevel.Warning)
            .ToArray();
        Assert.Collection(
            warnings,
            warning =>
                Assert.Equal(
                    $"Service task type 'archive' is registered ({typeof(SimpleTask).FullName}), "
                        + "but no task in the process definition declares it.",
                    warning.Message
                ),
            warning => Assert.StartsWith("Service task type 'notify' is registered", warning.Message)
        );
    }

    [Fact]
    public async Task StartAsync_ReferencedAppServiceTask_DoesNotWarn()
    {
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();

        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new SimpleTask("archive")),
            ProcessTestUtils.SetupProcessReader("service-task-custom-type.bpmn"),
            logger
        );

        Assert.Null(exception);
        Assert.DoesNotContain(logger.Collector.GetSnapshot(), record => record.Level == LogLevel.Warning);
    }

    [Fact]
    public async Task StartAsync_UnreferencedLibraryServiceTasks_DoNotWarn()
    {
        // The library registers these for every app, so leaving them unused is normal.
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();

        var exception = await Validate(
            s =>
            {
                s.AddSingleton<IServiceTask>(Uninitialized<PdfServiceTask>());
                s.AddSingleton<IPipelineServiceTask>(Uninitialized<EFormidlingServiceTask>());
                s.AddSingleton<IServiceTask>(Uninitialized<SubformPdfServiceTask>());
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"),
            logger
        );

        Assert.Null(exception);
        Assert.DoesNotContain(logger.Collector.GetSnapshot(), record => record.Level == LogLevel.Warning);
    }

    [Fact]
    public async Task StartAsync_UnreferencedAppReplacementOfLibraryServiceTask_LogsWarning()
    {
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();

        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new SimpleTask(AltinnTaskTypes.Pdf)),
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"),
            logger
        );

        Assert.Null(exception);
        FakeLogRecord warning = Assert.Single(
            logger.Collector.GetSnapshot(),
            record => record.Level == LogLevel.Warning
        );
        Assert.StartsWith("Service task type 'pdf' is registered", warning.Message);
    }

    [Fact]
    public async Task StartAsync_UnreferencedTypeRegisteredTwice_WarningNamesTheLastRegistration()
    {
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();

        var exception = await Validate(
            s =>
            {
                s.AddSingleton<IServiceTask>(new SimpleTask("archive"));
                s.AddSingleton<IServiceTask>(new OtherSimpleTask("archive"));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"),
            logger
        );

        Assert.Null(exception);
        FakeLogRecord warning = Assert.Single(
            logger.Collector.GetSnapshot(),
            record => record.Level == LogLevel.Warning
        );
        Assert.Contains($"({typeof(OtherSimpleTask).FullName})", warning.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task StartAsync_RequestDependentGateway_DefersOnlyCodeDependentValidation(bool expressions)
    {
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();
        var httpContext = new Microsoft.AspNetCore.Http.HttpContextAccessor();
        var exception = await Validate(
            services =>
                services.AddTransient<IProcessExclusiveGateway>(provider =>
                {
                    _ = httpContext.HttpContext ?? throw new InvalidOperationException("No HTTP context available");
                    return new DataValuesFilter("Gateway1", "choose");
                }),
            GatewayReader(null, Flow("Flow3", false), Flow("Flow4", expressions)),
            logger
        );

        if (expressions)
        {
            Assert.NotNull(exception);
            Assert.Contains("not its default: 'Flow3'", exception.Message);
        }
        else
        {
            Assert.Null(exception);
        }
        Assert.Contains(
            logger.Collector.GetSnapshot(),
            record =>
                record.Level == LogLevel.Warning
                && record.Message.Contains("deferred until navigation", StringComparison.Ordinal)
        );
    }

    [Fact]
    public async Task StartAsync_GatewayDefaultWithoutCondition_PassesValidation()
    {
        var exception = await Validate(_ => { }, ProcessTestUtils.SetupProcessReader("gateway-default-fallback.bpmn"));

        Assert.Null(exception);
    }

    [Theory]
    // Every flow has a condition.
    [InlineData(null, true, true, false)]
    // No conditions and no default: the app's own gateway code decides.
    [InlineData(null, false, false, true)]
    // No conditions: the app's own gateway code decides, so the default is up to it.
    [InlineData("Flow3", false, false, true)]
    public async Task StartAsync_GatewayFlowsWithConditionsOrOwnCode_PassValidation(
        string? defaultFlow,
        bool flow3HasCondition,
        bool flow4HasCondition,
        bool gatewayCode
    )
    {
        var exception = await Validate(
            s =>
            {
                if (gatewayCode)
                    s.AddSingleton<IProcessExclusiveGateway>(new DataValuesFilter("Gateway1", "choose"));
            },
            GatewayReader(defaultFlow, Flow("Flow3", flow3HasCondition), Flow("Flow4", flow4HasCondition))
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task StartAsync_GatewayWithOnlyOneFlowWithoutCondition_PassesValidation()
    {
        var exception = await Validate(_ => { }, GatewayReader(null, Flow("Flow3", false)));

        Assert.Null(exception);
    }

    // Without code for the gateway, both flows are always taken.
    [Fact]
    public async Task StartAsync_FlowsWithoutConditionOrDefault_FailsValidation()
    {
        var exception = await Validate(_ => { }, GatewayReader(null, Flow("Flow3", false), Flow("Flow4", false)));

        Assert.NotNull(exception);
        Assert.Contains("not its default: 'Flow3', 'Flow4'. ", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("default=", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task StartAsync_FlowWithoutConditionBesideConditions_SuggestsMakingItTheDefault()
    {
        var exception = await Validate(_ => { }, GatewayReader(null, Flow("Flow3", false), Flow("Flow4", true)));

        Assert.NotNull(exception);
        Assert.Contains(
            "Exclusive gateway 'Gateway1' has outgoing sequence flows without a condition that are not its default: "
                + "'Flow3'.",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("default=\"Flow3\"", exception.Message, StringComparison.Ordinal);
    }

    // Without code for the gateway, Flow4 would always be taken and the default never.
    [Fact]
    public async Task StartAsync_FlowWithoutConditionBesideDefault_FailsValidation()
    {
        var exception = await Validate(_ => { }, GatewayReader("Flow3", Flow("Flow3", false), Flow("Flow4", false)));

        Assert.NotNull(exception);
        Assert.Contains("not its default: 'Flow4'. ", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("default=", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    // Beside a flow with a condition.
    [InlineData(true, false)]
    // Beside a flow without one, which the app's own gateway code would choose if the default had no condition.
    [InlineData(false, true)]
    public async Task StartAsync_DefaultFlowWithCondition_FailsValidation(bool flow4HasCondition, bool gatewayCode)
    {
        var exception = await Validate(
            s =>
            {
                if (gatewayCode)
                    s.AddSingleton<IProcessExclusiveGateway>(new DataValuesFilter("Gateway1", "choose"));
            },
            GatewayReader("Flow3", Flow("Flow3", true), Flow("Flow4", flow4HasCondition))
        );

        Assert.NotNull(exception);
        Assert.Contains(
            "  - Exclusive gateway 'Gateway1' has a condition on its default, sequence flow 'Flow3'. The gateway takes "
                + "its default only when no other flow's condition holds, and never evaluates the default's own "
                + "condition. Remove the condition from 'Flow3', or remove default=\"Flow3\" from the gateway so the "
                + "condition is evaluated.",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    private static SequenceFlow Flow(string id, bool hasCondition) =>
        new()
        {
            Id = id,
            SourceRef = "Gateway1",
            TargetRef = "EndEvent",
            ConditionExpression = hasCondition ? """["equals", ["gatewayAction"], "reject"]""" : null,
        };

    private static IProcessReader GatewayReader(string? defaultFlow, params SequenceFlow[] flows)
    {
        var gateway = new ExclusiveGateway
        {
            Id = "Gateway1",
            Default = defaultFlow,
            Outgoing = flows.Select(flow => flow.Id).ToList(),
        };
        var reader = new Mock<IProcessReader>();
        reader.Setup(r => r.GetProcessTasks()).Returns([]);
        reader.Setup(r => r.GetExclusiveGateways()).Returns([gateway]);
        reader.Setup(r => r.GetOutgoingSequenceFlows(gateway)).Returns(flows.ToList());
        return reader.Object;
    }

    public static TheoryData<Type> TaskHookTypes =>
        [typeof(IOnTaskStartingHandler), typeof(IOnTaskEndingHandler), typeof(IOnTaskAbandonHandler)];

    [Theory]
    [MemberData(nameof(TaskHookTypes))]
    public async Task StartAsync_TwoTaskHooksRunForTheSameTask_FailsValidation(Type hookType)
    {
        var exception = await Validate(
            s =>
            {
                s.AddSingleton(hookType, new Hook(_ => true));
                s.AddSingleton(hookType, new OtherHook(taskId => taskId == "Task1"));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn")
        );

        Assert.NotNull(exception);
        string finding = Assert.Single(
            exception.Message.Split(Environment.NewLine),
            line => line.StartsWith("  - ", StringComparison.Ordinal)
        );
        Assert.Equal(
            $"  - Task 'Task1' has 2 {hookType.Name} implementations that run for it "
                + $"({typeof(Hook).FullName}, {typeof(OtherHook).FullName}). Only one may run for a task: combine them, "
                + "or change ShouldRunForTask so that only one returns true.",
            finding
        );
    }

    [Theory]
    [MemberData(nameof(TaskHookTypes))]
    public async Task StartAsync_TaskHooksForDifferentTasks_PassValidation(Type hookType)
    {
        var exception = await Validate(
            s =>
            {
                s.AddSingleton(hookType, new Hook(taskId => taskId == "Task1"));
                s.AddSingleton(hookType, new OtherHook(taskId => taskId == "Task2"));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn")
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task StartAsync_TwoProcessEndedHooks_FailsValidation()
    {
        var exception = await Validate(
            s =>
            {
                s.AddSingleton<IOnProcessEndedHandler>(new Hook(_ => true));
                s.AddSingleton<IOnProcessEndedHandler>(new OtherHook(_ => true));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains(
            $"  - 2 {nameof(IOnProcessEndedHandler)} implementations are registered "
                + $"({typeof(Hook).FullName}, {typeof(OtherHook).FullName}). Register only one.",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task StartAsync_OneHookOfEachKind_PassesValidation()
    {
        var hook = new Hook(_ => true);
        var exception = await Validate(
            s =>
            {
                s.AddSingleton<IOnTaskStartingHandler>(hook);
                s.AddSingleton<IOnTaskEndingHandler>(hook);
                s.AddSingleton<IOnTaskAbandonHandler>(hook);
                s.AddSingleton<IOnProcessEndedHandler>(hook);
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn")
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task StartAsync_HookThatCannotBeCreated_IsSkippedWithAWarning()
    {
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();

        var exception = await Validate(
            s =>
            {
                s.AddTransient<IOnTaskEndingHandler>(_ => throw new InvalidOperationException("needs request state"));
                s.AddSingleton<IOnTaskEndingHandler>(new Hook(_ => true));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"),
            logger
        );

        Assert.Null(exception);
        FakeLogRecord warning = Assert.Single(
            logger.Collector.GetSnapshot(),
            record => record.Level == LogLevel.Warning
        );
        Assert.StartsWith(
            $"Could not create a factory registration of {nameof(IOnTaskEndingHandler)} at startup",
            warning.Message,
            StringComparison.Ordinal
        );
    }

    [Theory]
    [MemberData(nameof(TaskHookTypes))]
    public async Task StartAsync_HookThatCannotBeCreated_DoesNotHideTwoOthersForTheSameTask(Type hookType)
    {
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();

        var exception = await Validate(
            s =>
            {
                s.AddTransient(hookType, typeof(Task1Hook));
                s.AddTransient(hookType, _ => throw new InvalidOperationException("needs request state"));
                s.AddScoped(hookType, typeof(OtherTask1Hook));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"),
            logger
        );

        Assert.NotNull(exception);
        Assert.Contains(
            $"  - Task 'Task1' has 2 {hookType.Name} implementations that run for it "
                + $"({typeof(Task1Hook).FullName}, {typeof(OtherTask1Hook).FullName}).",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Single(logger.Collector.GetSnapshot(), record => record.Level == LogLevel.Warning);
    }

    [Fact]
    public async Task StartAsync_TwoProcessEndedHooks_FailsValidationEvenIfOneCannotBeCreated()
    {
        var exception = await Validate(
            s =>
            {
                s.AddSingleton<IOnProcessEndedHandler>(new Hook(_ => true));
                s.AddTransient<IOnProcessEndedHandler>(_ => throw new InvalidOperationException("needs request state"));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains(
            $"  - 2 {nameof(IOnProcessEndedHandler)} implementations are registered "
                + $"({typeof(Hook).FullName}, a factory registration of {nameof(IOnProcessEndedHandler)}). "
                + "Register only one.",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    public static TheoryData<Type> AllHookTypes =>
        [
            typeof(IOnTaskStartingHandler),
            typeof(IOnTaskEndingHandler),
            typeof(IOnTaskAbandonHandler),
            typeof(IOnProcessEndedHandler),
        ];

    [Theory]
    [MemberData(nameof(AllHookTypes))]
    public async Task StartAsync_KeyedHook_IsNotChecked(Type hookType)
    {
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();

        var exception = await Validate(
            s =>
            {
                s.AddKeyedSingleton(hookType, "other", new Hook(_ => true));
                s.AddSingleton(hookType, new Hook(_ => true));
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"),
            logger
        );

        Assert.Null(exception);
        Assert.Empty(logger.Collector.GetSnapshot());
    }

    [Fact]
    public async Task StartAsync_DisposesHooksCreatedFromTheirTypeButNotFactoryResults()
    {
        var disposals = new DisposalLog();
        var factoryHook = new DisposableHook(disposals);

        var exception = await Validate(
            s =>
            {
                s.AddSingleton(disposals);
                s.AddTransient<IOnTaskEndingHandler, DisposableHook>();
                // A factory may return an instance the service provider owns.
                s.AddTransient<IOnTaskStartingHandler>(_ => factoryHook);
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn")
        );

        Assert.Null(exception);
        DisposableHook disposed = Assert.Single(disposals.Hooks);
        Assert.NotSame(factoryHook, disposed);
    }

    private sealed class DisposalLog
    {
        public List<DisposableHook> Hooks { get; } = [];
    }

    private sealed class DisposableHook(DisposalLog disposals)
        : IOnTaskStartingHandler,
            IOnTaskEndingHandler,
            IDisposable
    {
        public bool ShouldRunForTask(string taskId) => true;

        public Task<HookResult> Execute(OnTaskStartingContext context) =>
            throw new InvalidOperationException("Validation must not execute the hook.");

        public Task<HookResult> Execute(OnTaskEndingContext context) =>
            throw new InvalidOperationException("Validation must not execute the hook.");

        public void Dispose() => disposals.Hooks.Add(this);
    }

    private sealed class Task1Hook() : Hook(taskId => taskId == "Task1");

    private sealed class OtherTask1Hook() : Hook(taskId => taskId == "Task1");

    private class Hook(Func<string, bool> runsForTask)
        : IOnTaskStartingHandler,
            IOnTaskEndingHandler,
            IOnTaskAbandonHandler,
            IOnProcessEndedHandler
    {
        public bool ShouldRunForTask(string taskId) => runsForTask(taskId);

        public Task<HookResult> Execute(OnTaskStartingContext context) => throw NotExecuted();

        public Task<HookResult> Execute(OnTaskEndingContext context) => throw NotExecuted();

        public Task<HookResult> Execute(OnTaskAbandonContext context) => throw NotExecuted();

        public Task<HookResult> Execute(OnProcessEndedContext context) => throw NotExecuted();

        private static InvalidOperationException NotExecuted() => new("Validation must not execute the hook.");
    }

    private sealed class OtherHook(Func<string, bool> runsForTask) : Hook(runsForTask);

    private sealed class OtherSimpleTask(string type) : IServiceTask
    {
        public string Type => type;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            throw new InvalidOperationException("Validation must not execute the task.");
    }

    private static T Uninitialized<T>()
        where T : class => (T)RuntimeHelpers.GetUninitializedObject(typeof(T));

    private sealed class SimpleTask(string type) : IServiceTask
    {
        public string Type => type;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            throw new InvalidOperationException("Validation must not execute the task.");
    }

    private static async Task<ApplicationConfigException?> Validate(
        Action<IServiceCollection> register,
        IProcessReader processReader,
        ILogger<ProcessTaskConfigurationValidationService>? logger = null
    )
    {
        ServiceCollection services = CreateServices(processReader);
        register(services);
        await using ServiceProvider provider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );
        var service = new ProcessTaskConfigurationValidationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            services,
            logger ?? NullLogger<ProcessTaskConfigurationValidationService>.Instance
        );
        return (ApplicationConfigException?)
            await Record.ExceptionAsync(() => service.StartAsync(CancellationToken.None));
    }

    private static ServiceCollection CreateServices(IProcessReader processReader)
    {
        var services = new ServiceCollection();
        services.AddSingleton(processReader);
        var metadata = new Mock<IAppMetadata>();
        metadata.Setup(m => m.ApplicationMetadata).Returns(new ApplicationMetadata("ttd/app"));
        services.AddSingleton(metadata.Object);
        var environment = new Mock<IHostEnvironment>();
        environment.SetupGet(e => e.EnvironmentName).Returns("tt02");
        services.AddSingleton(environment.Object);
        foreach (string type in new[] { "data", "confirmation", "feedback", "signing", "payment", "NullType" })
            services.AddSingleton<IProcessTask>(new TestTask(type));
        return services;
    }

    private sealed class TestTask(string type, Func<ProcessTaskValidationContext, IEnumerable<string>>? validate = null)
        : IProcessTask
    {
        public string Type => type;

        public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context) =>
            validate?.Invoke(context) ?? [];
    }
}
