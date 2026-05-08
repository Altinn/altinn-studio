using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Hosting;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class PaymentProcessTaskTests
{
    private readonly Mock<IPdfService> _pdfServiceMock;
    private readonly Mock<IDataClient> _dataClientMock;
    private readonly Mock<IProcessReader> _processReaderMock;
    private readonly Mock<IPaymentService> _paymentServiceMock;
    private readonly PaymentProcessTask _paymentProcessTask;

    public PaymentProcessTaskTests()
    {
        _pdfServiceMock = new Mock<IPdfService>();
        _dataClientMock = new Mock<IDataClient>();
        _processReaderMock = new Mock<IProcessReader>();
        _paymentServiceMock = new Mock<IPaymentService>();

        _paymentProcessTask = new PaymentProcessTask(
            _pdfServiceMock.Object,
            _dataClientMock.Object,
            _processReaderMock.Object,
            _paymentServiceMock.Object,
            new Mock<IAppMetadata>().Object,
            new Mock<IHostEnvironment>().Object
        );
    }

    [Fact]
    public async Task Start_ShouldCancelAndDelete()
    {
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        // Act
        await _paymentProcessTask.Start(taskId, instance);

        // Assert
        _paymentServiceMock.Verify(x =>
            x.CancelAndDeleteAnyExistingPayment(instance, altinnTaskExtension.PaymentConfiguration.Validate())
        );
    }

    [Fact]
    public async Task End_PaymentCompleted_ShouldGeneratePdfReceipt()
    {
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        _paymentServiceMock
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>()))
            .ReturnsAsync(PaymentStatus.Paid);

        // Act
        await _paymentProcessTask.End(taskId, instance);

        // Assert
        _pdfServiceMock.Verify(x => x.GeneratePdf(instance, taskId, false, CancellationToken.None));
        _dataClientMock.Verify(x =>
            x.InsertBinaryData(
                instance.Id,
                validPaymentConfiguration.PaymentReceiptPdfDataType,
                "application/pdf",
                "Betalingskvittering.pdf",
                It.IsAny<Stream>(),
                taskId,
                It.IsAny<StorageAuthenticationMethod?>(),
                It.IsAny<CancellationToken>()
            )
        );
    }

    [Fact]
    public async Task End_PaymentSkipped_ShouldNotGeneratePdfReceipt()
    {
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        _paymentServiceMock
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>()))
            .ReturnsAsync(PaymentStatus.Skipped);

        // Act
        await _paymentProcessTask.End(taskId, instance);

        // Assert
        _pdfServiceMock.Verify(x => x.GeneratePdf(instance, taskId, false, CancellationToken.None), Times.Never);
        _dataClientMock.Verify(
            x =>
                x.InsertBinaryData(
                    instance.Id,
                    validPaymentConfiguration.PaymentReceiptPdfDataType,
                    "application/pdf",
                    "Betalingskvittering.pdf",
                    It.IsAny<Stream>(),
                    taskId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task End_PaymentNotCompleted_ShouldThrowException()
    {
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        _paymentServiceMock
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>()))
            .ReturnsAsync(PaymentStatus.Created);

        // Act and assert
        _pdfServiceMock.Verify(x => x.GeneratePdf(instance, taskId, false, CancellationToken.None), Times.Never);
        _dataClientMock.Verify(
            x =>
                x.InsertBinaryData(
                    instance.Id,
                    validPaymentConfiguration.PaymentReceiptPdfDataType,
                    "application/pdf",
                    "Betalingskvittering.pdf",
                    It.IsAny<Stream>(),
                    taskId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );

        await Assert.ThrowsAsync<PaymentException>(async () => await _paymentProcessTask.End(taskId, instance));
    }

    [Fact]
    public async Task Abandon_ShouldCancelAndDelete()
    {
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        // Act
        await _paymentProcessTask.Abandon(taskId, instance);

        // Assert
        _paymentServiceMock.Verify(x =>
            x.CancelAndDeleteAnyExistingPayment(instance, altinnTaskExtension.PaymentConfiguration.Validate())
        );
    }

    [Fact]
    public async Task End_PaymentConfigurationIsNull_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        Func<Task> act = async () => await _paymentProcessTask.End("taskId", new Instance());

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

        Func<Task> act = async () => await _paymentProcessTask.End("taskId", new Instance());

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

        using var memoryStream = new MemoryStream();
        _pdfServiceMock
            .Setup(ps => ps.GeneratePdf(It.IsAny<Instance>(), It.IsAny<string>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(memoryStream);

        Func<Task> act = async () => await _paymentProcessTask.End("taskId", new Instance());

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Abandon_PaymentConfigurationIsNull_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        Func<Task> act = async () => await _paymentProcessTask.Abandon("taskId", new Instance());

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentConfig is missing*");
    }

    [Fact]
    public async Task Abandon_ValidConfiguration_ShouldNotThrow()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

        Func<Task> act = async () => await _paymentProcessTask.Abandon("taskId", new Instance());

        await act.Should().NotThrowAsync();
    }

    private static Instance CreateInstance()
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = "Task_1" },
            },
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
}
