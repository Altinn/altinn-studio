using System.Net;
using System.Security.Claims;
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
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
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
        RegisterWorkflowEngine(_services);

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
    public async Task GetPaymentInformation_WithoutARecord_ReturnsUninitializedWithTheOrderDetails_AndStoresNothing()
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
        var payment = Assert.IsType<PaymentInformation>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(PaymentStatus.Uninitialized, payment.Status);
        Assert.Equal(_orderDetails.PaymentProcessorId, payment.OrderDetails.PaymentProcessorId);

        var (instance, _) = _services.Storage.GetInstanceAndData(PartyId, _instanceGuid);
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
                mailboxId: null,
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

        SetupPaymentTasks();
        await using var sp = _services.BuildServiceProvider();
        var controller = sp.GetRequiredService<PaymentController>();
        var result = await controller.PaymentWebhookListener(
            "org",
            "app",
            PartyId,
            _instanceGuid,
            mailboxId: null,
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
        // Reaching past the auth gate is sufficient: no payment attempt holds the payment, so it answers Ok.
        Assert.IsType<OkResult>(result);
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
            mailboxId: null,
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
    public async Task PaymentWebhookListener_WithAMailboxId_ForwardsTheEventUnderItsIdWithoutReadingStorage()
    {
        string callbackKey = AddPaymentsCallbackCode("validkey");
        _services.Mock<IInstanceClient>();
        SetupMailboxOfInstance(true);
        MailboxDeliveryRequest? delivered = null;
        _services
            .Mock<IWorkflowEngineClient>()
            .Setup(c =>
                c.DeliverToMailbox(
                    $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
                    _mailboxId,
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, Guid, MailboxDeliveryRequest, CancellationToken>(
                (_, _, request, _) => delivered = request
            )
            .ReturnsAsync(
                new MailboxDeliveryResult(
                    HttpStatusCode.Accepted,
                    new MailboxDeliveryResponse
                    {
                        MailboxId = _mailboxId,
                        Idx = 0,
                        IdempotencyKey = "nets-event-id",
                        AcceptedAt = DateTimeOffset.UtcNow,
                    },
                    ErrorDetail: null
                )
            );
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await PostWebhook(sp, "payment.checkout.completed", _mailboxId, callbackKey);

        Assert.IsType<OkResult>(result);
        Assert.Equal("nets-event-id", delivered?.IdempotencyKey);
        MailboxDelivery opened = sp.GetRequiredService<MailboxDeliveryEnvelope>()
            .Unwrap(
                delivered!.Payload,
                _mailboxId,
                PipelineId.ActionPipeline(AltinnTaskTypes.Payment, "pay"),
                "nets-event-id"
            );
        Assert.Equal(PaymentAttemptMessage.NetsEvent("payment.checkout.completed"), opened.Body);
        Assert.Null(opened.Sender);
    }

    // An event after the attempt ended is an error only when it says that a payment went through which the stored
    // payment does not show as paid.
    [Theory]
    [InlineData("payment.checkout.completed", PaymentStatus.Created, LogLevel.Error)]
    [InlineData("payment.charge.created.v2", PaymentStatus.Cancelled, LogLevel.Error)]
    [InlineData("payment.charge.created.v2", null, LogLevel.Error)]
    [InlineData("payment.charge.created.v2", PaymentStatus.Paid, LogLevel.Information)]
    [InlineData("payment.charge.failed", PaymentStatus.Created, LogLevel.Information)]
    public async Task PaymentWebhookListener_ToAClosedMailbox_AnswersOkAndLogsByWhatTheRecordShows(
        string eventName,
        PaymentStatus? recordStatus,
        LogLevel logLevel
    )
    {
        string callbackKey = AddPaymentsCallbackCode("validkey");
        SetupMailboxOfInstance(true);
        SetupDelivery(HttpStatusCode.Conflict);
        SetupPaymentTasks();
        if (recordStatus is { } status)
        {
            StorePaymentInformation(status, _mailboxId);
        }
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await PostWebhook(sp, eventName, _mailboxId, callbackKey);

        Assert.IsType<OkResult>(result);
        Assert.Equal(logLevel, GetEventLogLevel(sp, "reached no open payment attempt"));
    }

    [Fact]
    public async Task PaymentWebhookListener_ToAMailboxThatIsNotTheInstances_AnswersOkAndLogsAnErrorWithoutForwarding()
    {
        string callbackKey = AddPaymentsCallbackCode("validkey");
        _services.Mock<IInstanceClient>();
        SetupMailboxOfInstance(false);
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await PostWebhook(sp, "payment.checkout.completed", _mailboxId, callbackKey);

        Assert.IsType<OkResult>(result);
        Assert.Equal(LogLevel.Error, GetEventLogLevel(sp, "Dropped Nets event"));
        _services.Mock<IWorkflowEngineClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task PaymentWebhookListener_WhenTheWorkflowEngineIsUnavailable_FailsSoNetsCallsAgain()
    {
        string callbackKey = AddPaymentsCallbackCode("validkey");
        SetupMailboxOfInstance(true);
        SetupDelivery(HttpStatusCode.ServiceUnavailable);
        await using var sp = _services.BuildServiceProvider();

        var exception = await Assert.ThrowsAsync<ServiceTaskReplyForwardException>(() =>
            PostWebhook(sp, "payment.checkout.completed", _mailboxId, callbackKey)
        );
        Assert.Equal(ServiceTaskReplyForwardOutcome.EngineUnavailable, exception.Outcome);
    }

    // A payment created without a mailbox id that no attempt holds is logged by the same rule as an event after the
    // attempt ended.
    [Theory]
    [InlineData("payment.checkout.completed", PaymentStatus.Created, LogLevel.Error)]
    [InlineData("payment.charge.created.v2", PaymentStatus.Paid, LogLevel.Information)]
    public async Task PaymentWebhookListener_WithoutAMailboxId_ForPaymentNoAttemptHolds_LogsByWhatTheRecordShowsWithoutForwarding(
        string eventName,
        PaymentStatus recordStatus,
        LogLevel logLevel
    )
    {
        string callbackKey = AddPaymentsCallbackCode("validkey");
        _services.Mock<IWorkflowEngineClient>();
        SetupPaymentTasks();
        StorePaymentInformation(recordStatus, mailboxId: null);
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await PostWebhook(sp, eventName, mailboxId: null, callbackKey);

        Assert.IsType<OkResult>(result);
        Assert.Equal(logLevel, GetEventLogLevel(sp, "reached no open payment attempt"));
        _services.Mock<IWorkflowEngineClient>().VerifyNoOtherCalls();
    }

    // How cancel and check answer a message the attempt's mailbox did not take while the attempt is open.
    [Theory]
    [InlineData(
        ServiceTaskReplyForwardOutcome.MailboxFull,
        StatusCodes.Status409Conflict,
        "payment-attempt-message-limit"
    )]
    [InlineData(
        ServiceTaskReplyForwardOutcome.PayloadTooLarge,
        StatusCodes.Status409Conflict,
        "payment-attempt-message-limit"
    )]
    [InlineData(
        ServiceTaskReplyForwardOutcome.Rejected,
        StatusCodes.Status409Conflict,
        "payment-attempt-message-limit"
    )]
    [InlineData(
        ServiceTaskReplyForwardOutcome.EngineUnavailable,
        StatusCodes.Status503ServiceUnavailable,
        "workflow-engine-unavailable"
    )]
    [InlineData(
        ServiceTaskReplyForwardOutcome.SigningUnavailable,
        StatusCodes.Status503ServiceUnavailable,
        "workflow-engine-unavailable"
    )]
    public async Task CancelPaymentAttempt_MessageTheMailboxDidNotTake_AnswersByWhy(
        ServiceTaskReplyForwardOutcome outcome,
        int statusCode,
        string? problemType
    )
    {
        PrepareOpenAttempt();
        _services
            .Mock<IProcessEngine>()
            .Setup(engine =>
                engine.SendToActionPipeline(
                    It.IsAny<Instance>(),
                    _mailboxId,
                    PaymentAttemptMessage.Cancel,
                    "cancel",
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new ServiceTaskReplyForwardException(outcome, _mailboxId, "cancel", "Not taken."));
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await CreateController(sp)
            .CancelPaymentAttempt("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        Assert.Equal(statusCode, GetStatusCode(result));
        Assert.Equal(problemType, (GetValue(result) as ProblemDetails)?.Type);
    }

    [Fact]
    public async Task CheckPaymentAttempt_SendsTheStatusItFound_KeyedOnThatStatus()
    {
        PrepareOpenAttempt();
        AllowAction("pay");
        _services.Mock<IPaymentProcessor>().Setup(p => p.PaymentProcessorId).Returns("Nets Easy");
        _services
            .Mock<IPaymentProcessor>()
            .Setup(p =>
                p.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    "some-payment-id",
                    It.IsAny<decimal>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((PaymentStatus.Paid, new PaymentDetails { PaymentId = "some-payment-id" }));
        SetupAttemptHoldsTheTask(true);
        _services
            .Mock<IProcessEngine>()
            .Setup(engine =>
                engine.SendToActionPipeline(
                    It.IsAny<Instance>(),
                    _mailboxId,
                    PaymentAttemptMessage.Check,
                    "check:Paid",
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new ActionPipelineOutcome.Open(new InstanceWithStorageMetadata(_instance, StorageVersionMetadata.Empty))
            )
            .Verifiable(Times.Once());
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await CreateController(sp)
            .CheckPaymentAttempt("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        Assert.Equal(StatusCodes.Status200OK, GetStatusCode(result));
        _services.Mock<IProcessEngine>().Verify();
    }

    [Theory]
    [InlineData(WorkflowFailureKind.Timeout, StatusCodes.Status504GatewayTimeout)]
    [InlineData(WorkflowFailureKind.StepFailed, StatusCodes.Status500InternalServerError)]
    public async Task CancelPaymentAttempt_ThatTheAttemptFailedToHandle_AnswersTheWorkflowFailure(
        WorkflowFailureKind kind,
        int statusCode
    )
    {
        PrepareOpenAttempt();
        _services
            .Mock<IProcessEngine>()
            .Setup(engine =>
                engine.SendToActionPipeline(
                    It.IsAny<Instance>(),
                    _mailboxId,
                    PaymentAttemptMessage.Cancel,
                    "cancel",
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new ActionPipelineOutcome.Refused(
                    new ProcessChangeResult
                    {
                        Success = false,
                        ErrorType = ProcessErrorType.Internal,
                        WorkflowFailure = new WorkflowFailure { Kind = kind },
                    }
                )
            );
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await CreateController(sp)
            .CancelPaymentAttempt("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        Assert.Equal(statusCode, GetStatusCode(result));
        var problem = Assert.IsType<ProblemDetails>(GetValue(result));
        Assert.Equal(kind, Assert.IsType<WorkflowFailure>(problem.Extensions["workflowFailure"]).Kind);
        Assert.Equal("Something went wrong while the payment attempt handled the request.", problem.Title);
    }

    [Fact]
    public async Task CheckPaymentAttempt_WhenTheEngineCannotTellWhetherAnAttemptHoldsTheTask_AnswersServiceUnavailable()
    {
        PrepareOpenAttempt();
        AllowAction("pay");
        _services
            .Mock<IWorkflowEngineService>()
            .Setup(service => service.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("No route to the engine.", null, HttpStatusCode.BadGateway));
        _services.Mock<IPaymentProcessor>();
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await CreateController(sp)
            .CheckPaymentAttempt("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, GetStatusCode(result));
        Assert.Equal("workflow-engine-unavailable", (GetValue(result) as ProblemDetails)?.Type);
        _services.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CheckPaymentAttempt_OnAnIdleTask_ReturnsTheStoredRecordWithoutAskingTheEngine()
    {
        PrepareOpenAttempt();
        _instance.Process.Status = null;
        AllowAction("pay");
        _services
            .Mock<IWorkflowEngineService>()
            .Setup(service => service.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("No route to the engine.", null, HttpStatusCode.BadGateway));
        _services.Mock<IPaymentProcessor>();
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await CreateController(sp)
            .CheckPaymentAttempt("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        Assert.Equal(StatusCodes.Status200OK, GetStatusCode(result));
        Assert.Equal(PaymentStatus.Created, Assert.IsType<PaymentInformation>(GetValue(result)).Status);
        _services.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CancelPaymentAttempt_WhenTheEngineCannotBeReached_AnswersServiceUnavailable()
    {
        PrepareOpenAttempt();
        _services
            .Mock<IProcessEngine>()
            .Setup(engine =>
                engine.SendToActionPipeline(
                    It.IsAny<Instance>(),
                    _mailboxId,
                    PaymentAttemptMessage.Cancel,
                    "cancel",
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("No route to the engine.", null, HttpStatusCode.BadGateway));
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await CreateController(sp)
            .CancelPaymentAttempt("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, GetStatusCode(result));
        Assert.Equal("workflow-engine-unavailable", (GetValue(result) as ProblemDetails)?.Type);
    }

    // While the instance is processing, a check asks only when a payment attempt holds the task, as awaitingMessages
    // tells: not while the attempt's transition, release or a new attempt's opening stage runs.
    [Fact]
    public async Task CheckPaymentAttempt_WhenNoAttemptHoldsTheTask_AsksNothingAndSendsNothing()
    {
        PrepareOpenAttempt();
        AllowAction("pay");
        SetupAttemptHoldsTheTask(false);
        _services.Mock<IPaymentProcessor>();
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await CreateController(sp)
            .CheckPaymentAttempt("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        Assert.Equal(StatusCodes.Status200OK, GetStatusCode(result));
        Assert.Equal(PaymentStatus.Created, Assert.IsType<PaymentInformation>(GetValue(result)).Status);
        _services.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
        _services.Mock<IProcessEngine>().VerifyNoOtherCalls();
    }

    // A cancel answers from the payment stored once its message was handled, or once the attempt turned out to have
    // ended. Only an attempt that still holds the task refuses a reserved payment; an ended one may still be
    // transitioning or releasing, and its record may be reserved if a step that saved it ran again.
    [Theory]
    [InlineData("open", PaymentStatus.Created, StatusCodes.Status200OK, null)]
    [InlineData("open", PaymentStatus.Authorized, StatusCodes.Status409Conflict, "payment-authorized")]
    [InlineData("moved", PaymentStatus.Authorized, StatusCodes.Status200OK, null)]
    [InlineData("released", PaymentStatus.Authorized, StatusCodes.Status200OK, null)]
    [InlineData("notOpen", PaymentStatus.Authorized, StatusCodes.Status200OK, null)]
    [InlineData("late", PaymentStatus.Authorized, StatusCodes.Status200OK, null)]
    [InlineData("unroutable", PaymentStatus.Authorized, StatusCodes.Status200OK, null)]
    public async Task CancelPaymentAttempt_RefusesAReservedPaymentOnlyWhileTheAttemptHoldsTheTask(
        string after,
        PaymentStatus storedAfter,
        int statusCode,
        string? problemType
    )
    {
        PrepareOpenAttempt();
        var current = new InstanceWithStorageMetadata(_instance, StorageVersionMetadata.Empty);
        _services
            .Mock<IProcessEngine>()
            .Setup(engine =>
                engine.SendToActionPipeline(
                    It.IsAny<Instance>(),
                    _mailboxId,
                    PaymentAttemptMessage.Cancel,
                    "cancel",
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(() => ReplacePaymentInformation(storedAfter))
            .Returns(() =>
                after switch
                {
                    "open" => Task.FromResult<ActionPipelineOutcome>(new ActionPipelineOutcome.Open(current)),
                    "moved" => Task.FromResult<ActionPipelineOutcome>(new ActionPipelineOutcome.Moved(current)),
                    "released" => Task.FromResult<ActionPipelineOutcome>(new ActionPipelineOutcome.Released(current)),
                    "notOpen" => Task.FromResult<ActionPipelineOutcome>(new ActionPipelineOutcome.NotOpen(current)),
                    "late" => throw new ServiceTaskReplyForwardException(
                        ServiceTaskReplyForwardOutcome.Late,
                        _mailboxId,
                        "cancel",
                        "The mailbox is closed."
                    ),
                    "unroutable" => throw new ServiceTaskReplyForwardException(
                        ServiceTaskReplyForwardOutcome.Unroutable,
                        _mailboxId,
                        "cancel",
                        "The mailbox is gone."
                    ),
                    _ => throw new ArgumentOutOfRangeException(nameof(after), after, null),
                }
            );
        await using var sp = _services.BuildServiceProvider();

        IActionResult result = await CreateController(sp)
            .CancelPaymentAttempt("org", "app", PartyId, _instanceGuid, CancellationToken.None);

        Assert.Equal(statusCode, GetStatusCode(result));
        object? body = GetValue(result);
        if (problemType is null)
        {
            Assert.Equal(storedAfter, Assert.IsType<PaymentInformation>(body).Status);
        }
        else
        {
            Assert.Equal(problemType, Assert.IsType<ProblemDetails>(body).Type);
        }
    }

    [Fact]
    public void Constructor_NetsWebhookSecretProviderNotRegistered_DoesNotThrow()
    {
        var services = new MockedServiceCollection();
        services.Mock<IProcessReader>();
        services.Mock<IProcessEngine>();
        services.Services.AddSingleton<IPaymentService, PaymentService>();
        services.Services.AddSingleton<PaymentController>();
        RegisterWorkflowEngine(services);
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
        RegisterWorkflowEngine(services);
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
                mailboxId: null,
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

    /// <summary>What the controller forwards messages through, with the engine itself mocked.</summary>
    private static void RegisterWorkflowEngine(MockedServiceCollection services)
    {
        AppCode callbackCode = new()
        {
            Id = "callback",
            Code = "test-callback-code-long-enough-for-hmac",
            IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
        };
        services.Mock<IWorkflowCallbackSecretProvider>().Setup(p => p.GetSigningSecret()).Returns(callbackCode);
        services.Mock<IWorkflowCallbackSecretProvider>().Setup(p => p.GetValidationSecrets()).Returns([callbackCode]);
        services.Services.AddSingleton<WorkflowStateSigner>();
        services.Services.AddSingleton<MailboxDeliveryEnvelope>();
        services.Services.AddSingleton<ServiceTaskReplyForwarder>();
        services.Services.AddSingleton<PaymentAttemptRequests>();
        services.Mock<IWorkflowEngineClient>();
        services.Mock<IWorkflowEngineService>();
        services.Mock<IAuthorizationService>();
    }

    private static readonly Guid _mailboxId = Guid.Parse("3f1c9a2e-7b4d-4e6f-8a1b-2c3d4e5f6a7b");

    private static PaymentController CreateController(WrappedServiceProvider sp)
    {
        var controller = sp.GetRequiredService<PaymentController>();
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return controller;
    }

    private static Task<IActionResult> PostWebhook(
        WrappedServiceProvider sp,
        string eventName,
        Guid? mailboxId,
        string callbackKey
    ) =>
        sp.GetRequiredService<PaymentController>()
            .PaymentWebhookListener(
                "org",
                "app",
                PartyId,
                _instanceGuid,
                mailboxId,
                new()
                {
                    Id = "nets-event-id",
                    Data = new() { PaymentId = "some-payment-id" },
                    EventName = eventName,
                    Timestamp = DateTime.UtcNow,
                    MerchantId = 222,
                },
                callbackKey,
                CancellationToken.None
            );

    private void SetupMailboxOfInstance(bool isTheInstances) =>
        _services
            .Mock<IWorkflowEngineService>()
            .Setup(service =>
                service.IsMailboxOfInstance(
                    It.Is<InstanceIdentifier>(id =>
                        id.InstanceOwnerPartyId == PartyId && id.InstanceGuid == _instanceGuid
                    ),
                    _mailboxId,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(isTheInstances);

    private void SetupAttemptHoldsTheTask(bool holds) =>
        _services
            .Mock<IWorkflowEngineService>()
            .Setup(service => service.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowTaskStatus(
                    WorkflowActivityStatus.Processing,
                    "currentTask",
                    Failure: null,
                    AwaitingMessages: holds
                )
            );

    private void SetupDelivery(HttpStatusCode status) =>
        _services
            .Mock<IWorkflowEngineClient>()
            .Setup(c =>
                c.DeliverToMailbox(
                    It.IsAny<string>(),
                    _mailboxId,
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MailboxDeliveryResult(status, Body: null, ErrorDetail: null));

    private void SetupPaymentTasks() =>
        _services
            .Mock<IProcessReader>()
            .Setup(pr => pr.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "currentTask",
                    ExtensionElements = new ExtensionElements
                    {
                        TaskExtension = new AltinnTaskExtension
                        {
                            PaymentConfiguration = new AltinnPaymentConfiguration
                            {
                                PaymentDataType = "paymentDataType",
                            },
                        },
                    },
                },
            ]);

    /// <summary>An attempt holds the current payment task, and its payment is stored as created.</summary>
    private void PrepareOpenAttempt()
    {
        _instance.Process.Status = ProcessStatus.Processing;
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
            Times.AtLeastOnce()
        );
        AllowAction("reject");
        StorePaymentInformation(PaymentStatus.Created, _mailboxId);
    }

    private void AllowAction(string action) =>
        _services
            .Mock<IAuthorizationService>()
            .Setup(a =>
                a.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    action,
                    "currentTask",
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);

    private void StorePaymentInformation(PaymentStatus status, Guid? mailboxId) =>
        _services.Storage.AddData(
            _instance,
            "paymentDataType",
            "application/json",
            JsonSerializer.SerializeToUtf8Bytes(
                new PaymentInformation()
                {
                    TaskId = "currentTask",
                    Status = status,
                    OrderDetails = _orderDetails,
                    PaymentDetails = new PaymentDetails { PaymentId = "some-payment-id" },
                    MailboxId = mailboxId,
                },
                new JsonSerializerOptions(JsonSerializerDefaults.Web)
            )
        );

    /// <summary>Replaces the stored payment record with a new data element, as the attempt's steps may.</summary>
    private void ReplacePaymentInformation(PaymentStatus status)
    {
        _instance.Data.RemoveAll(dataElement => dataElement.DataType == "paymentDataType");
        StorePaymentInformation(status, _mailboxId);
    }

    private static LogLevel? GetEventLogLevel(WrappedServiceProvider sp, string messageFragment) =>
        sp
            .Logs.SingleOrDefault(log =>
                log.CategoryName == typeof(PaymentAttemptRequests).FullName
                && (log.Body ?? log.FormattedMessage ?? "").Contains(messageFragment, StringComparison.Ordinal)
            )
            ?.LogLevel;

    private static int? GetStatusCode(IActionResult result) =>
        result switch
        {
            IStatusCodeActionResult { StatusCode: { } statusCode } => statusCode,
            _ => null,
        };

    private static object? GetValue(IActionResult result) =>
        result switch
        {
            ObjectResult objectResult => objectResult.Value,
            JsonResult jsonResult => jsonResult.Value,
            _ => null,
        };

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
