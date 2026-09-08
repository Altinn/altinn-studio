using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.Payment;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks.Payment;

public class PaymentCommandTests
{
    private const string TaskId = "Task_1";

    private readonly Mock<IInstanceClient> _instanceClientMock = new();
    private readonly Mock<IPdfService> _pdfServiceMock = new();
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IPaymentProcessor> _paymentProcessorMock = new();
    private readonly AppImplementationFactory _appImplementationFactory;

    public PaymentCommandTests()
    {
        _paymentProcessorMock.Setup(x => x.PaymentProcessorId).Returns("paymentProcessorId");
        _instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    It.IsAny<Instance>(),
                    StorageAuthenticationMethod.ServiceOwner(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (Instance instance, StorageAuthenticationMethod? authenticationMethod, CancellationToken ct) =>
                    new Instance
                    {
                        Id = instance.Id,
                        AppId = instance.AppId,
                        Process = instance.Process,
                        Data = [.. instance.Data],
                    }
            );

        var services = new ServiceCollection();
        services.AddSingleton(_paymentProcessorMock.Object);
        _appImplementationFactory = new AppImplementationFactory(services.BuildServiceProvider());
    }

    [Fact]
    public async Task Cleanup_UnpaidPayment_TerminatesProcessorAndRemovesPaymentData()
    {
        PaymentInformation paymentInformation = CreatePaymentInformation(PaymentStatus.Created);
        string paymentId = paymentInformation.PaymentDetails!.PaymentId;
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(instance);
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(paymentInformation));
        SetupConfiguration();
        _paymentProcessorMock
            .Setup(x =>
                x.TerminatePayment(
                    instance,
                    It.Is<PaymentInformation>(payment =>
                        payment.PaymentDetails != null && payment.PaymentDetails.PaymentId == paymentId
                    )
                )
            )
            .ReturnsAsync(true);

