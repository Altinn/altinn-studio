using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class PaymentProcessTaskTests
{
    private readonly Mock<IPdfService> _pdfServiceMock;
    private readonly Mock<IProcessReader> _processReaderMock;
    private readonly Mock<IPaymentService> _paymentServiceMock;
    private readonly Mock<IPaymentProcessor> _paymentProcessorMock;
    private readonly PaymentProcessTask _paymentProcessTask;

    public PaymentProcessTaskTests()
    {
        _pdfServiceMock = new Mock<IPdfService>();
        _processReaderMock = new Mock<IProcessReader>();
        _paymentServiceMock = new Mock<IPaymentService>();
        _paymentProcessorMock = new Mock<IPaymentProcessor>();
        _paymentProcessorMock.Setup(x => x.PaymentProcessorId).Returns("paymentProcessorId");

        var services = new ServiceCollection();
        services.AddSingleton(_paymentProcessorMock.Object);
        var appImplementationFactory = new AppImplementationFactory(services.BuildServiceProvider());

        _paymentProcessTask = new PaymentProcessTask(
            _pdfServiceMock.Object,
            _processReaderMock.Object,
            _paymentServiceMock.Object,
            appImplementationFactory,
            new Mock<IAppMetadata>().Object,
            new Mock<IHostEnvironment>().Object
        );
    }

    [Fact]
    public async Task Start_ShouldTerminateProcessorAndRemovePaymentData()
    {
        PaymentInformation paymentInformation = CreatePaymentInformation(PaymentStatus.Created);
        string paymentId = paymentInformation.PaymentDetails!.PaymentId;
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(paymentInformation));

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
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

        await _paymentProcessTask.Start(CreateProcessTaskContext(dataMutator.Object));

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
    public async Task Start_PaidPayment_ShouldLeaveStoredPaymentUntouched()
    {
        PaymentInformation paymentInformation = CreatePaymentInformation(PaymentStatus.Paid);
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(paymentInformation));

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        await _paymentProcessTask.Start(CreateProcessTaskContext(dataMutator.Object));

        _paymentProcessorMock.Verify(
            x => x.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()),
            Times.Never
        );
        dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
    }

    [Fact]
    public async Task End_PaymentCompleted_ShouldGeneratePdfReceipt()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _paymentServiceMock
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>()))
            .ReturnsAsync(PaymentStatus.Paid);
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(instance, taskId, false, null, CancellationToken.None))
            .ReturnsAsync(new MemoryStream([1, 2, 3]));

        await _paymentProcessTask.End(CreateProcessTaskContext(dataMutator.Object));

        _pdfServiceMock.Verify(x => x.GeneratePdf(instance, taskId, false, null, CancellationToken.None));
        dataMutator.Verify(x =>
            x.AddBinaryDataElement(
                validPaymentConfiguration.PaymentReceiptPdfDataType,
                "application/pdf",
                "Betalingskvittering.pdf",
                It.IsAny<ReadOnlyMemory<byte>>(),
                taskId,
                It.IsAny<List<KeyValueEntry>?>()
            )
        );
    }

    [Fact]
    public async Task End_ExistingTaskGeneratedReceipt_ShouldUpdatePdfReceipt()
    {
        DataElement existingReceipt = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentReceiptPdfDataType",
            ContentType = "application/pdf",
            Filename = "Betalingskvittering.pdf",
            References =
            [
                // Storage always stamps generatedFromTask references with the GeneratedFrom relation.
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = "Task_1",
                },
            ],
        };
        Instance instance = CreateInstance(existingReceipt);
        var dataMutator = CreateDataMutator(instance);

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _paymentServiceMock
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>()))
            .ReturnsAsync(PaymentStatus.Paid);
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(instance, "Task_1", false, null, CancellationToken.None))
            .ReturnsAsync(new MemoryStream([1, 2, 3]));

        await _paymentProcessTask.End(CreateProcessTaskContext(dataMutator.Object));

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
    public async Task End_PaymentSkipped_ShouldNotGeneratePdfReceipt()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _paymentServiceMock
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>()))
            .ReturnsAsync(PaymentStatus.Skipped);

        await _paymentProcessTask.End(CreateProcessTaskContext(dataMutator.Object));

        _pdfServiceMock.Verify(x => x.GeneratePdf(instance, taskId, false, null, CancellationToken.None), Times.Never);
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    validPaymentConfiguration.PaymentReceiptPdfDataType,
                    "application/pdf",
                    "Betalingskvittering.pdf",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    taskId,
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task End_PaymentNotCompleted_ShouldThrowException()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _paymentServiceMock
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>()))
            .ReturnsAsync(PaymentStatus.Created);

        _pdfServiceMock.Verify(x => x.GeneratePdf(instance, taskId, false, null, CancellationToken.None), Times.Never);
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    validPaymentConfiguration.PaymentReceiptPdfDataType,
                    "application/pdf",
                    "Betalingskvittering.pdf",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    taskId,
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );

        await Assert.ThrowsAsync<PaymentException>(async () =>
            await _paymentProcessTask.End(CreateProcessTaskContext(dataMutator.Object))
        );
    }

    [Fact]
    public async Task Abandon_ShouldTerminateProcessorAndRemovePaymentData()
    {
        PaymentInformation paymentInformation = CreatePaymentInformation(PaymentStatus.Created);
        string paymentId = paymentInformation.PaymentDetails!.PaymentId;
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(paymentInformation));

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
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

        await _paymentProcessTask.Abandon(CreateProcessTaskContext(dataMutator.Object));

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
    public async Task End_PaymentConfigurationIsNull_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        Func<Task> act = async () =>
            await _paymentProcessTask.End(CreateProcessTaskContext(CreateDataMutator(CreateInstance()).Object));

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentConfig is missing*");
    }

    [Fact]
    public async Task End_PaymentDataTypeIsNullOrWhitespace_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration { PaymentDataType = "" },
                }
            );

        Func<Task> act = async () =>
            await _paymentProcessTask.End(CreateProcessTaskContext(CreateDataMutator(CreateInstance()).Object));

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentDataType is missing*");
    }

    [Fact]
    public async Task End_ValidConfiguration_ShouldNotThrow()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

        _paymentServiceMock
            .Setup(ps => ps.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>()))
            .ReturnsAsync(PaymentStatus.Paid);
        _pdfServiceMock
            .Setup(ps =>
                ps.GeneratePdf(It.IsAny<Instance>(), It.IsAny<string>(), false, null, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(new MemoryStream([1, 2, 3]));

        Func<Task> act = async () =>
            await _paymentProcessTask.End(CreateProcessTaskContext(CreateDataMutator(CreateInstance()).Object));

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Abandon_PaymentConfigurationIsNull_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        Func<Task> act = async () =>
            await _paymentProcessTask.Abandon(CreateProcessTaskContext(CreateDataMutator(CreateInstance()).Object));

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentConfig is missing*");
    }

    [Fact]
    public async Task Abandon_ValidConfiguration_ShouldNotThrow()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

        Func<Task> act = async () =>
            await _paymentProcessTask.Abandon(CreateProcessTaskContext(CreateDataMutator(CreateInstance()).Object));

        await act.Should().NotThrowAsync();
    }

    private static Mock<IInstanceDataMutator> CreateDataMutator(Instance instance)
    {
        var dataMutator = new Mock<IInstanceDataMutator>();
        dataMutator.Setup(x => x.Instance).Returns(instance);
        return dataMutator;
    }

    private static ProcessTaskContext CreateProcessTaskContext(IInstanceDataMutator dataMutator) =>
        new() { InstanceDataMutator = dataMutator };

    private static Instance CreateInstance(params DataElement[] dataElements)
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = "Task_1" },
            },
            Data = [.. dataElements],
        };
    }

    private static AltinnPaymentConfiguration CreatePaymentConfiguration()
    {
        return new AltinnPaymentConfiguration
        {
            PaymentDataType = "paymentDataType",
            PaymentReceiptPdfDataType = "paymentReceiptPdfDataType",
        };
    }

    private static PaymentInformation CreatePaymentInformation(PaymentStatus status)
    {
        return new PaymentInformation
        {
            TaskId = "Task_1",
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
    }

    private static DataElement CreatePaymentDataElement()
    {
        return new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentDataType",
            ContentType = "application/json",
            Filename = "paymentDataType.json",
        };
    }
}
