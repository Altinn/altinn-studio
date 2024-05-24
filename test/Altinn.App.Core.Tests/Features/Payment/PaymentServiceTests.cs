using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Payment;

public class PaymentServiceTests
{
    private readonly PaymentService _paymentService;
    private readonly Mock<IPaymentProcessor> _paymentProcessor = new(MockBehavior.Strict);
    private readonly Mock<IOrderDetailsCalculator> _orderDetailsCalculator = new(MockBehavior.Strict);
    private readonly Mock<IDataService> _dataService = new(MockBehavior.Strict);
    private readonly Mock<ILogger<PaymentService>> _logger = new();

    public PaymentServiceTests()
    {
        _paymentService = new PaymentService(
            [_paymentProcessor.Object],
            _dataService.Object,
            _logger.Object,
            _orderDetailsCalculator.Object
        );
    }

    [Fact]
    public async Task StartPayment_ReturnsRedirectUrl_WhenPaymentStartedSuccessfully()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        const string language = "nb";

        _orderDetailsCalculator.Setup(p => p.CalculateOrderDetails(instance, language)).ReturnsAsync(orderDetails);
        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));
        _dataService
            .Setup(ds => ds.InsertJsonObject(It.IsAny<InstanceIdentifier>(), It.IsAny<string>(), It.IsAny<object>()))
            .ReturnsAsync(new DataElement());
        _paymentProcessor.Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        _paymentProcessor.Setup(p => p.StartPayment(instance, orderDetails, language)).ReturnsAsync(paymentDetails);

        // Act
        (PaymentInformation paymentInformationResult, bool alreadyPaid) = await _paymentService.StartPayment(
            instance,
            paymentConfiguration,
            language
        );

        // Assert
        paymentInformationResult.PaymentDetails.Should().NotBeNull();
        paymentInformationResult
            .PaymentDetails!.RedirectUrl.Should()
            .Be(paymentInformation.PaymentDetails!.RedirectUrl);
        paymentInformationResult.OrderDetails.Should().BeEquivalentTo(orderDetails);
        paymentInformationResult
            .OrderDetails.PaymentProcessorId.Should()
            .Be(paymentInformation.OrderDetails.PaymentProcessorId);
        alreadyPaid.Should().BeFalse();

        // Verify calls
        _orderDetailsCalculator.Verify(odc => odc.CalculateOrderDetails(instance, language), Times.Once);
        _paymentProcessor.Verify(pp => pp.StartPayment(instance, orderDetails, language), Times.Once);
        _dataService.Verify(ds =>
            ds.InsertJsonObject(
                It.IsAny<InstanceIdentifier>(),
                paymentConfiguration.PaymentDataType!,
                It.IsAny<object>()
            )
        );
    }

    [Fact]
    public async Task StartPayment_ReturnsAlreadyPaidTrue_WhenPaymentIsAlreadyPaid()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        const string language = "nb";

        _paymentProcessor.Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync(
                (
                    Guid.NewGuid(),
                    new PaymentInformation
                    {
                        TaskId = "Task_1",
                        Status = PaymentStatus.Paid,
                        OrderDetails = orderDetails,
                        PaymentDetails = new PaymentDetails { PaymentId = "id", RedirectUrl = "url" },
                    }
                )
            );

        // Act
        (PaymentInformation paymentInformationResult, bool alreadyPaid) = await _paymentService.StartPayment(
            instance,
            paymentConfiguration,
            language
        );

        // Assert
        paymentInformationResult.PaymentDetails.Should().NotBeNull();
        alreadyPaid.Should().BeTrue();
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenOrderDetailsCannotBeRetrieved()
    {
        Instance instance = CreateInstance();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        const string language = "nb";

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));

        _orderDetailsCalculator
            .Setup(odc => odc.CalculateOrderDetails(instance, language))
            .ThrowsAsync(new Exception());

        _paymentProcessor.Setup(x => x.PaymentProcessorId).Returns("paymentProcessorId");

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(
            () => _paymentService.StartPayment(instance, paymentConfiguration, language)
        );
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenPaymentCannotBeStarted()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        const string language = "nb";

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));
        _orderDetailsCalculator.Setup(pp => pp.CalculateOrderDetails(instance, language)).ReturnsAsync(orderDetails);

        _paymentProcessor.Setup(x => x.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        _paymentProcessor.Setup(pp => pp.StartPayment(instance, orderDetails, language)).ThrowsAsync(new Exception());

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(
            () => _paymentService.StartPayment(instance, paymentConfiguration, language)
        );
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenPaymentInformationCannotBeStored()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        const string language = "nb";

        _orderDetailsCalculator.Setup(p => p.CalculateOrderDetails(instance, language)).ReturnsAsync(orderDetails);
        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));
        _dataService
            .Setup(ds => ds.InsertJsonObject(It.IsAny<InstanceIdentifier>(), It.IsAny<string>(), It.IsAny<object>()))
            .ThrowsAsync(new Exception());
        _paymentProcessor.Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        _paymentProcessor.Setup(pp => pp.StartPayment(instance, orderDetails, language)).ReturnsAsync(paymentDetails);

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(
            () => _paymentService.StartPayment(instance, paymentConfiguration, language)
        );
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ReturnsNull_WhenNoPaymentInformationFound()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        const string language = "nb";

        _orderDetailsCalculator.Setup(p => p.CalculateOrderDetails(instance, language)).ReturnsAsync(orderDetails);

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));

        // Act
        PaymentInformation? result = await _paymentService.CheckAndStorePaymentStatus(
            instance,
            paymentConfiguration,
            language
        );

        // Assert
        result.Should().NotBeNull();
        instance.Process.CurrentTask.ElementId.Should().Be(result!.TaskId);
        orderDetails.Should().BeEquivalentTo(result.OrderDetails);
        result.PaymentDetails.Should().BeNull();
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ThrowsException_WhenUnableToCheckPaymentStatus()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        const string language = "nb";

        _orderDetailsCalculator.Setup(odc => odc.CalculateOrderDetails(instance, language)).ReturnsAsync(orderDetails);

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        _paymentProcessor.Setup(x => x.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);

        _paymentProcessor
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<string>(), It.IsAny<decimal>(), language))
            .ThrowsAsync(new PaymentException("Some exception"));

        var paymentService = new PaymentService(
            [_paymentProcessor.Object],
            _dataService.Object,
            _logger.Object,
            _orderDetailsCalculator.Object
        );

        // Act & Assert
        await Assert.ThrowsAsync<PaymentException>(
            () => paymentService.CheckAndStorePaymentStatus(instance, paymentConfiguration, language)
        );
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ReturnsPaymentInformation_WhenPaymentStatusCheckedSuccessfully()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        const string language = "nb";

        _orderDetailsCalculator.Setup(p => p.CalculateOrderDetails(instance, language)).ReturnsAsync(orderDetails);

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        _dataService
            .Setup(ds =>
                ds.UpdateJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<object>()
                )
            )
            .ReturnsAsync(new DataElement());

        _paymentProcessor.Setup(x => x.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);

        _paymentProcessor
            .Setup(pp => pp.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<string>(), It.IsAny<decimal>(), language))
            .ReturnsAsync(
                (PaymentStatus.Paid, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "redirect url" })
            );

        var paymentService = new PaymentService(
            [_paymentProcessor.Object],
            _dataService.Object,
            _logger.Object,
            _orderDetailsCalculator.Object
        );

        // Act
        PaymentInformation? result = await paymentService.CheckAndStorePaymentStatus(
            instance,
            paymentConfiguration,
            language
        );

        // Assert
        result.Should().NotBeNull();
        result!.PaymentDetails.Should().NotBeNull();
        result.Status.Should().Be(PaymentStatus.Paid);
    }

    [Fact]
    public async Task CancelPayment_ShouldCallCancelAndDelete_WhenPaymentIsNotPaid()
    {
        // Arrange
        Instance instance = CreateInstance();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        OrderDetails orderDetails = CreateOrderDetails();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        const string language = "nb";

        paymentInformation.Status = PaymentStatus.Cancelled;

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        _dataService.Setup(ds => ds.DeleteById(It.IsAny<InstanceIdentifier>(), It.IsAny<Guid>())).ReturnsAsync(true);

        _dataService
            .Setup(x =>
                x.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    paymentConfiguration.PaymentDataType!,
                    It.IsAny<object>()
                )
            )
            .ReturnsAsync(new DataElement());

        _orderDetailsCalculator.Setup(p => p.CalculateOrderDetails(instance, language)).ReturnsAsync(orderDetails);

        _paymentProcessor.Setup(x => x.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);

        _paymentProcessor
            .Setup(pp => pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()))
            .ReturnsAsync(true);

        _paymentProcessor.Setup(x => x.StartPayment(instance, orderDetails, language)).ReturnsAsync(paymentDetails);

        // Act
        await _paymentService.StartPayment(instance, paymentConfiguration, language);

        // Assert
        _paymentProcessor.Verify(
            pp => pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()),
            Times.Once
        );
        _dataService.Verify(ds => ds.DeleteById(It.IsAny<InstanceIdentifier>(), It.IsAny<Guid>()), Times.Once);
    }

    [Fact]
    public async Task CancelPayment_ShouldNotDelete_WhenPaymentCancellationFails()
    {
        // Arrange
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        const string language = "nb";

        _orderDetailsCalculator.Setup(p => p.CalculateOrderDetails(instance, language)).ReturnsAsync(orderDetails);
        _dataService
            .Setup(ds => ds.InsertJsonObject(It.IsAny<InstanceIdentifier>(), It.IsAny<string>(), It.IsAny<object>()))
            .ReturnsAsync(new DataElement());
        _paymentProcessor.Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        _paymentProcessor.Setup(p => p.StartPayment(instance, orderDetails, language)).ReturnsAsync(paymentDetails);

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        _paymentProcessor
            .Setup(pp => pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<PaymentException>(
            async () => await _paymentService.StartPayment(instance, paymentConfiguration, language)
        );

        // Act & Assert
        _paymentProcessor.Verify(
            pp => pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()),
            Times.Once
        );
        _dataService.Verify(ds => ds.DeleteById(It.IsAny<InstanceIdentifier>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task StartPayment_ShouldThrowPaymentException_WhenOrderDetailsCalculatorIsNull()
    {
        // Arrange
        Instance instance = CreateInstance();
        AltinnPaymentConfiguration paymentConfiguration = new() { PaymentDataType = "paymentDataType" };

        IPaymentProcessor[] paymentProcessors = []; //No payment processor added.
        var paymentService = new PaymentService(paymentProcessors, _dataService.Object, _logger.Object);

        // Act
        Func<Task> act = async () => await paymentService.StartPayment(instance, paymentConfiguration, "en");

        // Assert
        await act.Should()
            .ThrowAsync<PaymentException>()
            .WithMessage(
                "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation."
            );
    }

    [Fact]
    public async Task CheckAndStorePaymentStatus_ShouldThrowPaymentException_WhenOrderDetailsCalculatorIsNull()
    {
        // Arrange
        IPaymentProcessor[] paymentProcessors = [];
        var paymentService = new PaymentService(paymentProcessors, _dataService.Object, _logger.Object);
        Instance instance = CreateInstance();
        var paymentConfiguration = new AltinnPaymentConfiguration { PaymentDataType = "paymentDataType" };

        // Act
        Func<Task> act = async () =>
            await paymentService.CheckAndStorePaymentStatus(instance, paymentConfiguration, "en");

        // Assert
        await act.Should()
            .ThrowAsync<PaymentException>()
            .WithMessage(
                "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation."
            );
    }

    [Fact]
    public async Task IsPaymentCompleted_ShouldThrowPaymentException_WhenPaymentInformationNotFound()
    {
        // Arrange
        Instance instance = CreateInstance();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        string paymentDataType =
            paymentConfiguration.PaymentDataType
            ?? throw new Exception("PaymentDataType should not be null. Fix test.");

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(instance, paymentDataType))
            .ReturnsAsync((Guid.NewGuid(), null));

        // Act
        Func<Task> act = async () => await _paymentService.IsPaymentCompleted(instance, paymentConfiguration);

        // Assert
        await act.Should().ThrowAsync<PaymentException>().WithMessage("Payment information not found.");
    }

    [Fact]
    public async Task IsPaymentCompleted_ShouldReturnTrue_WhenPaymentStatusIsPaidOrSkipped()
    {
        // Arrange
        Instance instance = CreateInstance();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.Status = PaymentStatus.Paid;

        string paymentDataType =
            paymentConfiguration.PaymentDataType
            ?? throw new Exception("PaymentDataType should not be null. Fix test.");

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(instance, paymentDataType))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        // Act
        bool result = await _paymentService.IsPaymentCompleted(instance, paymentConfiguration);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsPaymentCompleted_ShouldReturnFalse_WhenPaymentStatusIsNotPaidOrSkipped()
    {
        // Arrange
        Instance instance = CreateInstance();
        AltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();

        string paymentDataType =
            paymentConfiguration.PaymentDataType
            ?? throw new Exception("PaymentDataType should not be null. Fix test.");

        _dataService
            .Setup(ds => ds.GetByType<PaymentInformation>(instance, paymentDataType))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        // Act
        var result = await _paymentService.IsPaymentCompleted(instance, paymentConfiguration);

        // Assert
        result.Should().BeFalse();
    }

    private static PaymentInformation CreatePaymentInformation()
    {
        return new PaymentInformation
        {
            TaskId = "taskId",
            Status = PaymentStatus.Created,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Currency = "NOK",
                OrderLines = [],
                Receiver = new PaymentReceiver()
            },
            PaymentDetails = new PaymentDetails { RedirectUrl = "Redirect URL", PaymentId = "paymentId", }
        };
    }

    private static Instance CreateInstance()
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "payment", ElementId = "Task_1", },
            },
        };
    }

    private static OrderDetails CreateOrderDetails()
    {
        return new OrderDetails()
        {
            PaymentProcessorId = "paymentProcessorId",
            Currency = "NOK",
            OrderLines =
            [
                new PaymentOrderLine
                {
                    Id = "001",
                    Name = "Fee",
                    PriceExVat = 1000,
                    VatPercent = 25,
                }
            ],
            Receiver = new PaymentReceiver()
        };
    }

    private static AltinnPaymentConfiguration CreatePaymentConfiguration()
    {
        return new AltinnPaymentConfiguration { PaymentDataType = "paymentInformation" };
    }
}
