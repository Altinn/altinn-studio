using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Features.Payment;

public class PaymentServiceTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public PaymentService Service => (PaymentService)ServiceProvider.GetRequiredService<IPaymentService>();

        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public static Fixture Create(bool addProcessor = true, bool addOrderDetailsCalculator = true)
        {
            var services = new ServiceCollection();
            services.AddLogging(logging => logging.AddProvider(NullLoggerProvider.Instance));
            services.AddAppImplementationFactory();
            services.AddSingleton(new Mock<IDataService>(MockBehavior.Strict).Object);

            if (addOrderDetailsCalculator)
                services.AddSingleton(new Mock<IOrderDetailsCalculator>(MockBehavior.Strict).Object);
            if (addProcessor)
                services.AddSingleton(new Mock<IPaymentProcessor>(MockBehavior.Strict).Object);

            services.AddSingleton<IPaymentService, PaymentService>();

            return new Fixture(services.BuildStrictServiceProvider());
        }

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();
    }

    [Fact]
    public async Task StartPayment_ReturnsRedirectUrl_WhenPaymentStartedSuccessfully()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(instance, language))
            .ReturnsAsync(orderDetails);
        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));
        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.InsertJsonObject(It.IsAny<InstanceIdentifier>(), It.IsAny<string>(), It.IsAny<object>()))
            .ReturnsAsync(new DataElement());
        fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(instance, orderDetails, language))
            .ReturnsAsync(paymentDetails);

        // Act
        (PaymentInformation paymentInformationResult, bool alreadyPaid) = await fixture.Service.StartPayment(
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
        fixture
            .Mock<IOrderDetailsCalculator>()
            .Verify(odc => odc.CalculateOrderDetails(instance, language), Times.Once);
        fixture.Mock<IPaymentProcessor>().Verify(pp => pp.StartPayment(instance, orderDetails, language), Times.Once);
        fixture
            .Mock<IDataService>()
            .Verify(ds =>
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
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);

        fixture
            .Mock<IDataService>()
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
        (PaymentInformation paymentInformationResult, bool alreadyPaid) = await fixture.Service.StartPayment(
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
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));

        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(odc => odc.CalculateOrderDetails(instance, language))
            .ThrowsAsync(new Exception());

        fixture.Mock<IPaymentProcessor>().Setup(x => x.PaymentProcessorId).Returns("paymentProcessorId");

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(() =>
            fixture.Service.StartPayment(instance, paymentConfiguration, language)
        );
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenPaymentCannotBeStarted()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));
        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(pp => pp.CalculateOrderDetails(instance, language))
            .ReturnsAsync(orderDetails);

        fixture.Mock<IPaymentProcessor>().Setup(x => x.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.StartPayment(instance, orderDetails, language))
            .ThrowsAsync(new Exception());

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(() =>
            fixture.Service.StartPayment(instance, paymentConfiguration, language)
        );
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenPaymentInformationCannotBeStored()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(instance, language))
            .ReturnsAsync(orderDetails);
        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));
        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.InsertJsonObject(It.IsAny<InstanceIdentifier>(), It.IsAny<string>(), It.IsAny<object>()))
            .ThrowsAsync(new Exception());
        fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.StartPayment(instance, orderDetails, language))
            .ReturnsAsync(paymentDetails);

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(() =>
            fixture.Service.StartPayment(instance, paymentConfiguration, language)
        );
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ReturnsNull_WhenNoPaymentInformationFound()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(instance, language))
            .ReturnsAsync(orderDetails);

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.Empty, null));

        // Act
        PaymentInformation? result = await fixture.Service.CheckAndStorePaymentStatus(
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
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(odc => odc.CalculateOrderDetails(instance, language))
            .ReturnsAsync(orderDetails);

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        fixture.Mock<IPaymentProcessor>().Setup(x => x.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);

        fixture
            .Mock<IPaymentProcessor>()
            .Setup(x => x.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<string>(), It.IsAny<decimal>(), language))
            .ThrowsAsync(new PaymentException("Some exception"));

        // Act & Assert
        await Assert.ThrowsAsync<PaymentException>(() =>
            fixture.Service.CheckAndStorePaymentStatus(instance, paymentConfiguration, language)
        );
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ReturnsPaymentInformation_WhenPaymentStatusCheckedSuccessfully()
    {
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(instance, language))
            .ReturnsAsync(orderDetails);

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.UpdateJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<object>()
                )
            )
            .ReturnsAsync(new DataElement());

        fixture.Mock<IPaymentProcessor>().Setup(x => x.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);

        fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.GetPaymentStatus(It.IsAny<Instance>(), It.IsAny<string>(), It.IsAny<decimal>(), language))
            .ReturnsAsync(
                (PaymentStatus.Paid, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "redirect url" })
            );

        // Act
        PaymentInformation? result = await fixture.Service.CheckAndStorePaymentStatus(
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
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        OrderDetails orderDetails = CreateOrderDetails();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        paymentInformation.Status = PaymentStatus.Cancelled;

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.DeleteById(It.IsAny<InstanceIdentifier>(), It.IsAny<Guid>()))
            .ReturnsAsync(true);

        fixture
            .Mock<IDataService>()
            .Setup(x =>
                x.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    paymentConfiguration.PaymentDataType!,
                    It.IsAny<object>()
                )
            )
            .ReturnsAsync(new DataElement());

        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(instance, language))
            .ReturnsAsync(orderDetails);

        fixture.Mock<IPaymentProcessor>().Setup(x => x.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);

        fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()))
            .ReturnsAsync(true);

        fixture
            .Mock<IPaymentProcessor>()
            .Setup(x => x.StartPayment(instance, orderDetails, language))
            .ReturnsAsync(paymentDetails);

        // Act
        await fixture.Service.StartPayment(instance, paymentConfiguration, language);

        // Assert
        fixture
            .Mock<IPaymentProcessor>()
            .Verify(pp => pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()), Times.Once);
        fixture
            .Mock<IDataService>()
            .Verify(ds => ds.DeleteById(It.IsAny<InstanceIdentifier>(), It.IsAny<Guid>()), Times.Once);
    }

    [Fact]
    public async Task CancelPayment_ShouldNotDelete_WhenPaymentCancellationFails()
    {
        // Arrange
        Instance instance = CreateInstance();
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        string language = LanguageConst.Nb;

        using var fixture = Fixture.Create();

        fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(instance, language))
            .ReturnsAsync(orderDetails);
        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.InsertJsonObject(It.IsAny<InstanceIdentifier>(), It.IsAny<string>(), It.IsAny<object>()))
            .ReturnsAsync(new DataElement());
        fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(instance, orderDetails, language))
            .ReturnsAsync(paymentDetails);

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(It.IsAny<Instance>(), It.IsAny<string>()))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<PaymentException>(async () =>
            await fixture.Service.StartPayment(instance, paymentConfiguration, language)
        );

        // Act & Assert
        fixture
            .Mock<IPaymentProcessor>()
            .Verify(pp => pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>()), Times.Once);
        fixture
            .Mock<IDataService>()
            .Verify(ds => ds.DeleteById(It.IsAny<InstanceIdentifier>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task StartPayment_ShouldThrowPaymentException_WhenOrderDetailsCalculatorIsNull()
    {
        // Arrange
        Instance instance = CreateInstance();
        ValidAltinnPaymentConfiguration paymentConfiguration = new() { PaymentDataType = "paymentDataType" };

        using var fixture = Fixture.Create(addProcessor: false, addOrderDetailsCalculator: false);

        var paymentService = fixture.Service;

        // Act
        Func<Task> act = async () =>
            await paymentService.StartPayment(instance, paymentConfiguration, LanguageConst.En);

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
        using var fixture = Fixture.Create(addProcessor: false, addOrderDetailsCalculator: false);

        var paymentService = fixture.Service;

        Instance instance = CreateInstance();
        var paymentConfiguration = new AltinnPaymentConfiguration
        {
            PaymentDataType = "paymentDataType",
            PaymentReceiptPdfDataType = "paymentReceiptPdfDataType",
        };

        // Act
        Func<Task> act = async () =>
            await paymentService.CheckAndStorePaymentStatus(
                instance,
                paymentConfiguration.Validate(),
                LanguageConst.En
            );

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
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        using var fixture = Fixture.Create();

        string paymentDataType =
            paymentConfiguration.PaymentDataType
            ?? throw new Exception("PaymentDataType should not be null. Fix test.");

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(instance, paymentDataType))
            .ReturnsAsync((Guid.NewGuid(), null));

        // Act
        Func<Task> act = async () => await fixture.Service.GetPaymentStatus(instance, paymentConfiguration);

        // Assert
        await act.Should().ThrowAsync<PaymentException>().WithMessage("Payment information not found.");
    }

    [Fact]
    public async Task GetPaymentStatus_ShouldReturn_CorrectStatus()
    {
        // Arrange
        Instance instance = CreateInstance();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.Status = PaymentStatus.Paid;

        using var fixture = Fixture.Create();

        string paymentDataType =
            paymentConfiguration.PaymentDataType
            ?? throw new Exception("PaymentDataType should not be null. Fix test.");

        fixture
            .Mock<IDataService>()
            .Setup(ds => ds.GetByType<PaymentInformation>(instance, paymentDataType))
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        // Act
        PaymentStatus result = await fixture.Service.GetPaymentStatus(instance, paymentConfiguration);

        // Assert
        result.Should().Be(PaymentStatus.Paid);
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
                Receiver = new PaymentReceiver(),
            },
            PaymentDetails = new PaymentDetails { RedirectUrl = "Redirect URL", PaymentId = "paymentId" },
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
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "payment", ElementId = "Task_1" },
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
                },
            ],
            Receiver = new PaymentReceiver(),
        };
    }

    private static ValidAltinnPaymentConfiguration CreatePaymentConfiguration()
    {
        return new AltinnPaymentConfiguration
        {
            PaymentDataType = "paymentInformation",
            PaymentReceiptPdfDataType = "paymentReceiptPdf",
        }.Validate();
    }
}
