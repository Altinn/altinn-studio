using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;
using Altinn.App.Core.Internal.Language;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Features.Payment.Providers.Nets;

public class NetsPaymentProcessorTests
{
    private readonly Mock<INetsClient> _netsClientMock;
    private readonly IOptions<NetsPaymentSettings> _settings;
    private readonly IOptions<GeneralSettings> _generalSettings;
    private readonly NetsPaymentProcessor _processor;

    public NetsPaymentProcessorTests()
    {
        _netsClientMock = new Mock<INetsClient>();
        _settings = Microsoft.Extensions.Options.Options.Create(
            new NetsPaymentSettings
            {
                SecretApiKey = "secret",
                BaseUrl = "baseUrl",
                TermsUrl = "termsUrl",
                PaymentMethodsConfiguration =
                [
                    new NetsPaymentSettings.PaymentMethodConfigurationItem { Name = "Card", Enabled = true },
                ],
            }
        );
        _generalSettings = Microsoft.Extensions.Options.Options.Create(new GeneralSettings());
        _processor = new NetsPaymentProcessor(_netsClientMock.Object, _settings, _generalSettings);
    }

    [Fact]
    public async Task StartPayment_WithValidOrderDetails_ReturnsPaymentInformation()
    {
        // Arrange
        Instance instance = CreateInstance();
        var orderDetails = new OrderDetails
        {
            PaymentProcessorId = "paymentProcessorId",
            Currency = "NOK",
            OrderLines = [],
            Receiver = new PaymentReceiver(),
        };

        NetsCreatePayment? capturedNetsCreatePayment = null;
        _netsClientMock
            .Setup(x => x.CreatePayment(It.IsAny<NetsCreatePayment>()))
            .Callback<NetsCreatePayment>(payment => capturedNetsCreatePayment = payment)
            .ReturnsAsync(
                new HttpApiResult<NetsCreatePaymentSuccess>
                {
                    Result = new NetsCreatePaymentSuccess
                    {
                        HostedPaymentPageUrl = "https://payment-url.com",
                        PaymentId = "12345",
                    },
                }
            );

        // Act
        PaymentDetails result = await _processor.StartPayment(instance, orderDetails, LanguageConst.Nb);

        // Assert
        result.Should().NotBeNull();
        result.PaymentId.Should().Be("12345");
        result.RedirectUrl.Should().Be("https://payment-url.com?language=nb-NO");

        capturedNetsCreatePayment.Should().NotBeNull();
        capturedNetsCreatePayment
            ?.PaymentMethodsConfiguration.Should()
            .BeEquivalentTo(_settings.Value.PaymentMethodsConfiguration);
    }

