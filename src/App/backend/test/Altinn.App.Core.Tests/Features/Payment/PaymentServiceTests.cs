using System.Net;
using Altinn.App.Core.Constants;
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
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Features.Payment;

public sealed class PaymentServiceTests
{
    private readonly MockedServiceCollection _fixture = new();

    private const string Language = LanguageConst.Nb;

    private readonly Instance _instance = new Instance()
    {
        Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
        Process = new ProcessState
        {
            CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = "Task_1" },
        },
        Data = [],
    };

    private const string PaymentDataTypeId = "paymentInformation";

    public PaymentServiceTests(ITestOutputHelper outputHelper)
    {
        _fixture.OutputHelper = outputHelper;
        _fixture.AppMetadata.DataTypes.Add(
            new DataType() { Id = PaymentDataTypeId, AllowedContentTypes = ["application/json"] }
        );
        _fixture.Storage.AddInstance(_instance);
        // Add required services
        _fixture.Services.AddTransient<IPaymentService, PaymentService>();
    }

    private void SetupPaymentProcessor(OrderDetails orderDetails)
    {
        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(_instance, Language, It.IsAny<CancellationToken>()))
            .ReturnsAsync(orderDetails);

        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
    }

    [Fact]
    public async Task StartPayment_ReturnsRedirectUrl_WhenPaymentStartedSuccessfully()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language))
            .ReturnsAsync(paymentDetails)
            .Verifiable(Times.Once);

        // Act
        await using var provider = _fixture.BuildServiceProvider();
        var paymentService = provider.GetRequiredService<IPaymentService>();
        (PaymentInformation paymentInformationResult, bool alreadyPaid) = await paymentService.StartPayment(
            _instance,
            paymentConfiguration,
            Language
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

        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ReturnsAlreadyPaidTrue_WhenPaymentIsAlreadyPaid()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        // Add OrderDetailsCalculator mock with no setup (it is never used, but required for the service to initialize)
        _fixture.Mock<IOrderDetailsCalculator>();

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var dataService = sp.GetRequiredService<IDataService>();
        // setup dat
        await dataService.InsertJsonObject(
            new InstanceIdentifier(_instance),
            PaymentDataTypeId,
            new PaymentInformation
            {
                TaskId = "Task_1",
                Status = PaymentStatus.Paid,
                OrderDetails = orderDetails,
                PaymentDetails = new PaymentDetails { PaymentId = "id", RedirectUrl = "url" },
            }
        );
        (PaymentInformation paymentInformationResult, bool alreadyPaid) = await paymentService.StartPayment(
            _instance,
            paymentConfiguration,
            Language
        );

        // Assert
        paymentInformationResult.PaymentDetails.Should().NotBeNull();
        alreadyPaid.Should().BeTrue();
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenOrderDetailsCannotBeRetrieved()
    {
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(odc => odc.CalculateOrderDetails(_instance, Language, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Could not calculate order details"));

        _fixture.Mock<IPaymentProcessor>().Setup(x => x.PaymentProcessorId).Returns("paymentProcessorId");

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<Exception>(() =>
            paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );
        Assert.Equal("Could not calculate order details", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenPaymentCannotBeStarted()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(pp => pp.CalculateOrderDetails(_instance, Language, It.IsAny<CancellationToken>()))
            .ReturnsAsync(orderDetails)
            .Verifiable(Times.Once);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(x => x.PaymentProcessorId)
            .Returns(orderDetails.PaymentProcessorId)
            .Verifiable(Times.AtLeastOnce);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.StartPayment(_instance, orderDetails, Language, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("ddasdfg"))
            .Verifiable(Times.Once);

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<Exception>(() =>
            paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );
        Assert.Equal("ddasdfg", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenPaymentInformationCannotBeStored()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");

        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(_instance, Language, It.IsAny<CancellationToken>()))
            .ReturnsAsync(orderDetails);
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.GetByType<PaymentInformation>(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((Guid.Empty, null));
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new Exception("Could not insert json object"));
        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language))
            .ReturnsAsync(paymentDetails)
            .Verifiable(Times.Once);

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<Exception>(() =>
            paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );
        Assert.Equal("Could not insert json object", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ReturnsNull_WhenNoPaymentInformationFound()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        SetupPaymentProcessor(orderDetails);

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        PaymentInformation? result = await paymentService.CheckAndStorePaymentStatus(
            _instance,
            paymentConfiguration,
            Language
        );

        // Assert
        result.Should().NotBeNull();
        _instance.Process.CurrentTask.ElementId.Should().Be(result!.TaskId);
        orderDetails.Should().BeEquivalentTo(result.OrderDetails);
        result.PaymentDetails.Should().BeNull();
        Assert.Contains(
            sp.Logs,
            log => log.Body != null && log.Body.Contains("No payment information stored yet for instance")
        );
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ThrowsException_WhenUnableToCheckPaymentStatus()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();

        SetupPaymentProcessor(orderDetails);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(x =>
                x.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new PaymentException("Some exception"));

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<PaymentException>(() =>
            paymentService.CheckAndStorePaymentStatus(_instance, paymentConfiguration, Language)
        );
        Assert.Equal("Some exception", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ReturnsPaymentInformation_WhenPaymentStatusCheckedSuccessfully()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();

        SetupPaymentProcessor(orderDetails);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (PaymentStatus.Paid, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "redirect url" })
            );

        // Act
        await using var sp = _fixture.BuildServiceProvider();

        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);

        var paymentService = sp.GetRequiredService<IPaymentService>();
        PaymentInformation? result = await paymentService.CheckAndStorePaymentStatus(
            _instance,
            paymentConfiguration,
            Language
        );

        // Assert
        result.Should().NotBeNull();
        result!.PaymentDetails.Should().NotBeNull();
        result.Status.Should().Be(PaymentStatus.Paid);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CancelPayment_ShouldCallCancelAndDelete_WhenPaymentIsNotPaid()
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        OrderDetails orderDetails = CreateOrderDetails();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");

        paymentInformation.Status = PaymentStatus.Cancelled;

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language))
            .ReturnsAsync(paymentDetails)
            .Verifiable(Times.Once);

        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.GetByType<PaymentInformation>(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((Guid.NewGuid(), paymentInformation))
            .Verifiable(Times.Once);

        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.DeleteById(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true)
            .Verifiable(Times.Once);

        _fixture
            .Mock<IDataService>()
            .Setup(x =>
                x.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    paymentConfiguration.PaymentDataType!,
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement())
            .Verifiable(Times.Once);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(true)
            .Verifiable(Times.Once);

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var (paymentInfo, alreadyPaid) = await paymentService.StartPayment(_instance, paymentConfiguration, Language);
        Assert.False(alreadyPaid);
        Assert.Equal(PaymentStatus.Created, paymentInfo.Status);
        Assert.Equal(orderDetails, paymentInfo.OrderDetails);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CancelPayment_ShouldNotDelete_WhenPaymentCancellationFails()
    {
        // Arrange
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");

        SetupPaymentProcessor(orderDetails);

        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.GetByType<PaymentInformation>(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(false)
            .Verifiable(Times.Once);

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);

        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );

        // Act & Assert
        Assert.Equal(
            $"Unable to cancel existing {orderDetails.PaymentProcessorId} payment with ID: {paymentDetails.PaymentId}.",
            exception.Message
        );
        _fixture
            .Mock<IDataService>()
            .Verify(
                ds =>
                    ds.DeleteById(
                        It.IsAny<InstanceIdentifier>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ShouldThrowPaymentException_WhenOrderDetailsCalculatorIsNull()
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = new() { PaymentDataType = "paymentDataType" };

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );

        Assert.Equal(
            "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation.",
            exception.Message
        );
    }

    [Fact]
    public async Task CheckPaymentStatus_DoesNotPersistUpdatedStatus()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();

        SetupPaymentProcessor(orderDetails);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (PaymentStatus.Paid, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "redirect url" })
            );

        await using var sp = _fixture.BuildServiceProvider();

        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);

        var paymentService = sp.GetRequiredService<IPaymentService>();
        PaymentInformation? result = await paymentService.CheckPaymentStatus(
            _instance,
            paymentConfiguration,
            taskId: "Task_other",
            Language
        );

        result.Should().NotBeNull();
        result!.Status.Should().Be(PaymentStatus.Paid);

        // Status on disk should be unchanged.
        (_, PaymentInformation? stored) = await dataService.GetByType<PaymentInformation>(_instance, PaymentDataTypeId);
        stored.Should().NotBeNull();
        stored!.Status.Should().NotBe(PaymentStatus.Paid);

        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentStatus_ShouldThrowPaymentException_WhenOrderDetailsCalculatorIsNull()
    {
        var paymentConfiguration = new AltinnPaymentConfiguration
        {
            PaymentDataType = "paymentDataType",
            PaymentReceiptPdfDataType = "paymentReceiptPdfDataType",
        };

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await paymentService.CheckAndStorePaymentStatus(
                _instance,
                paymentConfiguration.Validate(),
                LanguageConst.En
            )
        );

        // Assert
        Assert.Equal(
            "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation.",
            exception.Message
        );
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task IsPaymentCompleted_ShouldThrowPaymentException_WhenPaymentInformationNotFound()
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await paymentService.GetPaymentStatus(_instance, paymentConfiguration)
        );
        Assert.Equal("Payment information not found.", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task GetPaymentStatus_ShouldReturn_CorrectStatus()
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.Status = PaymentStatus.Paid;

        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.GetByType<PaymentInformation>(
                    _instance,
                    PaymentDataTypeId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        PaymentStatus result = await paymentService.GetPaymentStatus(_instance, paymentConfiguration);

        // Assert
        result.Should().Be(PaymentStatus.Paid);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_Calls_ProcessNextStep_WhenNetsSaysPaymentIsCompleted()
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        OrderDetails orderDetails = CreateOrderDetails();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.OrderDetails = orderDetails;

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    _instance,
                    paymentInformation.PaymentDetails!.PaymentId,
                    orderDetails.TotalPriceIncVat,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((PaymentStatus.Paid, paymentInformation.PaymentDetails!))
            .Verifiable(Times.Once);

        _fixture.FakeHttpMessageHandler.RegisterEndpoint(
            HttpMethod.Put,
            $"/{_instance.AppId}/instances/{_instance.Id}/process/next",
            HttpStatusCode.OK,
            "application/json",
            "{}"
        );

        await using var sp = _fixture.BuildServiceProvider();

        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);

        // Act
        var paymentService = sp.GetRequiredService<IPaymentService>();
        await paymentService.HandlePaymentCompletedWebhook(
            _instance,
            paymentConfiguration,
            StorageAuthenticationMethod.ServiceOwner()
        );

        // Assert
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_NotCalls_ProcessNextStep_WhenProcessIsAdvanced()
    {
        // Arrange
        _instance.Process.CurrentTask = new ProcessElementInfo
        {
            AltinnTaskType = "someOtherTask", // Ensure that we are in the next task
            ElementId = "Task_2",
        };
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        OrderDetails orderDetails = CreateOrderDetails();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.OrderDetails = orderDetails;

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    _instance,
                    paymentInformation.PaymentDetails!.PaymentId,
                    orderDetails.TotalPriceIncVat,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((PaymentStatus.Paid, paymentInformation.PaymentDetails!))
            .Verifiable(Times.Once);

        // Disable the process/next endpoint to ensure it is not called
        // _fixture.FakeHttpMessageHandler.RegisterEndpoint(
        //     HttpMethod.Put,
        //     $"/{_instance.AppId}/instances/{_instance.Id}/process/next",
        //     HttpStatusCode.OK,
        //     "application/json",
        //     "{}"
        // );

        await using var sp = _fixture.BuildServiceProvider();

        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);

        // Act
        var paymentService = sp.GetRequiredService<IPaymentService>();
        await paymentService.HandlePaymentCompletedWebhook(
            _instance,
            paymentConfiguration,
            StorageAuthenticationMethod.ServiceOwner()
        );

        // Assert
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_NotCalls_ProcessNextStep_WhenProcessPaymentIsNotComplete()
    {
        // Arrange
        _instance.Process.CurrentTask = new ProcessElementInfo
        {
            AltinnTaskType = "someOtherTask", // Ensure that we are in the next task
            ElementId = "Task_2",
        };
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        OrderDetails orderDetails = CreateOrderDetails();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.OrderDetails = orderDetails;

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    _instance,
                    paymentInformation.PaymentDetails!.PaymentId,
                    orderDetails.TotalPriceIncVat,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((PaymentStatus.Created, paymentInformation.PaymentDetails!))
            .Verifiable(Times.Once);

        // Disable the process/next endpoint to ensure it is not called
        // _fixture.FakeHttpMessageHandler.RegisterEndpoint(
        //     HttpMethod.Put,
        //     $"/{_instance.AppId}/instances/{_instance.Id}/process/next",
        //     HttpStatusCode.OK,
        //     "application/json",
        //     "{}"
        // );

        await using var sp = _fixture.BuildServiceProvider();

        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);

        // Act
        var paymentService = sp.GetRequiredService<IPaymentService>();
        await paymentService.HandlePaymentCompletedWebhook(
            _instance,
            paymentConfiguration,
            StorageAuthenticationMethod.ServiceOwner()
        );

        // Assert
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_StoresPaymentInformation_WhenRequestIsCancelledAfterPaymentWasCreated()
    {
        // A payment that exists at the processor must always get its reference stored, or nothing could ever
        // terminate or verify it. The data service honours the token it is given, as the real client does.
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentDetails paymentDetails =
            CreatePaymentInformation().PaymentDetails
            ?? throw new NullReferenceException("PaymentDetails should not be null");
        using var cts = new CancellationTokenSource();

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language, cts.Token))
            .ReturnsAsync(() =>
            {
                cts.Cancel();
                return paymentDetails;
            })
            .Verifiable(Times.Once);
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.GetByType<PaymentInformation>(
                    _instance,
                    PaymentDataTypeId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    cts.Token
                )
            )
            .ReturnsAsync((Guid.Empty, null));
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    PaymentDataTypeId,
                    It.IsAny<PaymentInformation>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                (
                    InstanceIdentifier _,
                    string _,
                    object _,
                    StorageAuthenticationMethod? _,
                    CancellationToken cancellationToken
                ) =>
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    return Task.FromResult(new DataElement());
                }
            )
            .Verifiable(Times.Once);

        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        (PaymentInformation paymentInformation, bool alreadyPaid) = await paymentService.StartPayment(
            _instance,
            paymentConfiguration,
            Language,
            cts.Token
        );

        paymentInformation.Status.Should().Be(PaymentStatus.Created);
        paymentInformation.PaymentDetails.Should().BeSameAs(paymentDetails);
        alreadyPaid.Should().BeFalse();
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_DeletesStalePaymentInformation_WhenRequestIsCancelledAfterPaymentWasTerminated()
    {
        // Once the processor has terminated the earlier payment, its record must be deleted even if the request
        // ends right then; left behind, the next attempt would try to terminate the same payment again. The
        // cancellable work that follows the deletion still observes the cancellation.
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation stalePaymentInformation = CreatePaymentInformation();
        using var cts = new CancellationTokenSource();

        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.TerminatePayment(_instance, stalePaymentInformation, cts.Token))
            .ReturnsAsync(() =>
            {
                cts.Cancel();
                return true;
            })
            .Verifiable(Times.Once);
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.GetByType<PaymentInformation>(
                    _instance,
                    PaymentDataTypeId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    cts.Token
                )
            )
            .ReturnsAsync((Guid.NewGuid(), stalePaymentInformation));
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.DeleteById(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                (InstanceIdentifier _, Guid _, StorageAuthenticationMethod? _, CancellationToken cancellationToken) =>
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    return Task.FromResult(true);
                }
            )
            .Verifiable(Times.Once);
        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(c => c.CalculateOrderDetails(_instance, Language, cts.Token))
            .Returns(
                (Instance _, string? _, CancellationToken cancellationToken) =>
                    Task.FromCanceled<OrderDetails>(cancellationToken)
            )
            .Verifiable(Times.Once);

        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            paymentService.StartPayment(_instance, paymentConfiguration, Language, cts.Token)
        );
        _fixture.VerifyMocks();
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
            PaymentDataType = PaymentDataTypeId,
            PaymentReceiptPdfDataType = "paymentReceiptPdf",
        }.Validate();
    }
}
