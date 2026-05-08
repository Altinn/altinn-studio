using System.Net;
using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Features.Payment.Providers.Nets;

public class NetsPaymentProcessorTests
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new JsonSerializerOptions(
        JsonSerializerDefaults.Web
    );
    private readonly MockedServiceCollection _fixture = new();

    private readonly NetsPaymentSettings _netsPaymentSettings = new NetsPaymentSettings
    {
        SecretApiKey = "secret",
        BaseUrl = "https://api.nets.eu",
        TermsUrl = "termsUrl",
        PaymentMethodsConfiguration =
        [
            new NetsPaymentSettings.PaymentMethodConfigurationItem { Name = "Card", Enabled = true },
        ],
    };

    public NetsPaymentProcessorTests(ITestOutputHelper outputHelper)
    {
        _fixture.OutputHelper = outputHelper;
        _fixture.Services.AddSingleton(Microsoft.Extensions.Options.Options.Create(_netsPaymentSettings));
        _fixture.Services.Configure<AppCodesSettings>(s =>
            s.PaymentsCallback = [
                new AppCode
                {
                    Id = "code-1",
                    Code = "SECRET-webhookCallbackKey",
                    IssuedAt = DateTimeOffset.UtcNow,
                    ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
                },
            ]
        );
        _fixture.Services.AddSingleton<INetsWebhookSecretProvider, NetsWebhookSecretProvider>();
        _fixture.Services.AddHttpClient<INetsClient, NetsClient>();
        var hostEnv = new Mock<IHostEnvironment>();
        hostEnv.Setup(e => e.EnvironmentName).Returns(Environments.Production);
        _fixture.Services.AddSingleton(hostEnv.Object);
        _fixture.Services.AddScoped<NetsPaymentProcessor>();
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

        _fixture.FakeHttpMessageHandler.RegisterEndpoint(
            HttpMethod.Post,
            "https://api.nets.eu/v1/payments",
            HttpStatusCode.OK,
            "application/json",
            JsonSerializer.Serialize(
                new NetsCreatePaymentSuccess { HostedPaymentPageUrl = "https://payment-url.com", PaymentId = "12345" }
            )
        );
        // Act
        await using var serviceProvider = _fixture.BuildServiceProvider();
        var processor = serviceProvider.GetRequiredService<NetsPaymentProcessor>();
        PaymentDetails result = await processor.StartPayment(instance, orderDetails, LanguageConst.Nb);

        // Assert
        result.Should().NotBeNull();
        result.PaymentId.Should().Be("12345");
        result.RedirectUrl.Should().Be("https://payment-url.com?language=nb-NO");

        Assert.Single(_fixture.FakeHttpMessageHandler.RequestResponses);
        var request = _fixture.FakeHttpMessageHandler.RequestResponses.First();
        Assert.NotNull(request.RequestContent);
        var capturedNetsCreatePayment = JsonSerializer.Deserialize<NetsCreatePayment>(
            request.RequestContent,
            _jsonSerializerOptions
        );
        Assert.NotNull(capturedNetsCreatePayment);
        Assert.Equivalent(
            _netsPaymentSettings.PaymentMethodsConfiguration,
            capturedNetsCreatePayment.PaymentMethodsConfiguration
        );
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
        _fixture.FakeHttpMessageHandler.RegisterJsonEndpoint(
            HttpMethod.Post,
            "https://api.nets.eu/v1/payments",
            new NetsCreatePaymentSuccess { HostedPaymentPageUrl = "https://payment-url.com", PaymentId = "12345" }
        );

        // Act
        await using var serviceProvider = _fixture.BuildServiceProvider();
        var processor = serviceProvider.GetRequiredService<NetsPaymentProcessor>();
        PaymentDetails result = await processor.StartPayment(instance, orderDetails, LanguageConst.Nb);

        // Assert
        result.Should().NotBeNull();
        result.PaymentId.Should().Be("12345");
        result.RedirectUrl.Should().Be("https://payment-url.com?language=nb-NO");

        Assert.Single(_fixture.FakeHttpMessageHandler.RequestResponses);
        var request = _fixture.FakeHttpMessageHandler.RequestResponses.First();
        Assert.NotNull(request.RequestContent);
        var capturedNetsCreatePayment = JsonSerializer.Deserialize<NetsCreatePayment>(
            request.RequestContent,
            _jsonSerializerOptions
        );
        Assert.NotNull(capturedNetsCreatePayment);
        Assert.Equal(expectedSum, capturedNetsCreatePayment.Order.Amount);

        _fixture.VerifyMocks();
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

        _fixture.FakeHttpMessageHandler.RegisterEndpoint(
            HttpMethod.Post,
            "https://api.nets.eu/v1/payments",
            HttpStatusCode.OK,
            "application/json",
            "{}"
        );

        // Act & Assert
        using var serviceProvider = _fixture.BuildServiceProvider();
        var processor = serviceProvider.GetRequiredService<NetsPaymentProcessor>();
        await Assert.ThrowsAsync<PaymentException>(() => processor.StartPayment(instance, orderDetails, null));
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

        _fixture.FakeHttpMessageHandler.RegisterJsonEndpoint(
            HttpMethod.Put,
            "https://api.nets.eu/v1/payments/paymentReference/terminate",
            "true"
        );

        // Act
        await using var serviceProvider = _fixture.BuildServiceProvider();
        var processor = serviceProvider.GetRequiredService<NetsPaymentProcessor>();
        await processor.TerminatePayment(instance, paymentInformation);

        // Assert
        _fixture.VerifyMocks();
        Assert.Single(_fixture.FakeHttpMessageHandler.RequestResponses);
        var request = _fixture.FakeHttpMessageHandler.RequestResponses.First();
        Assert.Equal(HttpMethod.Put, request.RequestMethod);
        Assert.Equal("https://api.nets.eu/v1/payments/paymentReference/terminate", request.RequestUrl?.ToString());
    }

    [Fact]
    public async Task GetPaymentStatus_WithValidPaymentReferenceAndExpectedTotal_ReturnsPaymentStatus()
    {
        // Arrange
        Instance instance = CreateInstance();
        const string paymentReference = "12345";
        const decimal expectedTotalIncVat = 100;
        string language = LanguageConst.Nb;

        _fixture.FakeHttpMessageHandler.RegisterJsonEndpoint(
            HttpMethod.Get,
            $"https://api.nets.eu/v1/payments/{paymentReference}",
            new NetsPaymentFull
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
            }
        );

        // Act
        await using var serviceProvider = _fixture.BuildServiceProvider();
        var processor = serviceProvider.GetRequiredService<NetsPaymentProcessor>();
        (PaymentStatus result, PaymentDetails paymentDetails) = await processor.GetPaymentStatus(
            instance,
            paymentReference,
            expectedTotalIncVat,
            language
        );

        // Assert
        result.Should().Be(PaymentStatus.Paid);
        paymentDetails.RedirectUrl.Should().Contain("language=nb-NO");
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task GetPaymentStatus_WithInvalidPaymentReference_ThrowsPaymentException()
    {
        // Arrange
        Instance instance = CreateInstance();
        const string paymentReference = "12345";
        const decimal expectedTotalIncVat = 100;

        _fixture.FakeHttpMessageHandler.RegisterEndpoint(
            HttpMethod.Get,
            $"https://api.nets.eu/v1/payments/{paymentReference}",
            HttpStatusCode.NotFound,
            "application/problem+json",
            "{}"
        );

        // Act & Assert
        await using var serviceProvider = _fixture.BuildServiceProvider();
        var processor = serviceProvider.GetRequiredService<NetsPaymentProcessor>();
        await Assert.ThrowsAsync<PaymentException>(() =>
            processor.GetPaymentStatus(instance, paymentReference, expectedTotalIncVat, null)
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
                CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = "Task_1" },
            },
        };
    }
}