    [Fact]
    public async Task StartPayment_WithValidInstanceAndOrderDetails_ReturnsPaymentInformation()
    {
        // Arrange
        Instance instance = CreateInstance();
        var orderDetails = new OrderDetails
        {
            PaymentProcessorId = "paymentProcessorId",
            Currency = "NOK",
            OrderLines =
            [
                new PaymentOrderLine()
                {
                    Id = "1",
                    Name = "Item 1",
                    Quantity = 1,
                    PriceExVat = 100,
                    VatPercent = 25M,
                },
                new PaymentOrderLine()
                {
                    Id = "2",
                    Name = "Item 2",
                    Quantity = 2,
                    PriceExVat = 200,
                    VatPercent = 25M,
                },
            ],
            Receiver = new PaymentReceiver(),
        };

        int expectedSum = orderDetails.OrderLines.Sum(x =>
            (int)(x.PriceExVat * 100 * x.Quantity * (1 + (x.VatPercent / 100)))
        );

        _netsClientMock
            .Setup(x => x.CreatePayment(It.IsAny<NetsCreatePayment>()))
            .ReturnsAsync(
                new HttpApiResult<NetsCreatePaymentSuccess>
                {
                    Result = new NetsCreatePaymentSuccess
                    {
                        HostedPaymentPageUrl = "https://payment-url.com",
                        PaymentId = "12345",
                    },
                }
            );

        // Act
        PaymentDetails result = await _processor.StartPayment(instance, orderDetails, LanguageConst.Nb);

        // Assert
        result.Should().NotBeNull();
        result.PaymentId.Should().Be("12345");
        result.RedirectUrl.Should().Be("https://payment-url.com?language=nb-NO");

        _netsClientMock.Verify(
            x =>
                x.CreatePayment(
                    It.Is<NetsCreatePayment>(netsCreatePayment => netsCreatePayment.Order.Amount == expectedSum)
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task StartPayment_WithInvalidOrderDetails_ThrowsPaymentException()
    {
        // Arrange
        Instance instance = CreateInstance();
        var orderDetails = new OrderDetails
        {
            PaymentProcessorId = "paymentProcessorId",
            Currency = "NOK",
            OrderLines = [],
            Receiver = new PaymentReceiver(),
        };

        _netsClientMock
            .Setup(x => x.CreatePayment(It.IsAny<NetsCreatePayment>()))
            .ReturnsAsync(new HttpApiResult<NetsCreatePaymentSuccess>());

        // Act & Assert
        await Assert.ThrowsAsync<PaymentException>(() => _processor.StartPayment(instance, orderDetails, null));
    }

    [Fact]
    public async Task CancelPayment_WithValidPaymentReference_CallsNetsClientCancelPayment()
    {
        // Arrange
        Instance instance = CreateInstance();
        PaymentInformation paymentInformation = new()
        {
            TaskId = "taskId",
            Status = PaymentStatus.Created,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Currency = "NOK",
                OrderReference = "orderReference",
                OrderLines =
                [
                    new PaymentOrderLine
                    {
                        Id = "1",
                        Name = "Item 1",
                        PriceExVat = 500,
                        VatPercent = 25,
                    },
                ],
                Receiver = new PaymentReceiver(),
            },
            PaymentDetails = new PaymentDetails { PaymentId = "paymentReference", RedirectUrl = "redirectUrl" },
        };

        _netsClientMock.Setup(x => x.TerminatePayment(paymentInformation.PaymentDetails.PaymentId)).ReturnsAsync(true);

        // Act
        await _processor.TerminatePayment(instance, paymentInformation);

        // Assert
        _netsClientMock.Verify(x => x.TerminatePayment(paymentInformation.PaymentDetails.PaymentId), Times.Once);
    }

    [Fact]
    public async Task GetPaymentStatus_WithValidPaymentReferenceAndExpectedTotal_ReturnsPaymentStatus()
    {
        // Arrange
        Instance instance = CreateInstance();
        const string paymentReference = "12345";
        const decimal expectedTotalIncVat = 100;
        string language = LanguageConst.Nb;

        _netsClientMock
            .Setup(x => x.RetrievePayment(paymentReference))
            .ReturnsAsync(
                new HttpApiResult<NetsPaymentFull>
                {
                    Result = new NetsPaymentFull
                    {
                        Payment = new NetsPayment
                        {
                            Summary = new NetsSummary
                            {
                                // All amounts sent to and received from Nets are in the lowest monetary unit for the given currency, without punctuation marks.
                                ChargedAmount = expectedTotalIncVat * 100,
                            },
                            Checkout = new() { Url = "https://redirect-url.com", CancelUrl = "https://cancel-url.com" },
                        },
                    },
                }
            );

        // Act
        (PaymentStatus result, PaymentDetails paymentDetails) = await _processor.GetPaymentStatus(
            instance,
            paymentReference,
            expectedTotalIncVat,
            language
        );

        // Assert
        result.Should().Be(PaymentStatus.Paid);
        paymentDetails.RedirectUrl.Should().Contain("language=nb-NO");
    }

    [Fact]
    public async Task GetPaymentStatus_WithInvalidPaymentReference_ThrowsPaymentException()
    {
        // Arrange
        Instance instance = CreateInstance();
        const string paymentReference = "12345";
        const decimal expectedTotalIncVat = 100;

        _netsClientMock
            .Setup(x => x.RetrievePayment(paymentReference))
            .ReturnsAsync(new HttpApiResult<NetsPaymentFull>());

        // Act & Assert
        await Assert.ThrowsAsync<PaymentException>(() =>
            _processor.GetPaymentStatus(instance, paymentReference, expectedTotalIncVat, null)
        );
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
}
