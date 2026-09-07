using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
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
    public async Task StartAsync_ProcessDefinitionUnreadable_StandsDown()
    {
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Throws(new InvalidOperationException("no bpmn"));
        ProcessTaskConfigurationValidationService service = CreateService(
            processReader.Object,
            processTasks: [new DataProcessTask()],
            commands: []
        );

        await service.StartAsync(CancellationToken.None);
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
        services.AddScoped<IProcessTaskCommand>(sp =>
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
                DelegateSigneeRightsCommand.Key,
                NotifySigneesCommand.Key,
                RevokeSigneeRightsCommand.Key,
                AbortRuntimeDelegatedSigningCommand.Key,
            }
        )
        {
            services.AddSingleton<IProcessTaskCommand>(new FakeCommand(command));
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
        IProcessTaskCommand[] commands
    )
    {
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Returns(bpmnTasks);
        return CreateService(processReader.Object, processTasks, commands);
    }

    private static ProcessTaskConfigurationValidationService CreateService(
        IProcessReader processReader,
        IProcessTask[] processTasks,
        IProcessTaskCommand[] commands
    )
    {
        ServiceCollection services = CreateServices(processReader);
        foreach (IProcessTask processTask in processTasks)
        {
            services.AddSingleton(processTask);
        }
        foreach (IProcessTaskCommand command in commands)
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

        public IReadOnlyList<ProcessTaskCommandRef> GetStartCommands(string taskId) => [new("DoThing")];
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

        public IReadOnlyList<ProcessTaskCommandRef> GetStartCommands(string taskId) =>
            (startCommands ?? []).Select(key => new ProcessTaskCommandRef(key)).ToList();

        public IReadOnlyList<ProcessTaskCommandRef> GetEndCommands(string taskId) =>
            (endCommands ?? []).Select(key => new ProcessTaskCommandRef(key)).ToList();
    }

    private sealed class FakeCommand(string key) : IProcessTaskCommand
    {
        public string Key => key;

        public Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context) =>
            Task.FromResult(ProcessTaskCommandResult.Completed());
    }
}
