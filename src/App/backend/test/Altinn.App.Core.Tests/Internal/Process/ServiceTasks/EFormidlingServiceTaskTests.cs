using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
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
    private static readonly Guid _instanceGuid = Guid.Parse("00000000-0000-0000-0000-000000000001");

    private readonly Mock<ILogger<EFormidlingServiceTask>> _loggerMock = new();
    private readonly Mock<IEFormidlingService> _eFormidlingServiceMock = new();
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock = new();
    private readonly Mock<IInstanceClient> _instanceClientMock = new();
    private readonly EFormidlingServiceTask _serviceTask;

    public EFormidlingServiceTaskTests()
    {
        _hostEnvironmentMock.Setup(x => x.EnvironmentName).Returns("Production");
        _serviceTask = new EFormidlingServiceTask(
            _loggerMock.Object,
            _processReaderMock.Object,
            _hostEnvironmentMock.Object,
            _instanceClientMock.Object,
            _eFormidlingServiceMock.Object
        );
    }

    private static ServiceTaskContext CreateContext(
        IInstanceDataMutator instanceDataMutator,
        ServiceTaskWait? wait = null
    ) =>
        new()
        {
            InstanceDataMutator = instanceDataMutator,
            WorkflowId = _workflowId,
            StepId = Guid.NewGuid(),
            Wait = wait ?? new ServiceTaskWait(),
        };

    /// <summary>
    /// Drives the send stage the way the engine does — by name, through the composed pipeline — so
    /// the stage's wire identity is exercised rather than a direct method call.
    /// </summary>
    private static Task<ServiceTaskStageResult> SendShipment(EFormidlingServiceTask task, ServiceTaskContext context)
    {
        var stage =
            task.ResolvePipeline().FindStage("SendShipment") as ServiceTaskStage.Plain
            ?? throw new InvalidOperationException("The send stage is missing from the pipeline.");
        return stage.Work(context);
    }

    private static Task<ServiceTaskResult> AwaitDelivery(EFormidlingServiceTask task, ServiceTaskContext context) =>
        Assert.IsType<PipelineConclusion.FinalStep>(task.ResolvePipeline().Conclusion).Work(context);

    private void SetupShipmentStatus(
        EFormidlingDeliveryState state,
        string? status = null,
        string? description = null
    ) =>
        _eFormidlingServiceMock
            .Setup(x =>
                x.GetEFormidlingShipmentStatus(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>()
                )
            )
            .ReturnsAsync(
                new EFormidlingShipmentStatus
                {
                    State = state,
                    Status = status,
                    Description = description,
                }
            );

    private static void SetShipmentOwner(Instance instance, string shipmentOwnerWorkflowId)
    {
        instance.DataValues = new Dictionary<string, string>
        {
            [EformidlingConstants.ShipmentOwnerWorkflowIdDataValueKey] = shipmentOwnerWorkflowId,
        };
    }

    [Fact]
    public void Pipeline_Should_SendThenWaitForDelivery()
    {
        // The stage name is a compatibility surface for in-flight workflows, so it is pinned here.
        ServiceTaskPipeline pipeline = _serviceTask.ResolvePipeline();

        Assert.Equal(new[] { "SendShipment" }, pipeline.Items.OfType<ServiceTaskStage>().Select(stage => stage.Name));
        // The wait budget belongs to the conclusion, not the task — the send stage must not be
        // handed a budget it can never use. Deliberately longer than the two-hour lifetime the
        // shipment carries in its own SBD, so the integrasjonspunkt's expiry verdict reaches the
        // instance before our wait gives up.
        Assert.Equal(TimeSpan.FromHours(2.5), pipeline.Conclusion.StepOptions?.WaitBudget);
        Assert.Null(((IPipelineServiceTask)_serviceTask).StepOptions);
        Assert.Null(Assert.Single(pipeline.Items).StepOptions);
    }

    // ===== SEND STAGE =====

    [Fact]
    public async Task SendShipment_Should_BeEnabled_When_NoBpmnConfig()
    {
        Instance instance = GetInstance();

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            SendShipment(_serviceTask, parameters)
        );
        Assert.Contains("No eFormidling configuration found in BPMN for task", exception.Message);
    }

    [Fact]
    public async Task SendShipment_Should_ThrowException_When_EFormidlingServiceIsNull()
    {
        // Arrange
        Instance instance = GetInstance();

        var serviceTask = new EFormidlingServiceTask(
            _loggerMock.Object,
            _processReaderMock.Object,
            _hostEnvironmentMock.Object,
            _instanceClientMock.Object,
            null
        );

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        // Act & Assert
        await Assert.ThrowsAsync<ProcessException>(() => SendShipment(serviceTask, parameters));
    }

    [Fact]
    public async Task SendShipment_Should_SkipExecution_When_BpmnConfigDisabled_AndServiceIsNull()
    {
        // Arrange
        Instance instance = GetInstance();

        var serviceTask = new EFormidlingServiceTask(
            _loggerMock.Object,
            _processReaderMock.Object,
            _hostEnvironmentMock.Object,
            _instanceClientMock.Object,
            null
        );

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig(disabled: true) };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        // Act
        var result = await SendShipment(serviceTask, parameters);

        // Assert
        Assert.IsType<CompletedServiceTaskStageResult>(result);
    }

    [Fact]
    public async Task SendShipment_Should_Call_SendEFormidlingShipment_When_EFormidlingEnabled()
    {
        // Arrange
        Instance instance = GetInstance();

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        // Act
        await SendShipment(_serviceTask, parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x =>
                x.SendEFormidlingShipment(
                    instanceMutatorMock.Object,
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                ),
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
    public async Task SendShipment_Should_UseEnvironmentSpecificBpmnConfig_When_Configured()
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

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        // Act
        await SendShipment(_serviceTask, parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x =>
                x.SendEFormidlingShipment(
                    instanceMutatorMock.Object,
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task SendShipment_Should_SkipExecution_When_BpmnConfigDisabled()
    {
        // Arrange
        Instance instance = GetInstance();

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig(disabled: true) };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        // Act
        await SendShipment(_serviceTask, parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x =>
                x.SendEFormidlingShipment(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>()
                ),
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
    public async Task SendShipment_Should_UseGlobalBpmnConfig_When_NoEnvironmentSpecific()
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

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        // Act
        await SendShipment(_serviceTask, parameters);

        // Assert
        _eFormidlingServiceMock.Verify(
            x =>
                x.SendEFormidlingShipment(
                    instanceMutatorMock.Object,
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    // ===== IDEMPOTENCY / SHIPMENT OWNERSHIP TESTS =====

    [Fact]
    public async Task SendShipment_Should_FailPermanently_When_ShipmentOwnedByAnotherWorkflow()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        SetShipmentOwner(instance, Guid.NewGuid().ToString());
        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var result = await SendShipment(_serviceTask, parameters);

        var failed = Assert.IsType<FailedServiceTaskStageResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("earlier pass", failed.ErrorMessage);
        _eFormidlingServiceMock.Verify(
            x =>
                x.SendEFormidlingShipment(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task SendShipment_Should_Send_When_ShipmentOwnedBySameWorkflow()
    {
        // A retry of the transition that owns the shipment must go through to the send, which
        // self-heals on the duplicate message id.
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        SetShipmentOwner(instance, _workflowId.ToString());
        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var result = await SendShipment(_serviceTask, parameters);

        Assert.IsType<CompletedServiceTaskStageResult>(result);
        _eFormidlingServiceMock.Verify(
            x =>
                x.SendEFormidlingShipment(
                    instanceMutatorMock.Object,
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task SendShipment_Should_RecordShipmentOwner_AfterSend()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var result = await SendShipment(_serviceTask, parameters);

        Assert.IsType<CompletedServiceTaskStageResult>(result);
        _instanceClientMock.Verify(
            x =>
                x.UpdateDataValue(
                    instance,
                    EformidlingConstants.ShipmentOwnerWorkflowIdDataValueKey,
                    _workflowId.ToString(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task SendShipment_Should_NotRecordShipmentOwner_When_SendFails()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        _eFormidlingServiceMock
            .Setup(x =>
                x.SendEFormidlingShipment(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>()
                )
            )
            .ThrowsAsync(new Exception("send failed"));

        await Assert.ThrowsAsync<Exception>(() => SendShipment(_serviceTask, parameters));

        _instanceClientMock.Verify(
            x =>
                x.UpdateDataValue(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task SendShipment_Should_FailPermanently_When_DeliveryExceptionThrown()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        ServiceTaskContext parameters = CreateContext(instanceMutatorMock.Object);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        _eFormidlingServiceMock
            .Setup(x =>
                x.SendEFormidlingShipment(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>()
                )
            )
            .ThrowsAsync(new EformidlingDeliveryException("message id cannot be reused"));

        var result = await SendShipment(_serviceTask, parameters);

        var failed = Assert.IsType<FailedServiceTaskStageResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
    }

    // ===== DELIVERY WAIT =====

    [Fact]
    public async Task AwaitDelivery_Should_Succeed_Without_Polling_When_BpmnConfigDisabled()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig(disabled: true) };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        var result = await AwaitDelivery(_serviceTask, CreateContext(instanceMutatorMock.Object));

        // Nothing was sent, so there is nothing to wait for.
        Assert.IsType<ServiceTaskSuccessResult>(result);
        _eFormidlingServiceMock.Verify(
            x =>
                x.GetEFormidlingShipmentStatus(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task AwaitDelivery_Should_Defer_While_ShipmentIsPending()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);
        SetupShipmentStatus(EFormidlingDeliveryState.Pending, "sendt");

        var result = await AwaitDelivery(_serviceTask, CreateContext(instanceMutatorMock.Object));

        var deferred = Assert.IsType<ServiceTaskDeferredResult>(result);
        Assert.Equal(TimeSpan.FromSeconds(15), deferred.Delay);
        Assert.Contains("sendt", deferred.Reason);

        // A deferring attempt records nothing - the wait is not what makes the shipment durable.
        _instanceClientMock.Verify(
            x =>
                x.UpdateDataValue(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _instanceClientMock.Verify(
            x =>
                x.AddCompleteConfirmation(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Theory]
    [InlineData(0, 15)]
    [InlineData(1, 15)]
    [InlineData(2, 60)]
    [InlineData(5, 60)]
    [InlineData(6, 300)]
    [InlineData(11, 300)]
    [InlineData(12, 900)]
    [InlineData(500, 900)]
    public async Task AwaitDelivery_Should_BackOff_As_TheWaitGoesOn(int deferCount, int expectedDelaySeconds)
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);
        SetupShipmentStatus(EFormidlingDeliveryState.Pending);

        var context = CreateContext(
            instanceMutatorMock.Object,
            new ServiceTaskWait { DeferCount = deferCount, Deadline = DateTimeOffset.UtcNow.AddHours(1) }
        );
        var result = await AwaitDelivery(_serviceTask, context);

        var deferred = Assert.IsType<ServiceTaskDeferredResult>(result);
        Assert.Equal(TimeSpan.FromSeconds(expectedDelaySeconds), deferred.Delay);
    }

    [Theory]
    [InlineData("levert")]
    [InlineData("lest")]
    public async Task AwaitDelivery_Should_Conclude_When_ShipmentIsDelivered(string reportedStatus)
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);
        SetupShipmentStatus(EFormidlingDeliveryState.Delivered, reportedStatus);

        var result = await AwaitDelivery(_serviceTask, CreateContext(instanceMutatorMock.Object));

        // Auto-advance: the process leaves the task once delivery is confirmed, not when the
        // shipment was handed over.
        var success = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        _instanceClientMock.Verify(
            x =>
                x.UpdateDataValue(
                    instance,
                    EformidlingConstants.ShipmentStatusDataValueKey,
                    reportedStatus,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _instanceClientMock.Verify(
            x =>
                x.AddCompleteConfirmation(
                    1337,
                    _instanceGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task AwaitDelivery_Should_FailPermanently_When_ShipmentFailed()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);
        SetupShipmentStatus(EFormidlingDeliveryState.Failed, "feil", "Mottaker er ikke registrert");

        var result = await AwaitDelivery(_serviceTask, CreateContext(instanceMutatorMock.Object));

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("feil", failed.ErrorMessage);
        Assert.Contains("Mottaker er ikke registrert", failed.ErrorMessage);
        _instanceClientMock.Verify(
            x =>
                x.UpdateDataValue(
                    instance,
                    EformidlingConstants.ShipmentStatusDataValueKey,
                    "feil",
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        // A failed shipment is not something the service owner has harvested.
        _instanceClientMock.Verify(
            x =>
                x.AddCompleteConfirmation(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task AwaitDelivery_Should_FailPermanently_OnTheFinalCheck_NamingWhatNeverArrived()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);
        SetupShipmentStatus(EFormidlingDeliveryState.Pending, "sendt");

        // The wait allowance is spent: one more deferral would expire it under the engine's generic
        // classification, so the task ends it on its own terms instead.
        var context = CreateContext(
            instanceMutatorMock.Object,
            new ServiceTaskWait { DeferCount = 40, Deadline = DateTimeOffset.UtcNow.AddSeconds(-1) }
        );
        var result = await AwaitDelivery(_serviceTask, context);

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("did not confirm delivery", failed.ErrorMessage);
        Assert.Contains("sendt", failed.ErrorMessage);
        _instanceClientMock.Verify(
            x =>
                x.UpdateDataValue(
                    instance,
                    EformidlingConstants.ShipmentStatusDataValueKey,
                    "sendt",
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task AwaitDelivery_Should_ThrowException_When_EFormidlingServiceIsNull()
    {
        Instance instance = GetInstance();
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var serviceTask = new EFormidlingServiceTask(
            _loggerMock.Object,
            _processReaderMock.Object,
            _hostEnvironmentMock.Object,
            _instanceClientMock.Object,
            null
        );

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        await Assert.ThrowsAsync<ProcessException>(() =>
            AwaitDelivery(serviceTask, CreateContext(instanceMutatorMock.Object))
        );
    }

    private static Instance GetInstance()
    {
        return new Instance
        {
            Id = $"1337/{_instanceGuid}",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
        };
    }
}
