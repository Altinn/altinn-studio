using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
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
    private static readonly Guid _workflowId = Guid.Parse("00000000-0000-0000-0000-00000000abcd");

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

    private static Task SetShipmentOwner(ServiceTaskContext context, string shipmentOwnerWorkflowId) =>
        context.Checkpoints.Set(EformidlingConstants.ShipmentOwnerCheckpointKey, shipmentOwnerWorkflowId);

    private static Task<string?> GetShipmentOwner(ServiceTaskContext context) =>
        context.Checkpoints.Get(EformidlingConstants.ShipmentOwnerCheckpointKey);

    [Fact]
    public async Task Execute_Should_BeEnabled_When_NoBpmnConfig()
    {
        Instance instance = GetInstance();

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

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

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

        // Act & Assert
        await Assert.ThrowsAsync<ProcessException>(() => serviceTask.Execute(parameters));
    }

    [Fact]
    public async Task Execute_Should_SkipExecution_When_BpmnConfigDisabled_AndServiceIsNull()
    {
        // Arrange
        Instance instance = GetInstance();

        var serviceTask = new EFormidlingServiceTask(
            _loggerMock.Object,
            _processReaderMock.Object,
            _hostEnvironmentMock.Object,
            null
        );

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig(disabled: true) };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

        // Act
        var result = await serviceTask.Execute(parameters);

        // Assert
        Assert.IsType<ServiceTaskSuccessResult>(result);
    }

    [Fact]
    public async Task Execute_Should_Call_SendEFormidlingShipment_When_EFormidlingEnabled()
    {
        // Arrange
        Instance instance = GetInstance();

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

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

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

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

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x => x.SendEFormidlingShipment(It.IsAny<Instance>(), It.IsAny<ValidAltinnEFormidlingConfiguration>()),
            Times.Never
        );
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

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x => x.SendEFormidlingShipment(instance, It.IsAny<ValidAltinnEFormidlingConfiguration>()),
            Times.Once
        );
    }

    // ===== IDEMPOTENCY / SHIPMENT OWNERSHIP TESTS =====

    [Fact]
    public async Task Execute_Should_FailPermanently_When_ShipmentOwnedByAnotherWorkflow()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };
        await SetShipmentOwner(parameters, Guid.NewGuid().ToString());

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var result = await _serviceTask.Execute(parameters);

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("earlier pass", failed.ErrorMessage);
        _eFormidlingServiceMock.Verify(
            x => x.SendEFormidlingShipment(It.IsAny<Instance>(), It.IsAny<ValidAltinnEFormidlingConfiguration>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_Should_Send_When_ShipmentOwnedBySameWorkflow()
    {
        // A retry of the transition that owns the shipment must go through to the send, which
        // self-heals on the duplicate message id.
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };
        await SetShipmentOwner(parameters, _workflowId.ToString());

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var result = await _serviceTask.Execute(parameters);

        Assert.IsType<ServiceTaskSuccessResult>(result);
        _eFormidlingServiceMock.Verify(
            x => x.SendEFormidlingShipment(instance, It.IsAny<ValidAltinnEFormidlingConfiguration>()),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_Should_RecordShipmentOwner_AfterSend()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var result = await _serviceTask.Execute(parameters);

        Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.Equal(_workflowId.ToString(), await GetShipmentOwner(parameters));
    }

    [Fact]
    public async Task Execute_Should_NotRecordShipmentOwner_When_SendFails()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        _eFormidlingServiceMock
            .Setup(x =>
                x.SendEFormidlingShipment(It.IsAny<Instance>(), It.IsAny<ValidAltinnEFormidlingConfiguration>())
            )
            .ThrowsAsync(new Exception("send failed"));

        await Assert.ThrowsAsync<Exception>(() => _serviceTask.Execute(parameters));

        Assert.Null(await GetShipmentOwner(parameters));
    }

    [Fact]
    public async Task Execute_Should_FailPermanently_When_DeliveryExceptionThrown()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var parameters = new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
        };

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        _eFormidlingServiceMock
            .Setup(x =>
                x.SendEFormidlingShipment(It.IsAny<Instance>(), It.IsAny<ValidAltinnEFormidlingConfiguration>())
            )
            .ThrowsAsync(new EformidlingDeliveryException("message id cannot be reused"));

        var result = await _serviceTask.Execute(parameters);

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
    }

    private static Instance GetInstance()
    {
        return new Instance
        {
            Id = "1337/00000000-0000-0000-0000-000000000001",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
        };
    }
}