        ProcessEngineCommandResult result = await CreateCleanupCommand().Execute(CreateContext(dataMutator.Object));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        _paymentProcessorMock.Verify(x =>
            x.TerminatePayment(
                instance,
                It.Is<PaymentInformation>(payment =>
                    payment.PaymentDetails != null && payment.PaymentDetails.PaymentId == paymentId
                )
            )
        );
        dataMutator.Verify(x => x.RemoveDataElement(paymentDataElement));
    }

    [Fact]
    public async Task Cleanup_PaidPayment_LeavesStoredPaymentUntouched()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance(paymentDataElement));
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);
        SetupConfiguration();

        ProcessEngineCommandResult result = await CreateCleanupCommand().Execute(CreateContext(dataMutator.Object));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        _paymentProcessorMock.Verify(
            x => x.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()),
            Times.Never
        );
        dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
    }

    [Fact]
    public async Task Cleanup_NoPaymentData_Completes()
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        SetupConfiguration();

        ProcessEngineCommandResult result = await CreateCleanupCommand().Execute(CreateContext(dataMutator.Object));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
    }

    [Fact]
    public async Task Cleanup_ReplayAfterStoredDeletion_DropsStalePaymentWithoutRepeatingEffects()
    {
        DataElement deletedPayment = CreatePaymentDataElement();
        DataElement unrelated = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "form-data",
            Filename = "local.json",
        };
        Instance instance = CreateInstance(deletedPayment, unrelated);
        ProcessState virtualProcess = instance.Process;
        virtualProcess.CurrentTask.ElementId = "Task_AfterPayment";
        Instance stored = CreateInstance(
            new DataElement
            {
                Id = unrelated.Id,
                DataType = unrelated.DataType,
                Filename = "stored.json",
            }
        );
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(instance);
        SetupConfiguration();
        using var cancellation = new CancellationTokenSource();
        _instanceClientMock
            .Setup(x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), cancellation.Token))
            .ReturnsAsync(stored);

        ProcessEngineCommandResult result = await CreateCleanupCommand()
            .Execute(CreateContext(dataMutator.Object, cancellation.Token));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Same(virtualProcess, instance.Process);
        Assert.Equal("Task_AfterPayment", instance.Process.CurrentTask.ElementId);
        Assert.Same(unrelated, Assert.Single(instance.Data));
        dataMutator.Verify(x => x.GetBinaryData(It.IsAny<DataElementIdentifier>()), Times.Never);
        dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
        _paymentProcessorMock.Verify(
            x => x.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()),
            Times.Never
        );
        _instanceClientMock.Verify(
            x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), cancellation.Token),
            Times.Once
        );
    }

    [Fact]
    public async Task Cleanup_MissingConfiguration_Throws()
    {
        _processReaderMock.Setup(pr => pr.GetAltinnTaskExtension(TaskId)).Returns((AltinnTaskExtension?)null);

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            CreateCleanupCommand().Execute(CreateContext(CreateDataMutator(CreateInstance()).Object))
        );

        Assert.Contains("PaymentConfig is missing", exception.Message);
    }

    [Fact]
    public async Task Complete_PaidPayment_GeneratesPdfReceipt()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance(paymentDataElement));
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);
        SetupConfiguration();
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(dataMutator.Object, TaskId, false, null, CancellationToken.None))
            .ReturnsAsync(new MemoryStream([1, 2, 3]));

        ProcessEngineCommandResult result = await CreateCompleteCommand().Execute(CreateContext(dataMutator.Object));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        dataMutator.Verify(x =>
            x.AddBinaryDataElement(
                "paymentReceiptPdfDataType",
                "application/pdf",
                "Betalingskvittering.pdf",
                It.IsAny<ReadOnlyMemory<byte>>(),
                TaskId,
                It.IsAny<List<KeyValueEntry>?>()
            )
        );
    }

    [Fact]
    public async Task Complete_ExistingTaskGeneratedReceipt_UpdatesPdfReceipt()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        DataElement existingReceipt = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentReceiptPdfDataType",
            ContentType = "application/pdf",
            Filename = "Betalingskvittering.pdf",
            References =
            [
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = TaskId,
                },
            ],
        };
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance(paymentDataElement, existingReceipt));
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);
        SetupConfiguration();
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(dataMutator.Object, TaskId, false, null, CancellationToken.None))
            .ReturnsAsync(new MemoryStream([1, 2, 3]));

        ProcessEngineCommandResult result = await CreateCompleteCommand().Execute(CreateContext(dataMutator.Object));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        dataMutator.Verify(x =>
            x.UpdateBinaryDataElement(existingReceipt, "application/pdf", It.IsAny<ReadOnlyMemory<byte>>())
        );
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Complete_ReplayAfterStoredReceiptCreation_UpdatesAdoptedReceiptWithoutReplacingVirtualState()
    {
        DataElement payment = CreatePaymentDataElement();
        DataElement unrelated = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "form-data",
            Filename = "local.json",
        };
        Instance instance = CreateInstance(payment, unrelated);
        ProcessState virtualProcess = instance.Process;
        virtualProcess.CurrentTask.ElementId = "Task_AfterPayment";
        DataElement storedReceipt = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentReceiptPdfDataType",
            ContentType = "application/pdf",
            References =
            [
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = TaskId,
                },
            ],
        };
        Instance stored = CreateInstance(
            payment,
            storedReceipt,
            new DataElement
            {
                Id = unrelated.Id,
                DataType = unrelated.DataType,
                Filename = "stored.json",
            }
        );
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(instance);
        SetupPaymentInformation(dataMutator, payment, PaymentStatus.Paid);
        SetupConfiguration();
        using var cancellation = new CancellationTokenSource();
        _instanceClientMock
            .Setup(x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), cancellation.Token))
            .ReturnsAsync(stored);
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(dataMutator.Object, TaskId, false, null, cancellation.Token))
            .ReturnsAsync(new MemoryStream([1, 2, 3]));

        ProcessEngineCommandResult result = await CreateCompleteCommand()
            .Execute(CreateContext(dataMutator.Object, cancellation.Token));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Same(virtualProcess, instance.Process);
        Assert.Equal("Task_AfterPayment", instance.Process.CurrentTask.ElementId);
        Assert.Same(unrelated, Assert.Single(instance.Data, x => x.DataType == "form-data"));
        Assert.Same(storedReceipt, Assert.Single(instance.Data, x => x.DataType == "paymentReceiptPdfDataType"));
        dataMutator.Verify(
            x => x.UpdateBinaryDataElement(storedReceipt, "application/pdf", It.IsAny<ReadOnlyMemory<byte>>()),
            Times.Once
        );
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
        _instanceClientMock.Verify(
            x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), cancellation.Token),
            Times.Once
        );
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task StorageReadFailure_PropagatesBeforePaymentOrDataEffects(bool complete)
    {
        DataElement payment = CreatePaymentDataElement();
        Instance instance = CreateInstance(payment);
        ProcessState virtualProcess = instance.Process;
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(instance);
        SetupConfiguration();
        using var cancellation = new CancellationTokenSource();
        var failure = new HttpRequestException("Storage is temporarily unavailable.");
        _instanceClientMock
            .Setup(x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), cancellation.Token))
            .ThrowsAsync(failure);
        IWorkflowEngineCommand command = complete ? CreateCompleteCommand() : CreateCleanupCommand();

        var thrown = await Assert.ThrowsAsync<HttpRequestException>(() =>
            command.Execute(CreateContext(dataMutator.Object, cancellation.Token))
        );

        Assert.Same(failure, thrown);
        Assert.Same(virtualProcess, instance.Process);
        Assert.Same(payment, Assert.Single(instance.Data));
        dataMutator.Verify(x => x.GetBinaryData(It.IsAny<DataElementIdentifier>()), Times.Never);
        dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
        dataMutator.Verify(
            x =>
                x.UpdateBinaryDataElement(
                    It.IsAny<DataElementIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<ReadOnlyMemory<byte>>()
                ),
            Times.Never
        );
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
        _pdfServiceMock.VerifyNoOtherCalls();
        _paymentProcessorMock.Verify(
            x => x.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()),
            Times.Never
        );
        _instanceClientMock.Verify(
            x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), cancellation.Token),
            Times.Once
        );
    }

    [Fact]
    public async Task Complete_SkippedPayment_CompletesWithoutReceipt()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance(paymentDataElement));
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Skipped);
        SetupConfiguration();

        ProcessEngineCommandResult result = await CreateCompleteCommand().Execute(CreateContext(dataMutator.Object));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        _pdfServiceMock.Verify(
            x =>
                x.GeneratePdf(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Complete_PaymentNotCompleted_FailsPermanently()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance(paymentDataElement));
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Created);
        SetupConfiguration();

        ProcessEngineCommandResult result = await CreateCompleteCommand().Execute(CreateContext(dataMutator.Object));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("not completed", failed.ErrorMessage);
    }

    [Fact]
    public async Task Complete_NoPaymentData_FailsPermanently()
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        SetupConfiguration();

        ProcessEngineCommandResult result = await CreateCompleteCommand().Execute(CreateContext(dataMutator.Object));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("Payment information not found", failed.ErrorMessage);
    }

    [Fact]
    public async Task Complete_MissingConfiguration_Throws()
    {
        _processReaderMock.Setup(pr => pr.GetAltinnTaskExtension(TaskId)).Returns((AltinnTaskExtension?)null);

        ApplicationConfigException exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            CreateCompleteCommand().Execute(CreateContext(CreateDataMutator(CreateInstance()).Object))
        );

        Assert.Contains("PaymentConfig is missing", exception.Message);
    }

    private CleanupPaymentCommand CreateCleanupCommand() =>
        new(_processReaderMock.Object, _appImplementationFactory, _instanceClientMock.Object);

    private CompletePaymentCommand CreateCompleteCommand() =>
        new(_processReaderMock.Object, _pdfServiceMock.Object, _instanceClientMock.Object);

    private void SetupConfiguration() =>
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(TaskId))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration
                    {
                        PaymentDataType = "paymentDataType",
                        PaymentReceiptPdfDataType = "paymentReceiptPdfDataType",
                    },
                }
            );

    private static ProcessEngineCommandContext CreateContext(
        IInstanceDataMutator dataMutator,
        CancellationToken ct = default
    ) =>
        new()
        {
            InstanceDataMutator = dataMutator,
            CancellationToken = ct,
            CommandPayload = CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId)),
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };

    private static Mock<IInstanceDataMutator> CreateDataMutator(Instance instance)
    {
        var dataMutator = new Mock<IInstanceDataMutator>();
        dataMutator.Setup(x => x.Instance).Returns(instance);
        return dataMutator;
    }

    private static void SetupPaymentInformation(
        Mock<IInstanceDataMutator> dataMutator,
        DataElement paymentDataElement,
        PaymentStatus status
    ) =>
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(CreatePaymentInformation(status)));

    private static Instance CreateInstance(params DataElement[] dataElements) =>
        new()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = TaskId },
            },
            Data = [.. dataElements],
        };

    private static PaymentInformation CreatePaymentInformation(PaymentStatus status) =>
        new()
        {
            TaskId = TaskId,
            Status = status,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Receiver = new PaymentReceiver { Name = "Receiver" },
                Currency = "NOK",
                OrderLines =
                [
                    new PaymentOrderLine
                    {
                        Id = "line-1",
                        Name = "test",
                        PriceExVat = 100,
                        Quantity = 1,
                        VatPercent = 25,
                    },
                ],
            },
            PaymentDetails = new PaymentDetails { PaymentId = "payment-123" },
        };

    private static DataElement CreatePaymentDataElement() =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentDataType",
            ContentType = "application/json",
            Filename = "paymentDataType.json",
        };
}

internal static class PaymentCommandTestExtensions
{
    public static Task<ProcessEngineCommandResult> Execute(
        this WorkflowEngineCommandBase<ProcessTaskPayload> command,
        ProcessEngineCommandContext context
    ) => ((IWorkflowEngineCommand)command).Execute(context);
}
