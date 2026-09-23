using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;
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
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    public async Task SigningProvider_MustResolveExactlyOnce_InTheStartupScope(int count)
    {
        var reader = new Mock<IProcessReader>();
        reader
            .Setup(r => r.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "Task_Signing",
                    ExtensionElements = new ExtensionElements
                    {
                        TaskExtension = new AltinnTaskExtension { TaskType = "signing" },
                    },
                },
            ]);
        reader
            .Setup(r => r.GetAltinnTaskExtension("Task_Signing"))
            .Returns(
                new AltinnTaskExtension
                {
                    SignatureConfiguration = new AltinnSignatureConfiguration
                    {
                        SignatureDataType = "signatures",
                        SigneeProviderId = "signees",
                        SigneeStatesDataTypeId = "signee-states",
                        CorrespondenceResources = [new AltinnEnvironmentConfig { Value = "correspondence-resource" }],
                    },
                }
            );
        var providers = new List<ScopedSigneeProvider>();

        var exception = await Validate(
            services =>
            {
                services.AddLogging();
                services.AddSingleton(Mock.Of<ISigningService>(MockBehavior.Strict));
                services.AddSingleton(Mock.Of<IPdfService>(MockBehavior.Strict));
                services.AddSingleton(Mock.Of<ISigneeContextsManager>(MockBehavior.Strict));
                services.AddTransient<IProcessTask, SigningProcessTask>();
                for (int i = 0; i < count; i++)
                    services.AddScoped<ISigneeProvider>(_ =>
                    {
                        var provider = new ScopedSigneeProvider();
                        providers.Add(provider);
                        return provider;
                    });
            },
            reader.Object
        );

        if (count == 1)
            Assert.Null(exception);
        else
        {
            Assert.NotNull(exception);
            Assert.Contains(
                $"Task 'Task_Signing': Expected exactly one ISigneeProvider with id 'signees', found {count}",
                exception.Message
            );
        }
        Assert.Equal(count, providers.Count);
        Assert.All(providers, provider => Assert.True(provider.Disposed));
    }

    private sealed class ScopedSigneeProvider : ISigneeProvider, IAsyncDisposable
    {
        public string Id { get; init; } = "signees";
        public bool Disposed { get; private set; }

        public Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters) =>
            throw new InvalidOperationException("Startup validation must not request instance-specific signees.");

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
    [InlineData("command")]
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
                if (failingDependency == "command")
                    services.AddTransient<IWorkflowEngineCommand>(_ =>
                        throw new InvalidOperationException("unreadable command")
                    );
            },
            reader.Object
        );

        Assert.NotNull(exception);
        Assert.Contains($"unreadable {failingDependency}", exception.Message);
        Assert.IsType<InvalidOperationException>(exception.InnerException);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ScopedDependencies_AreSharedAndDisposed_EvenWhenValidationFails(bool valid)
    {
        ScopeProbe? probe = null;
        var exception = await Validate(
            services =>
            {
                services.AddScoped(_ => probe = new ScopeProbe());
                services.AddScoped<IProcessTask>(sp => new TestTask(
                    "data",
                    _ =>
                    {
                        sp.GetRequiredService<ScopeProbe>().TaskValidated = true;
                        return valid ? [] : ["invalid configuration"];
                    }
                ));
                services.AddScoped<IWorkflowEngineCommand>(sp =>
                {
                    sp.GetRequiredService<ScopeProbe>().CommandResolved = true;
                    var command = new Mock<IWorkflowEngineCommand>();
                    command.Setup(c => c.GetKey()).Returns("ScopedCommand");
                    return command.Object;
                });
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn")
        );

        Assert.Equal(valid, exception is null);
        Assert.NotNull(probe);
        Assert.True(probe.TaskValidated);
        Assert.True(probe.CommandResolved);
        Assert.True(probe.Disposed);
    }

    [Fact]
    public async Task CancelledStartup_DoesNotResolveDependencies()
    {
        await using var provider = new ServiceCollection().BuildServiceProvider();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            CreateService(provider).StartAsync(new CancellationToken(true))
        );
    }

    [Fact]
    public async Task CancellationDuringTaskValidation_IsNotReportedAsInvalidConfiguration()
    {
        using var cancellation = new CancellationTokenSource();
        ServiceCollection services = CreateServices(ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"));
        services.AddSingleton<IProcessTask>(
            new TestTask(
                "data",
                _ =>
                {
                    cancellation.Cancel();
                    cancellation.Token.ThrowIfCancellationRequested();
                    return [];
                }
            )
        );
        await using var provider = services.BuildServiceProvider();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            CreateService(provider).StartAsync(cancellation.Token)
        );
    }

    private sealed class ScopeProbe : IAsyncDisposable
    {
        public bool TaskValidated { get; set; }
        public bool CommandResolved { get; set; }
        public bool Disposed { get; private set; }

        public ValueTask DisposeAsync()
        {
            Disposed = true;
            return ValueTask.CompletedTask;
        }
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

    private sealed class PdfLikeTask : IServiceTask
    {
        public string Type => "pdf";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    private sealed class ShoutyPdfLikeTask : IServiceTask
    {
        public string Type => "PDF";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    private sealed class ArchiveTask : IServiceTask
    {
        public string Type => "archive";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
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
            s => s.AddSingleton<IServiceTask, SimpleTask>(),
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
    [InlineData("pdf-service-task.bpmn", typeof(PdfLikeTask))]
    [InlineData("plain-task-custom-type.bpmn", typeof(ArchiveTask))]
    public async Task ProcessTaskWithARegisteredImplementation_PassesValidation(string bpmn, Type implementation)
    {
        var exception = await Validate(
            s => s.AddSingleton(typeof(IServiceTask), implementation),
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task ProcessTaskWithABlankTaskType_FailsStartup_WhateverElementCarriesIt()
    {
        // The shape Studio's generic service task palette entry produces, and the same omission on a <bpmn:task>.
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask, PdfLikeTask>(),
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
            s => s.AddSingleton<IServiceTask, ShoutyPdfLikeTask>(),
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

    private sealed class SimpleTask : IServiceTask
    {
        public string Type => "simple";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    private static Task<ServiceTaskResult> NoopFinally(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

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
        return (ApplicationConfigException?)
            await Record.ExceptionAsync(() => CreateService(provider).StartAsync(CancellationToken.None));
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
        foreach (string key in WorkflowEngineCommandValidator.FrameworkCommandKeys)
        {
            var command = new Mock<IWorkflowEngineCommand>();
            command.Setup(c => c.GetKey()).Returns(key);
            services.AddSingleton(command.Object);
        }
        return services;
    }

    private static ProcessTaskConfigurationValidationService CreateService(IServiceProvider provider) =>
        new(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ProcessTaskConfigurationValidationService>.Instance
        );

    private sealed class TestTask(string type, Func<ProcessTaskValidationContext, IEnumerable<string>>? validate = null)
        : IProcessTask
    {
        public string Type => type;

        public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context) =>
            validate?.Invoke(context) ?? [];
    }
}
