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
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" \t")]
    public async Task MissingOrBlankTaskType_DoesNotFallBackToNullType(string? taskType)
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
    public async Task ValidationUsesLastExactMatch_AndServiceTaskTakesPrecedence()
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
            ProcessTestUtils.SetupProcessReader("plain-task-custom-type.bpmn")
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
    public async Task FindingsAndThrownErrors_IncludeTaskIds_AndDoNotSkipOtherTasks()
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
    public async Task UnreadableConfigurationOrRegistrations_FailStartup(string failingDependency)
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
                        .Setup(m => m.GetApplicationMetadata())
                        .ThrowsAsync(new InvalidOperationException("unreadable metadata"));
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

    // Only <altinn:taskType> is read, as at runtime: a <bpmn:serviceTask> and a <bpmn:task> are checked alike.
    [Theory]
    [InlineData("pdf-service-task.bpmn", "Task_Pdf", "pdf")]
    [InlineData("plain-task-custom-type.bpmn", "Task_Custom", "archive")]
    public async Task ProcessTaskNoImplementationIsRegisteredFor_FailsStartup(
        string bpmn,
        string taskId,
        string taskType
    )
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new SimpleTask("simple")),
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        Assert.NotNull(exception);
        Assert.Contains(taskId, exception.Message, StringComparison.Ordinal);
        Assert.Contains($"<altinn:taskType>{taskType}</altinn:taskType>", exception.Message, StringComparison.Ordinal);
        // The registered types are named once, as a trailing entry.
        Assert.Contains("'simple'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'data'", exception.Message, StringComparison.Ordinal);
        Assert.Single(
            exception.Message.Split(Environment.NewLine),
            line => line.Contains("Registered task types:", StringComparison.Ordinal)
        );
    }

    [Theory]
    [InlineData("pdf-service-task.bpmn", "pdf")]
    [InlineData("plain-task-custom-type.bpmn", "archive")]
    public async Task ProcessTaskWithARegisteredImplementation_PassesValidation(string bpmn, string taskType)
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new SimpleTask(taskType)),
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task ProcessTaskWithABlankTaskType_FailsStartup_WhateverElementCarriesIt()
    {
        // The shape Studio's generic service task palette entry produces, and the same omission on a <bpmn:task>.
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
        // The registered types are what the blank gets filled in with.
        Assert.Contains("Registered task types:", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'pdf'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ProcessTaskTypeDifferingOnlyInCase_FailsStartup()
    {
        // Matched exactly, as dispatch does: 'PDF' never answers for 'pdf'.
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask>(new SimpleTask("PDF")),
            ProcessTestUtils.SetupProcessReader("pdf-service-task.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("Task_Pdf", exception.Message, StringComparison.Ordinal);
        Assert.Contains("matched exactly, including case", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ProcessWithOnlyBuiltInTaskTypes_PassesValidation_WithNoServiceTasksRegistered()
    {
        var exception = await Validate(_ => { }, ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"));

        Assert.Null(exception);
    }

    [Fact]
    public async Task BuiltInTaskTypeTheAppNeverEnabled_NamesItsBuilderCall_NotAnAddTransient()
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
        metadata.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("ttd/app"));
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
