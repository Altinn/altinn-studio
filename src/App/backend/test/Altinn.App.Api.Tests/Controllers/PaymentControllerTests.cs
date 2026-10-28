using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class PaymentControllerTests
{
    private static readonly Guid _instanceGuid = Guid.Parse("00000000-DEAD-FACE-BABE-000000000001");
    private const int PartyId = 123456;
    private readonly MockedServiceCollection _services = new();

    private readonly Instance _instance = new Instance()
    {
        Id = $"{PartyId}/{_instanceGuid}",
        InstanceOwner = new InstanceOwner() { PartyId = $"{PartyId}" },
        Process = new()
        {
            CurrentTask = new() { ElementId = "currentTask", AltinnTaskType = AltinnTaskTypes.Payment },
        },
    };

    private readonly NetsPaymentSettings _netsPaymentSettings = new()
    {
        BaseUrl = null!,
        TermsUrl = null!,
        SecretApiKey = "secure",
    };

    private readonly List<AppCode> _paymentsCallbackCodes = [];

    private readonly OrderDetails _orderDetails = new OrderDetails
    {
        PaymentProcessorId = "Nets Easy",
        OrderLines =
        [
            new()
            {
                Id = "line1",
                Name = "Product 1",
                Quantity = 1,
                Unit = "pcs",
                PriceExVat = 100,
                VatPercent = 25,
            },
        ],
        Receiver = new() { },
        Currency = "NOK",
    };

    public PaymentControllerTests(ITestOutputHelper outputHelper)
    {
        _services.OutputHelper = outputHelper;
        // Ensure common mocks that are dependencies of payment controller/service is registered
        _services.Mock<IProcessReader>();
        _services.Mock<IProcessEngine>();

        // Register tested services as singletons
        _services.Services.AddSingleton<IPaymentService, PaymentService>();
        _services.Services.AddSingleton<PaymentController>();

        _services.Services.AddSingleton(Options.Create(_netsPaymentSettings));
        _services.Services.Configure<AppCodesSettings>(s => s.PaymentsCallback = _paymentsCallbackCodes);
        _services.Services.AddSingleton<INetsWebhookSecretProvider, NetsWebhookSecretProvider>();

        // Add default instance to mocked storage
        _services.Storage.AddInstance(_instance);
        _services.Storage.AppMetadata.DataTypes.Add(
            new()
            {
                Id = "paymentDataType",
                AllowedContentTypes = new List<string> { "application/json" },
            }
        );
    }

    [Fact]
    public async Task GetPaymentInformation_NoCurrentTask_ReturnsBadRequest()
    {
        _instance.Process.CurrentTask = null;

        await using var sp = _services.BuildServiceProvider();

        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.GetPaymentInformation(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            CancellationToken.None
        );
        Assert.IsType<BadRequestObjectResult>(result);

        _services.VerifyMocks();
    }

    [Fact]
    public async Task GetPaymentInformation_TaskIsNotPaymentTask_ReturnsBadRequest()
    {
        SetupAltinnTaskExtensionMock("currentTask", null, Times.Once());
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.GetPaymentInformation(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            CancellationToken.None
        );
        Assert.IsType<BadRequestObjectResult>(result);
        _services.VerifyMocks();
    }

    [Fact]
    public async Task GetPaymentInformation_PaymentTaskWithoutPaymentInfo_DoesNotCreateNewPayment()
    {
        SetupAltinnTaskExtensionMock(
            "currentTask",
            new AltinnTaskExtension()
            {
                PaymentConfiguration = new()
                {
                    PaymentDataType = "paymentDataType",
                    PaymentReceiptPdfDataType = "paymentPdfDataType",
                },
            },
            Times.Once()
        );
        SetupOrderDetailsCalculatorMock(PartyId, _instanceGuid, _orderDetails, Times.Once());
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        // Act
        var result = await controller.GetPaymentInformation(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<OkObjectResult>(result);

        var (instance, _) = _services.Storage.GetInstanceAndData(PartyId, _instanceGuid);

        // Ensure that no payment object is created. Maybe it should?
        Assert.DoesNotContain(instance.Data, d => d.DataType == "paymentDataType");

        _services.VerifyMocks();
    }

    [Fact]
    public async Task GetOrderDetails_ReturnsCalculatedOrderDetails()
    {
        SetupOrderDetailsCalculatorMock(PartyId, _instanceGuid, _orderDetails, Times.Once());

        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();

        // Act
        var result = await controller.GetOrderDetails("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var actualOrderDetails = Assert.IsType<OrderDetails>(okResult.Value);
        Assert.Equal(_orderDetails.PaymentProcessorId, actualOrderDetails.PaymentProcessorId);
        Assert.Equal(_orderDetails.OrderLines.Count, actualOrderDetails.OrderLines.Count);
        Assert.Equal(_orderDetails.Currency, actualOrderDetails.Currency);

        _services.VerifyMocks();
    }

    [Fact]
    public async Task GetOrderDetails_NoOrderDetailsCalculatorRegistrerd_ThrowsException()
    {
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await controller.GetOrderDetails("org", "app", PartyId, _instanceGuid, CancellationToken.None)
        );

        Assert.Contains("IOrderDetailsCalculator", exception.Message);
    }

    /// <summary>
    /// Adds an <see cref="AppCode"/> to the <c>PaymentsCallback</c> rotation and returns the derived
    /// webhook secret that Nets would send back in the <c>Authorization</c> header for that code.
    /// </summary>
    /// <remarks>
    /// The controller under test does not compare against the raw <c>AppCode.Code</c> value. Nets Easy
    /// constrains the webhook <c>Authorization</c> value to 8-64 alphanumeric characters, and raw
    /// app-codes may contain characters outside that set, so <see cref="NetsWebhookSecretProvider"/>
    /// derives a SHA-256 hex string from the code. These tests mirror that derivation here so they can
    /// feed the controller a header value that actually matches what the production provider computes.
    /// If the production derivation changes, this must be updated too.
    /// </remarks>
    private string AddPaymentsCallbackCode(string code, string id = "code-1")
    {
        _paymentsCallbackCodes.Add(
            new AppCode
            {
                Id = id,
                Code = code,
                IssuedAt = DateTimeOffset.UtcNow,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
            }
        );
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code))).ToLowerInvariant();
    }

    [Fact]
    public async Task PaymentWebhookListener_NoPaymentsCallbackCodesConfigured_Throws()
    {
        // No codes added to _paymentsCallbackCodes — this is an app misconfiguration and should surface
        // as a thrown PaymentException (resulting in a 500), not be swallowed.
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await controller.PaymentWebhookListener(
                "org",
                "app",
                PartyId,
                _instanceGuid,
                new()
                {
                    Id = Guid.NewGuid().ToString(),
                    Data = new() { PaymentId = Guid.NewGuid().ToString() },
                    EventName = "PaymentCreated",
                    Timestamp = DateTime.UtcNow,
                    MerchantId = 222,
                },
                "somekey",
                CancellationToken.None
            )
        );
        Assert.Contains("AppCodes:PaymentsCallback is not configured", exception.Message);
        _services.VerifyMocks();
    }

    [Fact]
    public async Task PaymentWebhookListener_AuthorizationMatchesOlderRotatedCode_IsAccepted()
    {
        // Two codes in the rotation; webhook arrives signed with the older one (index 1).
        AddPaymentsCallbackCode("current-key", id: "current");
        var previousDerived = AddPaymentsCallbackCode("previous-key", id: "previous");

        SetupAltinnTaskExtensionMock(
            "currentTask",
            new AltinnTaskExtension() { PaymentConfiguration = null },
            Times.Once()
        );
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.PaymentWebhookListener(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Data = new() { PaymentId = Guid.NewGuid().ToString() },
                EventName = "PaymentCreated",
                Timestamp = DateTime.UtcNow,
                MerchantId = 222,
            },
            previousDerived,
            CancellationToken.None
        );
        // Reaching past the auth gate is sufficient — the not-a-payment-task path returns Ok.
        Assert.IsType<OkObjectResult>(result);
        _services.VerifyMocks();
    }

    [Fact]
    public async Task PaymentWebhookListener_InvalidAuthorization_ReturnsUnauthorized()
    {
        var wrongKey = "invalid";
        AddPaymentsCallbackCode("validkey");
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.PaymentWebhookListener(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Data = new() { PaymentId = Guid.NewGuid().ToString() },
                EventName = "PaymentCreated",
                Timestamp = DateTime.UtcNow,
                MerchantId = 222,
            },
            wrongKey,
            CancellationToken.None
        );
        Assert.IsType<UnauthorizedObjectResult>(result);
        _services.VerifyMocks();
    }

    [Fact]
    public async Task PaymentWebhookListener_ProcessHasEnded_ReturnsOk()
    {
        // Nets' other webhook for the payment, after the first one moved the process on from its last task.
        _instance.Process.CurrentTask = null;
        _instance.Process.Ended = DateTime.UtcNow;
        var callbackKey = AddPaymentsCallbackCode("validkey");

        await using var sp = _services.BuildServiceProvider();

        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.PaymentWebhookListener(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Data = new() { PaymentId = Guid.NewGuid().ToString() },
                EventName = "payment.charge.created.v2",
                Timestamp = DateTime.UtcNow,
                MerchantId = 222,
            },
            callbackKey,
            CancellationToken.None
        );
        // Anything else makes Nets call again for days.
        var response = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("has ended", Assert.IsType<ProblemDetails>(response.Value).Detail);

        _services.VerifyMocks();
    }

    [Fact]
    public async Task PaymentWebhookListener_TaskIsNotPaymentTask_ReturnsOkRequest()
    {
        var callbackKey = AddPaymentsCallbackCode("validkey");
        SetupAltinnTaskExtensionMock(
            "currentTask",
            new AltinnTaskExtension() { PaymentConfiguration = null },
            Times.Once()
        );
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.PaymentWebhookListener(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Data = new() { PaymentId = Guid.NewGuid().ToString() },
                EventName = "PaymentCreated",
                Timestamp = DateTime.UtcNow,
                MerchantId = 222,
            },
            callbackKey,
            CancellationToken.None
        );
        var response = Assert.IsType<OkObjectResult>(result);
        var responseString = JsonSerializer.Serialize(response.Value);
        Assert.Contains("Payment configuration not found", responseString);
        _services.VerifyMocks();
    }

    [Fact]
    public async Task PaymentWebhookListener_ValidRequestWithPaymentInfo_ReturnsOkRequest()
    {
        var callbackKey = AddPaymentsCallbackCode("validkey");
        SetupAltinnTaskExtensionMock(
            "currentTask",
            new AltinnTaskExtension()
            {
                PaymentConfiguration = new()
                {
                    PaymentDataType = "paymentDataType",
                    PaymentReceiptPdfDataType = "paymentPdfDataType",
                },
            },
            Times.Once()
        );

        _services
            .Mock<IPaymentProcessor>()
            .SetupGet(pp => pp.PaymentProcessorId)
            .Returns("Nets Easy")
            .Verifiable(Times.AtLeastOnce());

        _services
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((PaymentStatus.Paid, new PaymentDetails { PaymentId = "some-payment-id" }))
            .Verifiable(Times.Once());

        _services.Storage.AddData(
            _instance,
            "paymentDataType",
            "application/json",
            JsonSerializer.SerializeToUtf8Bytes(
                new PaymentInformation()
                {
                    TaskId = "currentTask",
                    Status = PaymentStatus.Created,
                    OrderDetails = _orderDetails,
                    PaymentDetails = new PaymentDetails { PaymentId = "some-payment-id" },
                }
            )
        );

        // A paid payment moves the process on in the app itself, as the service owner
        _services
            .Mock<IProcessEngine>()
            .Setup(engine =>
                engine.EnqueueNextForApp(
                    It.Is<Instance>(instance => instance.Id == _instance.Id),
                    It.IsAny<StorageVersionMetadata>(),
                    "confirm",
                    It.Is<Actor>(actor => actor.OrgId != null && actor.UserId == null),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new ProcessChangeResult { Success = true, ProcessStateChange = new ProcessStateChange() })
            .Verifiable(Times.Once());

        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.PaymentWebhookListener(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Data = new() { PaymentId = Guid.NewGuid().ToString() },
                EventName = "PaymentCreated",
                Timestamp = DateTime.UtcNow,
                MerchantId = 222,
            },
            callbackKey,
            CancellationToken.None
        );
        var response = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("Payment status is Paid for instance 12345", response.Value?.ToString());
        _services.VerifyMocks();
    }

    [Fact]
    public async Task PaymentWebhookListener_ValidRequestWithoutPaymentInfo_ReturnsOkRequest()
    {
        var callbackKey = AddPaymentsCallbackCode("validkey");
        SetupAltinnTaskExtensionMock(
            "currentTask",
            new AltinnTaskExtension()
            {
                PaymentConfiguration = new()
                {
                    PaymentDataType = "paymentDataType",
                    PaymentReceiptPdfDataType = "paymentPdfDataType",
                },
            },
            Times.Once()
        );
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.PaymentWebhookListener(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Data = new() { PaymentId = Guid.NewGuid().ToString() },
                EventName = "PaymentCreated",
                Timestamp = DateTime.UtcNow,
                MerchantId = 222,
            },
            callbackKey,
            CancellationToken.None
        );
        var response = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("No payment information stored yet for instance", response.Value?.ToString());
        _services.VerifyMocks();
    }

    [Fact]
    public void Constructor_NetsWebhookSecretProviderNotRegistered_DoesNotThrow()
    {
        var services = new MockedServiceCollection();
        services.Mock<IProcessReader>();
        services.Mock<IProcessEngine>();
        services.Services.AddSingleton<IPaymentService, PaymentService>();
        services.Services.AddSingleton<PaymentController>();
        // Deliberately not registering INetsWebhookSecretProvider
        services.Storage.AddInstance(_instance);

        using var sp = services.BuildServiceProvider();

        // Must not throw — the controller should be constructable without Nets configured
        var controller = sp.GetRequiredService<PaymentController>();
        Assert.NotNull(controller);
    }

    [Fact]
    public async Task PaymentWebhookListener_NetsNotConfigured_ThrowsPaymentException()
    {
        var services = new MockedServiceCollection();
        services.Mock<IProcessReader>();
        services.Mock<IProcessEngine>();
        services.Services.AddSingleton<IPaymentService, PaymentService>();
        services.Services.AddSingleton<PaymentController>();
        // Deliberately not registering INetsWebhookSecretProvider
        services.Storage.AddInstance(_instance);

        await using var sp = services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();

        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await controller.PaymentWebhookListener(
                "org",
                "app",
                PartyId,
                _instanceGuid,
                new()
                {
                    Id = Guid.NewGuid().ToString(),
                    Data = new() { PaymentId = Guid.NewGuid().ToString() },
                    EventName = "PaymentCreated",
                    Timestamp = DateTime.UtcNow,
                    MerchantId = 222,
                },
                "somekey",
                CancellationToken.None
            )
        );
        Assert.Contains("INetsWebhookSecretProvider", exception.Message);
    }

    private void SetupAltinnTaskExtensionMock(string taskId, AltinnTaskExtension? taskExtension, Times times)
    {
        _services
            .Mock<IProcessReader>()
            .Setup(pr => pr.GetAltinnTaskExtension(taskId))
            .Returns(taskExtension)
            .Verifiable(times);
    }

    private void SetupOrderDetailsCalculatorMock(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        OrderDetails orderDetails,
        Times times
    )
    {
        var instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
        _services
            .Mock<IOrderDetailsCalculator>()
            .Setup(odc =>
                odc.CalculateOrderDetails(
                    It.Is<Instance>(i => i.Id == instanceId),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(orderDetails)
            .Verifiable(times);
    }
}
