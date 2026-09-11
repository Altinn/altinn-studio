using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
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

    private readonly Mock<IPdfService> _pdfServiceMock = new();
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IPaymentProcessor> _paymentProcessorMock = new();
    private readonly AppImplementationFactory _appImplementationFactory;

    public PaymentCommandTests()
    {
        _paymentProcessorMock.Setup(x => x.PaymentProcessorId).Returns("paymentProcessorId");
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

    private CleanupPaymentCommand CreateCleanupCommand() => new(_processReaderMock.Object, _appImplementationFactory);

    private CompletePaymentCommand CreateCompleteCommand() => new(_processReaderMock.Object, _pdfServiceMock.Object);

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
