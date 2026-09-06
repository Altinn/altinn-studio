using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
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
        var appMetadata = new Mock<IAppMetadata>();
        appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("ttd/app"));
        var hostEnvironment = new Mock<IHostEnvironment>();
        hostEnvironment.SetupGet(x => x.EnvironmentName).Returns("Production");

        var services = new ServiceCollection();
        services.AddSingleton(processReader);
        services.AddSingleton(appMetadata.Object);
        services.AddSingleton(hostEnvironment.Object);
        services.AddSingleton<AppImplementationFactory>();
        services.AddTransient<ProcessTaskResolver>();
        foreach (IProcessTask processTask in processTasks)
        {
            services.AddSingleton(processTask);
        }
        foreach (IProcessTaskCommand command in commands)
        {
            services.AddSingleton(command);
        }

        ServiceProvider serviceProvider = services.BuildServiceProvider();
        return new ProcessTaskConfigurationValidationService(
            serviceProvider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ProcessTaskConfigurationValidationService>.Instance
        );
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
