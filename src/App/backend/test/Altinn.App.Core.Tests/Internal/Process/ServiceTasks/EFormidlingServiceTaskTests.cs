using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ServiceTasks;

public class EFormidlingServiceTaskTests
{
    private readonly Mock<ILogger<EFormidlingServiceTask>> _loggerMock = new();
    private readonly Mock<IEFormidlingService> _eFormidlingServiceMock = new();
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock = new();
    private readonly EFormidlingServiceTask _serviceTask;

    public EFormidlingServiceTaskTests()
    {
        _hostEnvironmentMock.Setup(x => x.EnvironmentName).Returns("Production");
        _serviceTask = new EFormidlingServiceTask(
            _loggerMock.Object,
            _processReaderMock.Object,
            _hostEnvironmentMock.Object,
            _eFormidlingServiceMock.Object
        );
    }

    [Fact]
    public async Task Execute_Should_BeEnabled_When_NoBpmnConfig()
    {
        Instance instance = GetInstance();

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext { InstanceDataMutator = instanceMutatorMock.Object };

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() => _serviceTask.Execute(parameters));
        Assert.Contains("No eFormidling configuration found in BPMN for task", exception.Message);
    }

    [Fact]
    public async Task Execute_Should_ThrowException_When_EFormidlingServiceIsNull()
    {
        // Arrange
        Instance instance = GetInstance();

        var serviceTask = new EFormidlingServiceTask(
            _loggerMock.Object,
            _processReaderMock.Object,
            _hostEnvironmentMock.Object,
            null
        );

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext { InstanceDataMutator = instanceMutatorMock.Object };

        // Act & Assert
        await Assert.ThrowsAsync<ProcessException>(() => serviceTask.Execute(parameters));
    }

    [Fact]
    public async Task Execute_Should_Call_SendEFormidlingShipment_When_EFormidlingEnabled()
    {
        // Arrange
        Instance instance = GetInstance();

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext { InstanceDataMutator = instanceMutatorMock.Object };

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x => x.SendEFormidlingShipment(instance, It.IsAny<ValidAltinnEFormidlingConfiguration>()),
            Times.Once
        );
    }

    private static AltinnEFormidlingConfiguration GetConfig(bool disabled = false)
    {
        return new AltinnEFormidlingConfiguration
        {
            Disabled = [new AltinnEnvironmentConfig { Value = disabled.ToString() }],
            Process = [new AltinnEnvironmentConfig { Value = "process" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
            DpfShipmentType = [new AltinnEnvironmentConfig { Value = "dpfShipmentType" }],
        };
    }

    [Fact]
    public async Task Execute_Should_UseEnvironmentSpecificBpmnConfig_When_Configured()
    {
        // Arrange
        Instance instance = GetInstance();

        AltinnEFormidlingConfiguration eFormidlingConfig = GetConfig();
        eFormidlingConfig.Disabled =
        [
            new AltinnEnvironmentConfig { Environment = "prod", Value = "false" },
            new AltinnEnvironmentConfig { Environment = "staging", Value = "true" },
        ];

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = eFormidlingConfig };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext { InstanceDataMutator = instanceMutatorMock.Object };

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x => x.SendEFormidlingShipment(instance, It.IsAny<ValidAltinnEFormidlingConfiguration>()),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_Should_SkipExecution_When_BpmnConfigDisabled()
    {
        // Arrange
        Instance instance = GetInstance();

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig(disabled: true) };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext { InstanceDataMutator = instanceMutatorMock.Object };

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _eFormidlingServiceMock.Verify(x => x.SendEFormidlingShipment(It.IsAny<Instance>()), Times.Never);
        _loggerMock.Verify(
            x =>
                x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("EFormidling is disabled for task taskId")),
                    It.IsAny<Exception>(),
                    It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_Should_UseGlobalBpmnConfig_When_NoEnvironmentSpecific()
    {
        // Arrange
        Instance instance = GetInstance();

        AltinnEFormidlingConfiguration eFormidlingConfig = GetConfig();
        eFormidlingConfig.Disabled =
        [
            new AltinnEnvironmentConfig { Value = "false" }, // Global config (no env specified)
        ];

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = eFormidlingConfig };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext { InstanceDataMutator = instanceMutatorMock.Object };

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x => x.SendEFormidlingShipment(instance, It.IsAny<ValidAltinnEFormidlingConfiguration>()),
            Times.Once
        );
    }

    private static Instance GetInstance()
    {
        return new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
        };
    }
}
