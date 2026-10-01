using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
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
                + "but is drawn as <bpmn:task>. Draw it as <bpmn:serviceTask>."
            : $"  - Task '{taskId}' declares <altinn:taskType>{taskType}</altinn:taskType>, which is not a service task, "
                + "but is drawn as <bpmn:serviceTask>. Draw it as <bpmn:task>.";
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
        Assert.Contains("but is drawn as <bpmn:task>", exception.Message, StringComparison.Ordinal);
        Assert.Contains("Task 'Task_Custom': missing archive settings", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("plain-task-custom-type.bpmn", false)]
    [InlineData("service-task-custom-type.bpmn", true)]
    public async Task StartAsync_ServiceTaskRegisteredOnlyAsProcessTask_MustBeDrawnAsTask(
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

    private sealed class SimpleTask(string type) : IServiceTask
    {
        public string Type => type;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            throw new InvalidOperationException("Validation must not execute the task.");
    }

    private static async Task<ApplicationConfigException?> Validate(
        Action<IServiceCollection> register,
        IProcessReader processReader
    )
    {
        ServiceCollection services = CreateServices(processReader);
        register(services);
        await using ServiceProvider provider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );
        var service = new ProcessTaskConfigurationValidationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ProcessTaskConfigurationValidationService>.Instance
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
