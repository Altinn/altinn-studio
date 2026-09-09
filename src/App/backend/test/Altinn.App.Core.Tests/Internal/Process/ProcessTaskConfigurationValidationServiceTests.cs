using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessTaskConfigurationValidationServiceTests
{
    [Fact]
    public async Task StartAsync_AllTasksValidAndCommandsRegistered_DoesNotThrow()
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "data"), BpmnTask("Task_2", "custom")],
            processTasks: [new DataProcessTask(), new FakeTask("custom", startCommands: ["DoThing"])],
            commands: [new FakeCommand("DoThing")]
        );

        await service.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task StartAsync_UnknownTaskType_Throws()
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "nobody-implements-this")],
            processTasks: [new DataProcessTask()],
            commands: []
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );

        Assert.Contains("Task 'Task_1'", exception.Message);
    }

    [Fact]
    public async Task StartAsync_DeclaredCommandNotRegistered_Throws()
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "custom")],
            processTasks: [new FakeTask("custom", endCommands: ["Missing"])],
            commands: [new FakeCommand("Other")]
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );

        Assert.Contains("declares the end command 'Missing'", exception.Message);
    }

    [Fact]
    public async Task StartAsync_TaskReportsFindings_ThrowsListingThem()
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "custom")],
            processTasks: [new FakeTask("custom", findings: ["first problem", "second problem"])],
            commands: []
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );

        Assert.Contains("first problem", exception.Message);
        Assert.Contains("second problem", exception.Message);
    }

    [Fact]
    public async Task StartAsync_DuplicateCommandKeys_Throws()
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "data")],
            processTasks: [new DataProcessTask()],
            commands: [new FakeCommand("Twice"), new FakeCommand("Twice")]
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );

        Assert.Contains("same key: 'Twice'", exception.Message);
    }

    [Fact]
    public async Task StartAsync_ProcessDefinitionUnreadable_FailsStartup()
    {
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Throws(new InvalidOperationException("no bpmn"));
        ProcessTaskConfigurationValidationService service = CreateService(
            processReader.Object,
            processTasks: [new DataProcessTask()],
            commands: []
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );
        Assert.Contains("no bpmn", exception.Message);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task StartAsync_ScopedTaskAndCommand_AreValidatedAndDisposed(bool commandIsRegistered)
    {
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Returns([BpmnTask("Task_1", "custom")]);
        ServiceCollection services = CreateServices(processReader.Object);
        List<ScopeProbe> probes = [];
        services.AddScoped(_ =>
        {
            var probe = new ScopeProbe();
            probes.Add(probe);
            return probe;
        });
        services.AddScoped<IProcessTask>(sp => new ScopedTask(sp.GetRequiredService<ScopeProbe>()));
        services.AddScoped<IWorkflowEngineCommand>(sp =>
        {
            sp.GetRequiredService<ScopeProbe>().CommandResolved = true;
            return new FakeCommand(commandIsRegistered ? "DoThing" : "Other");
        });
        using ServiceProvider serviceProvider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );
        ProcessTaskConfigurationValidationService service = CreateService(serviceProvider);

        if (commandIsRegistered)
        {
            await service.StartAsync(CancellationToken.None);
        }
        else
        {
            ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
                service.StartAsync(CancellationToken.None)
            );
            Assert.Contains("declares the start command 'DoThing'", exception.Message);
        }

        ScopeProbe resolvedProbe = Assert.Single(probes);
        Assert.True(resolvedProbe.CommandResolved);
        Assert.True(resolvedProbe.TaskValidated);
        Assert.True(resolvedProbe.Disposed);
    }

    [Theory]
    [InlineData("SigneeProviderId", true)]
    [InlineData("OtherProvider", false)]
    public async Task StartAsync_ScopedSigneeProvider_IsValidatedAndDisposed(string providerId, bool valid)
    {
        var configuration = new AltinnSignatureConfiguration
        {
            SignatureDataType = "signatures",
            SigneeStatesDataTypeId = "signee-states",
            SigneeProviderId = "SigneeProviderId",
            CorrespondenceResources = [new AltinnEnvironmentConfig { Value = "app_ttd_correspondence" }],
        };
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Returns([BpmnTask("Task_1", "signing")]);
        processReader
            .Setup(x => x.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = configuration });
        ServiceCollection services = CreateServices(processReader.Object);
        services.AddLogging();
        services.AddTransient<IProcessTask, SigningProcessTask>();
        foreach (
            string command in new[]
            {
                ResolveSigneesCommand.Key,
                ScheduleSigneeInitialization.Key,
                DelegateSigneeRightsCommand.Key,
                NotifySigneeCommand.Key,
                RevokeSigneeRightsCommand.Key,
                AbortRuntimeDelegatedSigningCommand.Key,
            }
        )
        {
            services.AddSingleton<IWorkflowEngineCommand>(new FakeCommand(command));
        }
        List<ScopedSigneeProvider> providers = [];
        services.AddScoped<ISigneeProvider>(_ =>
        {
            var provider = new ScopedSigneeProvider { Id = providerId };
            providers.Add(provider);
            return provider;
        });
        using ServiceProvider serviceProvider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );
        ProcessTaskConfigurationValidationService service = CreateService(serviceProvider);

        if (valid)
        {
            await service.StartAsync(CancellationToken.None);
        }
        else
        {
            ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
                service.StartAsync(CancellationToken.None)
            );
            Assert.Contains("exactly one ISigneeProvider with id 'SigneeProviderId', found 0", exception.Message);
        }

        Assert.True(Assert.Single(providers).Disposed);
    }

    [Fact]
    public async Task StartAsync_CanceledToken_DoesNotResolveCommandsAndPropagatesCancellation()
    {
        var processReader = new Mock<IProcessReader>();
        ServiceCollection services = CreateServices(processReader.Object);
        services.AddScoped<IWorkflowEngineCommand>(_ => throw new InvalidOperationException("Must not resolve"));
        using ServiceProvider provider = services.BuildServiceProvider();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            CreateService(provider).StartAsync(cancellation.Token)
        );
    }

    [Theory]
    [InlineData("MutateProcessState")]
    [InlineData("SaveProcessStateToStorage")]
    [InlineData("ExecuteServiceTask")]
    [InlineData("MintMailbox")]
    [InlineData("OnTaskStartingHook")]
    public async Task StartAsync_TaskDeclaresFrameworkCoordinationCommand_FailsStartup(string key)
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "custom")],
            [new FakeTask("custom", startCommands: [key])],
            []
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );

        Assert.Contains($"declares the start command '{key}'", exception.Message);
        Assert.Contains("framework coordination", exception.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task StartAsync_TaskDeclaresEmptyCommand_FailsStartup(string key)
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "custom")],
            [new FakeTask("custom", startCommands: [key])],
            []
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );

        Assert.Contains("empty start command reference", exception.Message);
    }

    [Fact]
    public async Task StartAsync_TaskDeclaresKeyContainingAPathSeparator_FailsBeforeEnqueue()
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "custom")],
            [new FakeTask("custom", startCommands: ["Customer/Submit"])],
            []
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );

        Assert.Contains("invalid key 'Customer/Submit'", exception.Message);
    }

    [Fact]
    public async Task StartAsync_CommandDependencyNotRegistered_FailsInsteadOfSkippingValidation()
    {
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Returns([BpmnTask("Task_1", "data")]);
        ServiceCollection services = CreateServices(processReader.Object);
        services.AddSingleton<IProcessTask, DataProcessTask>();
        services.AddScoped<IWorkflowEngineCommand>(sp =>
        {
            _ = sp.GetRequiredService<ScopeProbe>();
            return new FakeCommand("MissingDependency");
        });
        using ServiceProvider serviceProvider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            CreateService(serviceProvider).StartAsync(CancellationToken.None)
        );

        Assert.Contains(nameof(ScopeProbe), exception.Message);
        Assert.Contains("No service for type", exception.Message);
    }

    [Fact]
    public async Task StartAsync_InvalidOptionsOnUndeclaredCommand_FailsStartup()
    {
        ProcessTaskConfigurationValidationService service = CreateService(
            [BpmnTask("Task_1", "data")],
            [new DataProcessTask()],
            [new FakeCommand("Unused", new ProcessStepOptions { MaxExecutionTime = TimeSpan.Zero })]
        );

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.StartAsync(CancellationToken.None)
        );

        Assert.Contains("default step options", exception.Message);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task StartAsync_ServiceTaskWithLifecycleCommands_IsFoundThroughItsServiceInterface(bool pipeline)
    {
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Returns([BpmnTask("Task_1", "custom")]);
        ServiceCollection services = CreateServices(processReader.Object);
        // An ordinary task of the same type must not hide a service-task implementation.
        services.AddSingleton<IProcessTask>(new FakeTask("custom", startCommands: ["WrongImplementation"]));
        services.AddSingleton<IWorkflowEngineCommand>(new FakeCommand("DoThing"));
        if (pipeline)
            services.AddScoped<IPipelineServiceTask, PipelineTask>();
        else
            services.AddScoped<IServiceTask, SimpleServiceTask>();
        using ServiceProvider serviceProvider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );

        await CreateService(serviceProvider).StartAsync(CancellationToken.None);
    }

    private static ProcessTask BpmnTask(string id, string taskType) =>
        new()
        {
            Id = id,
            ExtensionElements = new ExtensionElements
            {
                TaskExtension = new AltinnTaskExtension { TaskType = taskType },
            },
        };

    private static ProcessTaskConfigurationValidationService CreateService(
        List<ProcessTask> bpmnTasks,
        IProcessTask[] processTasks,
        IWorkflowEngineCommand[] commands
    )
    {
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Returns(bpmnTasks);
        return CreateService(processReader.Object, processTasks, commands);
    }

    private static ProcessTaskConfigurationValidationService CreateService(
        IProcessReader processReader,
        IProcessTask[] processTasks,
        IWorkflowEngineCommand[] commands
    )
    {
        ServiceCollection services = CreateServices(processReader);
        foreach (IProcessTask processTask in processTasks)
        {
            services.AddSingleton(processTask);
        }
        foreach (IWorkflowEngineCommand command in commands)
        {
            services.AddSingleton(command);
        }

        ServiceProvider serviceProvider = services.BuildServiceProvider();
        return CreateService(serviceProvider);
    }

    private static ServiceCollection CreateServices(IProcessReader processReader)
    {
        var appMetadata = new Mock<IAppMetadata>();
        appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("ttd/app"));
        var hostEnvironment = new Mock<IHostEnvironment>();
        hostEnvironment.SetupGet(x => x.EnvironmentName).Returns("Production");

        var services = new ServiceCollection();
        services.AddSingleton(processReader);
        services.AddSingleton(appMetadata.Object);
        services.AddSingleton(hostEnvironment.Object);
        services.AddTransient<ProcessTaskResolver>();
        foreach (string key in WorkflowEngineCommandValidator.FrameworkCommandKeys)
        {
            services.AddSingleton<IWorkflowEngineCommand>(new FakeCommand(key));
        }
        return services;
    }

    private static ProcessTaskConfigurationValidationService CreateService(ServiceProvider serviceProvider) =>
        new(
            serviceProvider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ProcessTaskConfigurationValidationService>.Instance
        );

    private sealed class ScopeProbe : IDisposable
    {
        public bool CommandResolved { get; set; }
        public bool TaskValidated { get; set; }
        public bool Disposed { get; private set; }

        public void Dispose() => Disposed = true;
    }

    private sealed class ScopedTask(ScopeProbe probe) : IProcessTask
    {
        public string Type => "custom";

        public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context)
        {
            probe.TaskValidated = true;
            return [];
        }

        public IReadOnlyList<WorkflowCommandRef> GetStartCommands(string taskId) => [new("DoThing")];
    }

    private sealed class ScopedSigneeProvider : ISigneeProvider, IAsyncDisposable
    {
        public required string Id { get; init; }
        public bool Disposed { get; private set; }

        public Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters) =>
            throw new NotSupportedException("Startup validation must not request instance-specific signees.");

        public ValueTask DisposeAsync()
        {
            Disposed = true;
            return ValueTask.CompletedTask;
        }
    }

    private sealed class FakeTask(
        string type,
        string[]? startCommands = null,
        string[]? endCommands = null,
        string[]? findings = null
    ) : IProcessTask
    {
        public string Type => type;

        public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context) => findings ?? [];

        public IReadOnlyList<WorkflowCommandRef> GetStartCommands(string taskId) =>
            (startCommands ?? []).Select(key => new WorkflowCommandRef(key)).ToList();

        public IReadOnlyList<WorkflowCommandRef> GetEndCommands(string taskId) =>
            (endCommands ?? []).Select(key => new WorkflowCommandRef(key)).ToList();
    }

    private sealed class SimpleServiceTask : IServiceTask
    {
        public string Type => "custom";

        public IReadOnlyList<WorkflowCommandRef> GetStartCommands(string taskId) => [new("DoThing")];

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            throw new NotSupportedException("Startup must not execute service tasks.");
    }

    private sealed class PipelineTask : IPipelineServiceTask
    {
        public string Type => "custom";

        public IReadOnlyList<WorkflowCommandRef> GetEndCommands(string taskId) => [new("DoThing")];

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }

    private sealed class FakeCommand(string key, ProcessStepOptions? options = null) : IWorkflowEngineCommand
    {
        public string GetKey() => key;

        public ProcessStepOptions? DefaultStepOptions => options;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context) =>
            Task.FromResult(ProcessEngineCommandResult.Completed());
    }
}
