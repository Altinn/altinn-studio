using System.Net;
using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
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
    /// Drives the send stage the way the engine does — by item index, through the composed pipeline — so
    /// dispatch by index is exercised rather than a direct method call.
    /// </summary>
    private static Task<ServiceTaskStageResult> SendShipment(EFormidlingServiceTask task, ServiceTaskContext context)
    {
        var stage =
            task.ResolvePipeline().Items[0] as ServiceTaskStage.Plain
            ?? throw new InvalidOperationException("The send stage is missing from the pipeline.");
        return stage.Work(context);
    }

    private static Task<ServiceTaskResult> AwaitDelivery(EFormidlingServiceTask task, ServiceTaskContext context) =>
        Assert.IsType<PipelineConclusion.FinalStep>(task.ResolvePipeline().Items[^1]).Work(context);

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
        // The pipeline's shape — one stage, then the conclusion — is what in-flight workflows dispatch
        // against, so it is pinned here.
        ServiceTaskPipeline pipeline = _serviceTask.ResolvePipeline();

        Assert.Equal(2, pipeline.Items.Count);
        Assert.IsType<ServiceTaskStage.Plain>(pipeline.Items[0]);
        PipelineConclusion conclusion = Assert.IsType<PipelineConclusion.FinalStep>(pipeline.Items[1]);
        // The wait budget belongs to the conclusion, not the task — the send stage must not be
        // handed a budget it can never use. Deliberately longer than the two-hour lifetime the
        // shipment carries in its own SBD, so the integrasjonspunkt's expiry verdict reaches the
        // instance before our wait gives up.
        Assert.Equal(TimeSpan.FromHours(2.5), conclusion.StepOptions?.WaitBudget);
        Assert.Null(((IPipelineServiceTask)_serviceTask).StepOptions);
        Assert.Null(pipeline.Items[0].StepOptions);
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

    /// <summary>
    /// The shape of the integrasjonspunkt's refusal: a JSON body naming the Java exception and
    /// explaining the problem in <c>message</c>.
    /// </summary>
    private const string RejectionBody =
        "{\n"
        + "  \"timestamp\" : \"2026-09-03T14:40:16.928+02:00\",\n"
        + "  \"exception\" : \"no.difi.meldingsutveksling.exceptions.ReceiverDoNotAcceptDocumentStandard\",\n"
        + "  \"message\" : \"Receiver 0192:910075918 does not accept document standard urn:no:difi:arkivmelding:xsd::arkivmelding\",\n"
        + "  \"status\" : 400,\n"
        + "  \"error\" : \"Bad Request\",\n"
        + "  \"path\" : \"/api/messages/out\"\n"
        + "}";

    private const string RejectionReason =
        "Receiver 0192:910075918 does not accept document standard urn:no:difi:arkivmelding:xsd::arkivmelding";

    /// <summary>
    /// What the client throws when the integrasjonspunkt answers with <paramref name="statusCode"/>:
    /// the status and captured body on the exception, the operation in its message.
    /// </summary>
    private static PlatformHttpException IntegrasjonspunktAnswered(
        HttpStatusCode statusCode,
        string body = "",
        string operation = "create eFormidling message"
    ) =>
        new(
            new PlatformHttpResponse(statusCode) { Content = body },
            $"The eFormidling integrasjonspunkt returned {(int)statusCode} {statusCode} for: {operation}."
        );

    private void SetupSendThrows(Exception exception) =>
        _eFormidlingServiceMock
            .Setup(x =>
                x.SendEFormidlingShipment(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>()
                )
            )
            .ThrowsAsync(exception);

    private void SetupStatusThrows(Exception exception) =>
        _eFormidlingServiceMock
            .Setup(x =>
                x.GetEFormidlingShipmentStatus(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>()
                )
            )
            .ThrowsAsync(exception);

    private Mock<IInstanceDataMutator> SetupEnabledTask(Instance instance)
    {
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        var taskExtension = new AltinnTaskExtension { EFormidlingConfiguration = GetConfig() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("taskId")).Returns(taskExtension);

        return instanceMutatorMock;
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.UnprocessableEntity)]
    public async Task SendShipment_Should_FailPermanently_When_TheIntegrasjonspunktRejectsTheRequest(
        HttpStatusCode statusCode
    )
    {
        // A 4xx is the integrasjonspunkt's verdict on the request itself. Repeating the request
        // unchanged gets the same answer, so a retry can only hammer it for the engine's whole retry
        // budget - which is what happened while this surfaced as a retryable 500.
        Instance instance = GetInstance();
        Mock<IInstanceDataMutator> instanceMutatorMock = SetupEnabledTask(instance);
        SetupSendThrows(IntegrasjonspunktAnswered(statusCode, RejectionBody));

        var result = await SendShipment(_serviceTask, CreateContext(instanceMutatorMock.Object));

        var failed = Assert.IsType<FailedServiceTaskStageResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains($"{(int)statusCode} {statusCode}", failed.ErrorMessage);
        Assert.Contains("create eFormidling message", failed.ErrorMessage);
        Assert.Contains("Manual follow-up is required", failed.ErrorMessage);

        // Nothing was sent, so nothing is claimed.
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

    [Theory]
    // The integrasjonspunkt's own JSON: the explanation is its message field, not the whole body.
    [InlineData(RejectionBody, RejectionReason)]
    // The gateway's JSON uses the same field name.
    [InlineData(
        "{ \"statusCode\": 401, \"message\": \"Access denied due to missing subscription key.\" }",
        "Access denied due to missing subscription key."
    )]
    // Not JSON at all - a proxy's error page. Still the best explanation there is.
    [InlineData("<html>Forbidden</html>", "<html>Forbidden</html>")]
    public async Task SendShipment_Should_ExplainTheRejection_InTheIntegrasjonspunktsOwnWords(
        string body,
        string expectedReason
    )
    {
        Instance instance = GetInstance();
        Mock<IInstanceDataMutator> instanceMutatorMock = SetupEnabledTask(instance);
        SetupSendThrows(IntegrasjonspunktAnswered(HttpStatusCode.BadRequest, body));

        var result = await SendShipment(_serviceTask, CreateContext(instanceMutatorMock.Object));

        var failed = Assert.IsType<FailedServiceTaskStageResult>(result);
        Assert.Contains($"The integrasjonspunkt said: {expectedReason}", failed.ErrorMessage);
    }

    [Fact]
    public async Task SendShipment_Should_KeepTheRejectionMessage_OnOneLine_AndWithoutAnEmptyExplanation()
    {
        Instance instance = GetInstance();
        Mock<IInstanceDataMutator> instanceMutatorMock = SetupEnabledTask(instance);

        // The message becomes a log line and an error-history entry, so a multi-line body is flattened.
        SetupSendThrows(IntegrasjonspunktAnswered(HttpStatusCode.BadRequest, "first line\r\nsecond line"));
        var flattened = Assert.IsType<FailedServiceTaskStageResult>(
            await SendShipment(_serviceTask, CreateContext(instanceMutatorMock.Object))
        );
        Assert.Contains("first line", flattened.ErrorMessage);
        Assert.Contains("second line", flattened.ErrorMessage);
        Assert.DoesNotContain('\n', flattened.ErrorMessage);
        Assert.DoesNotContain('\r', flattened.ErrorMessage);

        // No body, no "said" clause: the status line and the consequence stand on their own.
        SetupSendThrows(IntegrasjonspunktAnswered(HttpStatusCode.BadRequest));
        var bare = Assert.IsType<FailedServiceTaskStageResult>(
            await SendShipment(_serviceTask, CreateContext(instanceMutatorMock.Object))
        );
        Assert.DoesNotContain("The integrasjonspunkt said", bare.ErrorMessage);
        Assert.Contains("400 BadRequest", bare.ErrorMessage);
    }

    [Theory]
    [InlineData(HttpStatusCode.RequestTimeout)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.BadGateway)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task SendShipment_Should_StayRetryable_When_TheAnswerMayChange(HttpStatusCode statusCode)
    {
        // Pressure, timing and server faults are about the moment, not the request: the exception
        // propagates, and the engine retries with backoff as before.
        Instance instance = GetInstance();
        Mock<IInstanceDataMutator> instanceMutatorMock = SetupEnabledTask(instance);
        SetupSendThrows(IntegrasjonspunktAnswered(statusCode));

        var exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            SendShipment(_serviceTask, CreateContext(instanceMutatorMock.Object))
        );
        Assert.Equal(statusCode, exception.StatusCode);
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
    public async Task AwaitDelivery_Should_FailPermanently_When_TheIntegrasjonspunktRejectsTheStatusRequest()
    {
        // The same verdict on the poll as on the send: a 4xx from the status endpoint will not change
        // on the next check, so the wait ends now with the reason, rather than after the engine has
        // spent a day of retries on it.
        Instance instance = GetInstance();
        Mock<IInstanceDataMutator> instanceMutatorMock = SetupEnabledTask(instance);
        SetupStatusThrows(
            IntegrasjonspunktAnswered(
                HttpStatusCode.Forbidden,
                "{ \"statusCode\": 403, \"message\": \"Access denied due to invalid subscription key.\" }",
                operation: "read eFormidling message status"
            )
        );

        var result = await AwaitDelivery(_serviceTask, CreateContext(instanceMutatorMock.Object));

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("403 Forbidden", failed.ErrorMessage);
        Assert.Contains("read eFormidling message status", failed.ErrorMessage);
        Assert.Contains("Access denied due to invalid subscription key.", failed.ErrorMessage);
        Assert.Contains("may still be delivered", failed.ErrorMessage);

        // No verdict was read, so none is recorded and nothing is confirmed.
        _instanceClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AwaitDelivery_Should_StayRetryable_When_TheStatusRequestFailsTransiently()
    {
        Instance instance = GetInstance();
        Mock<IInstanceDataMutator> instanceMutatorMock = SetupEnabledTask(instance);
        SetupStatusThrows(
            IntegrasjonspunktAnswered(HttpStatusCode.ServiceUnavailable, operation: "read eFormidling message status")
        );

        await Assert.ThrowsAsync<PlatformHttpException>(() =>
            AwaitDelivery(_serviceTask, CreateContext(instanceMutatorMock.Object))
        );
        _instanceClientMock.VerifyNoOtherCalls();
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
