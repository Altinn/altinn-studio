using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

/// <summary>
/// Moves an instance through a real payment task over HTTP, with the app's own process engine and an in-process
/// workflow engine that holds a payment attempt's receiver until its message arrives. The gateway after the task
/// routes on the action, as in apps made in Studio.
/// </summary>
public class PaymentTaskProcessTests : ApiTestBase
{
    private const string Org = "tdd";
    private const string App = "payment-task";
    private const int InstanceOwnerPartyId = 500600;
    private const int UserId = 1337;
    private const string PaymentProcessorId = "Test Payment Processor";
    private const string WebhookSecret = "webhook-secret";
    private static readonly Guid _instanceGuid = Guid.Parse("9a1f3c52-6d0e-4b7a-8c21-5e4f7d1b2a60");
    private static readonly Guid _paymentDataGuid = Guid.Parse("9a1f3c52-6d0e-4b7a-8c21-5e4f7d1b2a61");
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly Mock<IPaymentProcessor> _paymentProcessor = new(MockBehavior.Strict);
    private readonly Mock<IPdfService> _pdfService = new(MockBehavior.Strict);
    private readonly Mock<IOrderDetailsCalculator> _orderDetailsCalculator = new(MockBehavior.Strict);
    private readonly List<PlatformUser> _processEventUsers = [];
    private PaymentStatus _reportedStatus = PaymentStatus.Created;
    private Func<Task>? _runAgainAtNextRecordSave;
    private Lazy<Task<InstanceMutationWithStorageMetadata>>? _heldSave;

    public PaymentTaskProcessTests(ITestOutputHelper outputHelper)
        : base(outputHelper)
    {
        _paymentProcessor.Setup(p => p.PaymentProcessorId).Returns(PaymentProcessorId);
        _paymentProcessor
            .Setup(p =>
                p.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    "test-payment-id",
                    It.IsAny<decimal>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() =>
                (_reportedStatus, new PaymentDetails { PaymentId = "test-payment-id", RedirectUrl = CheckoutUrl })
            );
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .Setup(p =>
                p.StartPayment(
                    It.IsAny<Instance>(),
                    It.IsAny<OrderDetails>(),
                    It.IsAny<string?>(),
                    It.IsAny<Guid>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new PaymentDetails { PaymentId = "test-payment-id", RedirectUrl = CheckoutUrl });
        SetupOrderTotal(100);
        _pdfService
            .Setup(p =>
                p.GeneratePdf(
                    It.IsAny<Instance>(),
                    "Task_2",
                    It.IsAny<string>(),
                    It.IsAny<List<string>?>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([1, 2, 3]);
        var webhookSecretProvider = new Mock<INetsWebhookSecretProvider>(MockBehavior.Strict);
        webhookSecretProvider.Setup(p => p.IsValidIncomingSecret(WebhookSecret)).Returns(true);

        OverrideServicesForAllTests = services =>
        {
            services.AddSingleton(_paymentProcessor.Object);
            services.AddSingleton(_pdfService.Object);
            services.AddSingleton(_orderDetailsCalculator.Object);
            services.AddSingleton(webhookSecretProvider.Object);
            services.AddTransient<IInstanceMutationClient>(sp => new ProcessEventRecorder(
                new SaveHolder((IInstanceMutationClient)sp.GetRequiredService<IDataClient>(), this),
                _processEventUsers
            ));
        };
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    private const string CheckoutUrl = "https://payment.example/checkout";

    private string InstanceUrl => $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}";

    [Fact]
    public async Task Pay_OpensAnAttempt_AndACheckThatFindsThePaymentPaid_MovesOnAsTheCallerInTheirLanguage()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage pay = await Pay(client, language: "nb");

        Assert.Equal(HttpStatusCode.OK, pay.StatusCode);
        Assert.Equal(
            CheckoutUrl,
            (await pay.Content.ReadFromJsonAsync<JsonObject>())?["redirectUrl"]?.GetValue<string>()
        );
        PaymentInformation opened = await ReadRecord();
        Assert.Equal(PaymentStatus.Created, opened.Status);
        Assert.Equal("nb", opened.Language);
        Guid mailboxId = Assert.IsType<Guid>(opened.MailboxId);
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .Verify(
                p =>
                    p.StartPayment(
                        It.IsAny<Instance>(),
                        It.IsAny<OrderDetails>(),
                        "nb",
                        mailboxId,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        JsonObject held = await GetProcess(client);
        Assert.Equal("processing", held["workflow"]?["status"]?.GetValue<string>());
        Assert.True(held["workflow"]?["awaitingMessages"]?.GetValue<bool>());

        _reportedStatus = PaymentStatus.Paid;
        using HttpResponseMessage check = await PostToPayment(client, "check", language: "en");

        Assert.Equal(HttpStatusCode.OK, check.StatusCode);
        Assert.Equal(PaymentStatus.Paid, (await check.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Instance instance = await ReadInstance();
        Assert.Equal("EndEvent_1", instance.Process.EndEvent);
        VerifyReceiptLanguage("en");
        Assert.All(_processEventUsers, user => Assert.Equal(UserId, user.UserId));
    }

    [Fact]
    public async Task Check_WhoseStatusWasAlreadySent_SendsNothingMore()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        _reportedStatus = PaymentStatus.Authorized;

        using HttpResponseMessage first = await PostToPayment(client, "check");
        using HttpResponseMessage second = await PostToPayment(client, "check");

        Assert.Equal(PaymentStatus.Authorized, (await first.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Assert.Equal(PaymentStatus.Authorized, (await second.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Assert.True((await GetProcess(client))["workflow"]?["awaitingMessages"]?.GetValue<bool>());
        // The first check asks and sends, and the attempt asks again; the second only asks.
        VerifyStatusReads(Times.Exactly(3));
    }

    [Fact]
    public async Task Check_WhenTheProcessorAgreesWithTheStoredStatus_SendsNothing()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);

        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(PaymentStatus.Created, (await check.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        VerifyStatusReads(Times.Once());
    }

    [Fact]
    public async Task NetsEvent_ThatFindsThePaymentPaid_MovesOnAsTheServiceOwnerWithTheReceiptInThePayersLanguage()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client, language: "en");
        Guid mailboxId = Assert.IsType<Guid>((await ReadRecord()).MailboxId);
        _processEventUsers.Clear();
        _reportedStatus = PaymentStatus.Paid;

        using HttpResponseMessage webhook = await PostWebhook(client, "payment.charge.created.v2", mailboxId);

        Assert.Equal(HttpStatusCode.OK, webhook.StatusCode);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        Assert.Equal(PaymentStatus.Paid, (await ReadRecord()).Status);
        VerifyReceiptLanguage("en");
        Assert.NotEmpty(_processEventUsers);
        Assert.All(
            _processEventUsers,
            user =>
            {
                Assert.Equal(Org, user.OrgId);
                Assert.Null(user.UserId);
                Assert.Equal(0, user.AuthenticationLevel);
            }
        );
    }

    [Fact]
    public async Task NetsEvent_ToTheMailboxOfAnotherInstance_IsDroppedWithoutReachingTheAttempt()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        Guid mailboxId = Assert.IsType<Guid>((await ReadRecord()).MailboxId);
        _reportedStatus = PaymentStatus.Paid;

        using HttpResponseMessage webhook = await PostWebhook(
            client,
            "payment.charge.created.v2",
            mailboxId,
            instanceGuid: Guid.NewGuid()
        );

        Assert.Equal(HttpStatusCode.OK, webhook.StatusCode);
        Assert.True((await GetProcess(client))["workflow"]?["awaitingMessages"]?.GetValue<bool>());
        VerifyStatusReads(Times.Never());
    }

    // A step of an attempt that the engine runs again after its first run saved and relayed, as when its answer is
    // lost, ends as the first run did: it asks the processor nothing, stores nothing and enqueues the same workflow.

    [Fact]
    public async Task StepRunAgain_AfterAMessageConcludedConfirm_MovesOnOnce()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        _reportedStatus = PaymentStatus.Paid;
        Engine.LoseNextAnswer(run => run.Mailbox?.Delivery is not null);

        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(HttpStatusCode.OK, check.StatusCode);
        Assert.Equal(PaymentStatus.Paid, (await check.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        Assert.Equal(PaymentStatus.Paid, (await ReadRecord()).Status);
        // The check asks once and the attempt once.
        VerifyStatusReads(Times.Exactly(2));
        VerifyReceiptCount(Times.Once());
        AssertTheStepRanAgainWithoutAFailedWorkflow();
    }

    [Fact]
    public async Task StepRunAgain_AfterAMessageStoredAReservation_KeepsTheAttemptOpen_UntilTheNextMessageConcludes()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        _reportedStatus = PaymentStatus.Authorized;
        Engine.LoseNextAnswer(run =>
        {
            // By the time the step runs again, the processor has charged the reservation.
            _reportedStatus = PaymentStatus.Paid;
            return run.Mailbox?.Delivery is not null;
        });

        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(PaymentStatus.Authorized, (await check.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Assert.True((await GetProcess(client))["workflow"]?["awaitingMessages"]?.GetValue<bool>());
        Assert.Equal(PaymentStatus.Authorized, (await ReadRecord()).Status);
        VerifyStatusReads(Times.Exactly(2));
        AssertTheStepRanAgainWithoutAFailedWorkflow();

        using HttpResponseMessage next = await PostToPayment(client, "check");

        Assert.Equal(PaymentStatus.Paid, (await next.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        Assert.False(Engine.HasFailedWorkflow);
    }

    [Fact]
    public async Task StepRunAgain_AfterACancelMovedBack_MovesBackOnce()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        SetupTerminate(accepted: true);
        Engine.LoseNextAnswer(run => run.Mailbox?.Delivery is not null);

        using HttpResponseMessage cancel = await PostToPayment(client, "cancel");

        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
        Instance instance = await ReadInstance();
        Assert.Equal("Task_1", instance.Process.CurrentTask?.ElementId);
        Assert.True(ProcessStatusHelper.IsIdle(instance));
        _paymentProcessor.Verify(
            p =>
                p.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
        VerifyStatusReads(Times.Once());
        AssertTheStepRanAgainWithoutAFailedWorkflow();
    }

    [Theory]
    [InlineData(PaymentStatus.Created, PaymentStatus.Cancelled, "Task_2")]
    [InlineData(PaymentStatus.Paid, PaymentStatus.Paid, null)]
    public async Task StepRunAgain_AtTheDeadline_EndsAsItsFirstRunDid(
        PaymentStatus reported,
        PaymentStatus stored,
        string? taskAfter
    )
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        Guid mailboxId = Assert.IsType<Guid>((await ReadRecord()).MailboxId);
        SetupTerminate(accepted: true);
        _reportedStatus = reported;
        Engine.LoseNextAnswer(run => run.Mailbox is { Delivery: null, DisposedReason: not null });

        await Engine.ExpireMailbox(mailboxId);

        Instance instance = await ReadInstance();
        Assert.Equal(taskAfter, instance.Process.CurrentTask?.ElementId);
        Assert.True(ProcessStatusHelper.IsIdle(instance));
        Assert.Equal(stored, (await ReadRecord()).Status);
        _paymentProcessor.Verify(
            p =>
                p.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()),
            reported == PaymentStatus.Created ? Times.Once() : Times.Never()
        );
        VerifyStatusReads(Times.Once());
        VerifyReceiptCount(reported == PaymentStatus.Paid ? Times.Once() : Times.Never());
        AssertTheStepRanAgainWithoutAFailedWorkflow();
    }

    // "none": no earlier record; "created": a v8 leftover the stage terminates before it creates; "reserved": a v8
    // leftover the stage opens the attempt on.
    [Theory]
    [InlineData("none")]
    [InlineData("created")]
    [InlineData("reserved")]
    public async Task StepRunAgain_OfTheOpeningStage_KeepsTheAttemptItOpened(string earlierRecord)
    {
        if (earlierRecord != "none")
        {
            StorePaymentStatus(earlierRecord == "created" ? PaymentStatus.Created : PaymentStatus.Authorized);
            _reportedStatus = earlierRecord == "created" ? PaymentStatus.Created : PaymentStatus.Authorized;
            SetupTerminate(accepted: earlierRecord == "created");
        }
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        Engine.LoseNextAnswer(IsOpeningStage);

        using HttpResponseMessage pay = await Pay(client);

        Assert.Equal(HttpStatusCode.OK, pay.StatusCode);
        PaymentInformation opened = await ReadRecord();
        Assert.Equal(earlierRecord == "reserved" ? PaymentStatus.Authorized : PaymentStatus.Created, opened.Status);
        Assert.True((await GetProcess(client))["workflow"]?["awaitingMessages"]?.GetValue<bool>());
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .Verify(
                p =>
                    p.StartPayment(
                        It.IsAny<Instance>(),
                        It.IsAny<OrderDetails>(),
                        It.IsAny<string?>(),
                        It.IsAny<Guid>(),
                        It.IsAny<CancellationToken>()
                    ),
                earlierRecord == "reserved" ? Times.Never() : Times.Once()
            );
        _paymentProcessor.Verify(
            p =>
                p.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()),
            earlierRecord == "none" ? Times.Never() : Times.Once()
        );
        AssertTheStepRanAgainWithoutAFailedWorkflow();

        _reportedStatus = PaymentStatus.Paid;
        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(opened.MailboxId, (await ReadRecord()).MailboxId);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        Assert.False(Engine.HasFailedWorkflow);
    }

    [Fact]
    public async Task StepRunAgain_OfTheOpeningStage_ForAnOrderThatCostsNothing_MovesOnOnce()
    {
        SetupOrderTotal(0);
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        Engine.LoseNextAnswer(IsOpeningStage);

        using HttpResponseMessage pay = await Pay(client);

        Assert.Equal(HttpStatusCode.OK, pay.StatusCode);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        Assert.Equal(PaymentStatus.Skipped, (await ReadRecord()).Status);
        _orderDetailsCalculator.Verify(
            c => c.CalculateOrderDetails(It.IsAny<Instance>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
        VerifyNoPaymentCreated();
        AssertTheStepRanAgainWithoutAFailedWorkflow();
    }

    [Fact]
    public async Task StepRunAgain_OfTheOpeningStage_AfterAFailedCreate_ReleasesAgainWithoutCreating()
    {
        // A create that would succeed the second time.
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .SetupSequence(p =>
                p.StartPayment(
                    It.IsAny<Instance>(),
                    It.IsAny<OrderDetails>(),
                    It.IsAny<string?>(),
                    It.IsAny<Guid>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("Nets answered 500."))
            .ReturnsAsync(new PaymentDetails { PaymentId = "test-payment-id", RedirectUrl = CheckoutUrl });
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        Engine.LoseNextAnswer(IsOpeningStage);

        using HttpResponseMessage pay = await Pay(client);

        Assert.Equal(HttpStatusCode.InternalServerError, pay.StatusCode);
        Assert.Equal(
            "PaymentNotStarted",
            (await pay.Content.ReadFromJsonAsync<JsonObject>())?["error"]?["code"]?.GetValue<string>()
        );
        Instance instance = await ReadInstance();
        Assert.True(ProcessStatusHelper.IsIdle(instance));
        Assert.DoesNotContain(instance.Data, dataElement => dataElement.DataType == "paymentInformation");
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .Verify(
                p =>
                    p.StartPayment(
                        It.IsAny<Instance>(),
                        It.IsAny<OrderDetails>(),
                        It.IsAny<string?>(),
                        It.IsAny<Guid>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        AssertTheStepRanAgainWithoutAFailedWorkflow();
    }

    [Fact]
    public async Task StepRunAgain_AfterAMessageStoredAReservationButItsEnqueueFailed_KeepsTheAttemptOpen()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        _reportedStatus = PaymentStatus.Authorized;
        Engine.FailNextEnqueue(request =>
        {
            bool isReceiver = IsReceiver(request);
            if (isReceiver)
            {
                // By the time the step runs again, the processor has charged the reservation.
                _reportedStatus = PaymentStatus.Paid;
            }
            return isReceiver;
        });

        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(PaymentStatus.Authorized, (await check.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Assert.True((await GetProcess(client))["workflow"]?["awaitingMessages"]?.GetValue<bool>());
        VerifyStatusReads(Times.Exactly(2));
        Assert.Equal(1, Engine.FailedEnqueues);
        Assert.False(Engine.HasFailedWorkflow);

        using HttpResponseMessage next = await PostToPayment(client, "check");

        Assert.Equal(PaymentStatus.Paid, (await next.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        Assert.False(Engine.HasFailedWorkflow);
    }

    [Fact]
    public async Task StepRunAgain_OfTheOpeningStage_AfterItsReleaseClosedTheMailboxButItsEnqueueFailed_ReleasesWithoutCreating()
    {
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .SetupSequence(p =>
                p.StartPayment(
                    It.IsAny<Instance>(),
                    It.IsAny<OrderDetails>(),
                    It.IsAny<string?>(),
                    It.IsAny<Guid>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("Nets answered 500."))
            .ReturnsAsync(new PaymentDetails { PaymentId = "test-payment-id", RedirectUrl = CheckoutUrl });
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        Engine.FailNextEnqueue(IsRelease);

        using HttpResponseMessage pay = await Pay(client);

        Assert.Equal(HttpStatusCode.InternalServerError, pay.StatusCode);
        Assert.True(ProcessStatusHelper.IsIdle(await ReadInstance()));
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .Verify(
                p =>
                    p.StartPayment(
                        It.IsAny<Instance>(),
                        It.IsAny<OrderDetails>(),
                        It.IsAny<string?>(),
                        It.IsAny<Guid>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        Assert.Equal(1, Engine.FailedEnqueues);
        Assert.False(Engine.HasFailedWorkflow);
    }

    // Two runs of one step that overlap: the second reads the record before the first saves, and saves after it, so
    // Storage keeps the first run's reservation while the engine takes the second run's move on.
    [Fact]
    public async Task MoveOn_AfterTwoRunsOfAStepOverlapped_StoresThePaymentAsPaidBeforeTheReceipt()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        _reportedStatus = PaymentStatus.Authorized;
        Engine.OverlapNextRun(run => run.Mailbox?.Delivery is not null);
        _runAgainAtNextRecordSave = () =>
        {
            _reportedStatus = PaymentStatus.Paid;
            return Engine.RunTheStepAgainNow();
        };

        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(1, Engine.OverlappedRuns);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        Assert.Equal(PaymentStatus.Paid, (await ReadRecord()).Status);
        VerifyReceiptCount(Times.Once());
        Assert.False(Engine.HasFailedWorkflow);
    }

    // The record names a step with an ending this version does not know, as after a rename: it counts as naming no
    // step, for a new attempt's opening stage and for leaving the task alike.
    [Theory]
    [InlineData("pay")]
    [InlineData("reject")]
    public async Task Request_OverARecordWhoseStoredEndingThisVersionDoesNotKnow_ReadsItAsNamingNoStep(string request)
    {
        StorePaymentStatus(PaymentStatus.Cancelled);
        string path = TestData.GetDataBlobPath(Org, App, InstanceOwnerPartyId, _instanceGuid, _paymentDataGuid);
        JsonObject record = JsonNode.Parse(File.ReadAllBytes(path))!.AsObject();
        record["attemptStep"] = new JsonObject { ["stepId"] = Guid.NewGuid().ToString(), ["ending"] = "Released" };
        File.WriteAllText(path, record.ToJsonString());
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage response = request == "pay" ? await Pay(client) : await ProcessNext(client, "reject");

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Instance instance = await ReadInstance();
        if (request == "pay")
        {
            Assert.Equal(PaymentStatus.Created, (await ReadRecord()).Status);
            Assert.True((await GetProcess(client))["workflow"]?["awaitingMessages"]?.GetValue<bool>());
        }
        else
        {
            Assert.Equal("Task_1", instance.Process.CurrentTask?.ElementId);
            Assert.DoesNotContain(instance.Data, dataElement => dataElement.DataType == "paymentInformation");
        }
        Assert.False(Engine.HasFailedWorkflow);
    }

    [Fact]
    public async Task Check_OfAFailedAttempt_ReturnsTheStoredRecordWithoutAskingTheProcessor()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        // No started payment can have this status, so the attempt's handler fails permanently.
        _reportedStatus = PaymentStatus.Uninitialized;
        using HttpResponseMessage failed = await PostToPayment(client, "check");
        Assert.Equal(HttpStatusCode.InternalServerError, failed.StatusCode);
        _reportedStatus = PaymentStatus.Paid;

        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(HttpStatusCode.OK, check.StatusCode);
        Assert.Equal(PaymentStatus.Created, (await check.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        Assert.Equal("failed", (await GetProcess(client))["workflow"]?["status"]?.GetValue<string>());
        // The failing check asked once and the attempt once; this check asks nothing, so it has nothing to send.
        VerifyStatusReads(Times.Exactly(2));
    }

    [Fact]
    public async Task Cancel_OfAFailedAttempt_IsAnsweredAsProcessNextIs()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        // No started payment can have this status, so the attempt's handler fails permanently.
        _reportedStatus = PaymentStatus.Uninitialized;
        using HttpResponseMessage check = await PostToPayment(client, "check");
        Assert.Equal(HttpStatusCode.InternalServerError, check.StatusCode);

        using HttpResponseMessage cancel = await PostToPayment(client, "cancel");
        using HttpResponseMessage processNext = await ProcessNext(client, "reject");

        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Equal(processNext.StatusCode, cancel.StatusCode);
        Assert.Equal(
            "resumeRequired",
            (await cancel.Content.ReadFromJsonAsync<JsonObject>())?["processNextState"]?.GetValue<string>()
        );
        Assert.Equal(
            "resumeRequired",
            (await processNext.Content.ReadFromJsonAsync<JsonObject>())?["processNextState"]?.GetValue<string>()
        );
    }

    [Fact]
    public async Task Cancel_DuringAnAttempt_TerminatesThePaymentAndMovesBack()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        SetupTerminate(accepted: true);

        using HttpResponseMessage cancel = await PostToPayment(client, "cancel");

        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
        // The abandoned task removed its record.
        Assert.Equal(
            PaymentStatus.Uninitialized,
            (await cancel.Content.ReadFromJsonAsync<PaymentInformation>())?.Status
        );
        Instance instance = await ReadInstance();
        Assert.Equal("Task_1", instance.Process.CurrentTask?.ElementId);
        Assert.True(ProcessStatusHelper.IsIdle(instance));
        _paymentProcessor.Verify(
            p =>
                p.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task Cancel_OfAPaymentReservedMeanwhile_IsRefusedAsReserved()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        SetupTerminate(accepted: false);
        _reportedStatus = PaymentStatus.Authorized;

        using HttpResponseMessage cancel = await PostToPayment(client, "cancel");

        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Equal(
            "payment-authorized",
            (await cancel.Content.ReadFromJsonAsync<JsonObject>())?["type"]?.GetValue<string>()
        );
        Assert.True((await GetProcess(client))["workflow"]?["awaitingMessages"]?.GetValue<bool>());
    }

    [Fact]
    public async Task Deadline_OnAnUnpaidPayment_TerminatesItAndReleasesTheTask()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        Guid mailboxId = Assert.IsType<Guid>((await ReadRecord()).MailboxId);
        SetupTerminate(accepted: true);

        await Engine.ExpireMailbox(mailboxId);

        Instance instance = await ReadInstance();
        Assert.Equal("Task_2", instance.Process.CurrentTask?.ElementId);
        Assert.True(ProcessStatusHelper.IsIdle(instance));
        Assert.Equal(PaymentStatus.Cancelled, (await ReadRecord()).Status);
        _paymentProcessor.Verify(
            p =>
                p.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task Pay_OrderThatCostsNothing_StoresSkippedAndMovesOnAsTheCaller()
    {
        SetupOrderTotal(0);
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage pay = await Pay(client);

        Assert.Equal(HttpStatusCode.OK, pay.StatusCode);
        Assert.Null((await pay.Content.ReadFromJsonAsync<JsonObject>())?["redirectUrl"]);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        Assert.Equal(PaymentStatus.Skipped, (await ReadRecord()).Status);
        Assert.NotEmpty(_processEventUsers);
        Assert.All(_processEventUsers, user => Assert.Equal(UserId, user.UserId));
        VerifyNoPaymentCreated();
    }

    [Fact]
    public async Task Pay_ThatCannotCreateThePayment_AnswersPaymentNotStartedWithTheTaskIdleAgain()
    {
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .Setup(p =>
                p.StartPayment(
                    It.IsAny<Instance>(),
                    It.IsAny<OrderDetails>(),
                    It.IsAny<string?>(),
                    It.IsAny<Guid>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("Nets answered 500."));
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage pay = await Pay(client);

        Assert.Equal(HttpStatusCode.InternalServerError, pay.StatusCode);
        JsonObject? body = await pay.Content.ReadFromJsonAsync<JsonObject>();
        Assert.Equal("PaymentNotStarted", body?["error"]?["code"]?.GetValue<string>());
        Assert.Equal("idle", body?["instance"]?["process"]?["status"]?.GetValue<string>());
        Instance instance = await ReadInstance();
        Assert.True(ProcessStatusHelper.IsIdle(instance));
        Assert.Equal("Task_2", instance.Process.CurrentTask?.ElementId);
        Assert.DoesNotContain(instance.Data, dataElement => dataElement.DataType == "paymentInformation");
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .Verify(
                p =>
                    p.StartPayment(
                        It.IsAny<Instance>(),
                        It.IsAny<OrderDetails>(),
                        It.IsAny<string?>(),
                        It.IsAny<Guid>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task Pay_DuringAnAttempt_IsRefusedAsProcessing()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage first = await Pay(client);

        using HttpResponseMessage second = await Pay(client);

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal(
            "instance-processing",
            (await second.Content.ReadFromJsonAsync<JsonObject>())?["type"]?.GetValue<string>()
        );
    }

    [Fact]
    public async Task Pay_OnAPaymentAlreadyPaid_MovesOnWithoutCreatingOne()
    {
        StorePaymentStatus(PaymentStatus.Paid);
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage pay = await Pay(client);

        Assert.Equal(HttpStatusCode.OK, pay.StatusCode);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
        VerifyNoPaymentCreated();
    }

    [Fact]
    public async Task Pay_OnAReservedPayment_OpensTheAttempt_WhichANetsEventWithoutAMailboxIdReaches()
    {
        StorePaymentStatus(PaymentStatus.Authorized, mailboxId: null);
        _reportedStatus = PaymentStatus.Authorized;
        SetupTerminate(accepted: false);
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage pay = await Pay(client);

        Assert.Equal(HttpStatusCode.OK, pay.StatusCode);
        Assert.Null((await pay.Content.ReadFromJsonAsync<JsonObject>())?["redirectUrl"]);
        PaymentInformation adopted = await ReadRecord();
        Assert.Equal(PaymentStatus.Authorized, adopted.Status);
        Assert.NotNull(adopted.MailboxId);
        // The earlier visit stored "en"; the attempt belongs to the caller who opened it.
        Assert.Equal("nb", adopted.Language);
        VerifyNoPaymentCreated();

        _reportedStatus = PaymentStatus.Paid;
        using HttpResponseMessage webhook = await PostWebhook(client, "payment.charge.created.v2", mailboxId: null);

        Assert.Equal(HttpStatusCode.OK, webhook.StatusCode);
        Assert.Equal("EndEvent_1", (await ReadInstance()).Process.EndEvent);
    }

    [Fact]
    public async Task Cancel_OfAReservedPayment_IsRefusedWithoutReachingTheAttempt()
    {
        StorePaymentStatus(PaymentStatus.Authorized, mailboxId: null);
        _reportedStatus = PaymentStatus.Authorized;
        SetupTerminate(accepted: false);
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        _paymentProcessor.Invocations.Clear();

        using HttpResponseMessage cancel = await PostToPayment(client, "cancel");

        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Equal(
            "payment-authorized",
            (await cancel.Content.ReadFromJsonAsync<JsonObject>())?["type"]?.GetValue<string>()
        );
        VerifyStatusReads(Times.Never());
    }

    [Fact]
    public async Task Cancel_OnAnIdleTask_IsRefusedAsNoAttemptIsOpen()
    {
        StorePaymentStatus(PaymentStatus.Created, mailboxId: Guid.NewGuid());
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage cancel = await PostToPayment(client, "cancel");

        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Equal(
            "payment-attempt-not-open",
            (await cancel.Content.ReadFromJsonAsync<JsonObject>())?["type"]?.GetValue<string>()
        );
    }

    [Fact]
    public async Task Check_OnAnIdleTask_ReturnsTheStoredRecordWithoutAskingTheProcessor()
    {
        StorePaymentStatus(PaymentStatus.Created, mailboxId: Guid.NewGuid());
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(HttpStatusCode.OK, check.StatusCode);
        Assert.Equal(PaymentStatus.Created, (await check.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        VerifyStatusReads(Times.Never());
    }

    [Fact]
    public async Task Check_WhenTheProcessorCannotBeAsked_AnswersBadGatewayWithoutSending()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        _paymentProcessor
            .Setup(p =>
                p.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    "test-payment-id",
                    It.IsAny<decimal>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("Nets is down."));

        using HttpResponseMessage check = await PostToPayment(client, "check");

        Assert.Equal(HttpStatusCode.BadGateway, check.StatusCode);
        Assert.Equal(
            "payment-processor-unavailable",
            (await check.Content.ReadFromJsonAsync<JsonObject>())?["type"]?.GetValue<string>()
        );
        VerifyStatusReads(Times.Once());
    }

    [Theory]
    [InlineData("POST", "cancel")]
    [InlineData("POST", "check")]
    [InlineData("GET", "")]
    public async Task PaymentEndpoint_WithoutAnAuthenticatedCaller_IsUnauthorized(string method, string endpoint)
    {
        StorePaymentStatus(PaymentStatus.Created);
        using HttpClient client = GetRootedClient(Org, App);

        using HttpResponseMessage response = await client.SendAsync(
            new HttpRequestMessage(new HttpMethod(method), $"{InstanceUrl}/payment/{endpoint}")
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("cancel", "reject")]
    [InlineData("check", "pay")]
    public async Task AttemptMessage_IsAuthorizedAgainstItsAction(string endpoint, string action)
    {
        StorePaymentStatus(PaymentStatus.Created);
        using HttpClient client = GetRootedUserClient(
            Org,
            App,
            UserId,
            InstanceOwnerPartyId,
            configureServices: services =>
                services.AddTransient<IAuthorizationService>(sp => new DenyingAuthorizationService(
                    ActivatorUtilities.CreateInstance<AuthorizationService>(sp),
                    action
                ))
        );

        using HttpResponseMessage response = await PostToPayment(client, endpoint);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetPayment_DuringAnAttempt_ReturnsTheStoredRecordWithoutAskingTheProcessor()
    {
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        using HttpResponseMessage pay = await Pay(client);
        _reportedStatus = PaymentStatus.Paid;
        _paymentProcessor.Invocations.Clear();

        using HttpResponseMessage response = await client.GetAsync($"{InstanceUrl}/payment");

        Assert.Equal(PaymentStatus.Created, (await response.Content.ReadFromJsonAsync<PaymentInformation>())?.Status);
        VerifyStatusReads(Times.Never());
    }

    [Theory]
    [InlineData("confirm")]
    [InlineData(null)]
    public async Task ProcessNext_OnThePaymentTask_IsRefusedAsNotCompleted(string? action)
    {
        StorePaymentStatus(PaymentStatus.Paid);
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage response = await ProcessNext(client, action);

        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(["PaymentNotCompleted"], GetIssueCodes(body));
        Instance instance = await ReadInstance();
        Assert.Equal("Task_2", instance.Process.CurrentTask?.ElementId);
        Assert.True(ProcessStatusHelper.IsIdle(instance));
    }

    [Fact]
    public async Task Reject_WhenThePaymentIsPaid_IsRefusedAsAlreadyPaid_WithoutAskingTheProcessor()
    {
        StorePaymentStatus(PaymentStatus.Paid);
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage response = await ProcessNext(client, "reject");

        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(["PaymentAlreadyCompleted"], GetIssueCodes(body));
        Assert.Equal("Task_2", (await ReadInstance()).Process.CurrentTask?.ElementId);
        _paymentProcessor.Verify(p => p.PaymentProcessorId, Times.AtMostOnce);
        _paymentProcessor.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Reject_OfAnUnfinishedPayment_CancelsItAtTheProcessor_AndGoesBack()
    {
        StorePaymentStatus(PaymentStatus.Created);
        SetupTerminate(accepted: true);
        using HttpClient client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

        using HttpResponseMessage response = await ProcessNext(client, "reject");

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Instance instance = await ReadInstance();
        Assert.Equal("Task_1", instance.Process.CurrentTask?.ElementId);
        // Abandon dropped the record of the cancelled payment.
        Assert.DoesNotContain(instance.Data, dataElement => dataElement.DataType == "paymentInformation");
        _paymentProcessor.Verify(
            p =>
                p.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    private FakeWorkflowEngineClient Engine =>
        (FakeWorkflowEngineClient)Services.GetRequiredService<IWorkflowEngineClient>();

    private static bool IsOpeningStage(FakeWorkflowEngineClient.FakeStepRun run) =>
        run.WorkflowOperationId.StartsWith("Action pipeline:", StringComparison.Ordinal)
        && run.CommandKey == ExecuteServiceTask.Key;

    private static bool IsReceiver(WorkflowEnqueueRequest request) =>
        request.Workflows.Any(workflow =>
            workflow.OperationId.StartsWith("Mailbox receive:", StringComparison.Ordinal)
        );

    private static bool IsRelease(WorkflowEnqueueRequest request) =>
        request.Workflows.Any(workflow => workflow.OperationId.EndsWith("· release", StringComparison.Ordinal));

    private void AssertTheStepRanAgainWithoutAFailedWorkflow()
    {
        Assert.Equal(1, Engine.LostAnswers);
        Assert.False(Engine.HasFailedWorkflow);
    }

    private void VerifyReceiptCount(Times times) =>
        _pdfService.Verify(
            p =>
                p.GeneratePdf(
                    It.IsAny<Instance>(),
                    "Task_2",
                    It.IsAny<string>(),
                    It.IsAny<List<string>?>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            times
        );

    private void SetupOrderTotal(decimal priceExVat) =>
        _orderDetailsCalculator
            .Setup(c =>
                c.CalculateOrderDetails(It.IsAny<Instance>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(() => CreateOrderDetails(priceExVat));

    private void SetupTerminate(bool accepted) =>
        _paymentProcessor
            .Setup(p =>
                p.TerminatePayment(
                    It.IsAny<Instance>(),
                    It.Is<PaymentInformation>(info => info.PaymentDetails!.PaymentId == "test-payment-id"),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(accepted);

    private void VerifyStatusReads(Times times) =>
        _paymentProcessor.Verify(
            p =>
                p.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                ),
            times
        );

    private void VerifyNoPaymentCreated() =>
        _paymentProcessor
            .As<IPaymentAttemptProcessor>()
            .Verify(
                p =>
                    p.StartPayment(
                        It.IsAny<Instance>(),
                        It.IsAny<OrderDetails>(),
                        It.IsAny<string?>(),
                        It.IsAny<Guid>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );

    private void VerifyReceiptLanguage(string language) =>
        _pdfService.Verify(p =>
            p.GeneratePdf(
                It.IsAny<Instance>(),
                "Task_2",
                language,
                It.IsAny<List<string>?>(),
                It.IsAny<bool>(),
                It.IsAny<StorageAuthenticationMethod?>(),
                It.IsAny<CancellationToken>()
            )
        );

    private static OrderDetails CreateOrderDetails(decimal priceExVat) =>
        new()
        {
            PaymentProcessorId = PaymentProcessorId,
            Receiver = new PaymentReceiver(),
            Currency = "NOK",
            OrderLines =
            [
                new PaymentOrderLine
                {
                    Id = "fee",
                    Name = "Fee",
                    PriceExVat = priceExVat,
                    Quantity = 1,
                    VatPercent = 25,
                },
            ],
        };

    private static PaymentInformation CreatePaymentInformation(PaymentStatus status, Guid? mailboxId) =>
        new()
        {
            TaskId = "Task_2",
            Status = status,
            OrderDetails = CreateOrderDetails(100),
            PaymentDetails = new PaymentDetails { PaymentId = "test-payment-id", RedirectUrl = CheckoutUrl },
            Language = "en",
            MailboxId = mailboxId,
        };

    /// <summary>Stores a payment record as an earlier visit to the task left it.</summary>
    private static void StorePaymentStatus(PaymentStatus status, Guid? mailboxId = null)
    {
        Directory.CreateDirectory(
            Path.Join(TestData.GetDataDirectory(Org, App, InstanceOwnerPartyId, _instanceGuid), "blob")
        );
        File.WriteAllBytes(
            TestData.GetDataElementPath(Org, App, InstanceOwnerPartyId, _instanceGuid, _paymentDataGuid),
            JsonSerializer.SerializeToUtf8Bytes(
                new DataElement
                {
                    Id = _paymentDataGuid.ToString(),
                    InstanceGuid = _instanceGuid.ToString(),
                    DataType = "paymentInformation",
                    Filename = "paymentInformation.json",
                    ContentType = "application/json",
                },
                _jsonSerializerOptions
            )
        );
        File.WriteAllBytes(
            TestData.GetDataBlobPath(Org, App, InstanceOwnerPartyId, _instanceGuid, _paymentDataGuid),
            JsonSerializer.SerializeToUtf8Bytes(CreatePaymentInformation(status, mailboxId), _jsonSerializerOptions)
        );
    }

    private async Task<HttpResponseMessage> Pay(HttpClient client, string language = "nb")
    {
        using var content = new StringContent("""{"action":"pay"}""", Encoding.UTF8, "application/json");
        return await client.PostAsync($"{InstanceUrl}/actions?language={language}", content);
    }

    private async Task<HttpResponseMessage> PostToPayment(HttpClient client, string endpoint, string language = "nb") =>
        await client.PostAsync($"{InstanceUrl}/payment/{endpoint}?language={language}", content: null);

    private async Task<HttpResponseMessage> ProcessNext(HttpClient client, string? action)
    {
        using var content = new StringContent(
            action is null ? "{}" : $$"""{"action":"{{action}}"}""",
            Encoding.UTF8,
            "application/json"
        );
        return await client.PutAsync($"{InstanceUrl}/process/next", content);
    }

    private async Task<JsonObject> GetProcess(HttpClient client) =>
        await client.GetFromJsonAsync<JsonObject>($"{InstanceUrl}/process")
        ?? throw new InvalidOperationException("No process state.");

    private async Task<HttpResponseMessage> PostWebhook(
        HttpClient client,
        string eventName,
        Guid? mailboxId,
        Guid? instanceGuid = null
    )
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid ?? _instanceGuid}/payment/nets-webhook-listener{(mailboxId is { } id ? $"/{id}" : "")}"
        );
        request.Headers.TryAddWithoutValidation("Authorization", WebhookSecret);
        request.Content = new StringContent(
            $$"""
            {
              "id": "01ba0a0a7b2b4d6f9e2b2d0d6c4f7e8a",
              "merchantId": 0,
              "timestamp": "2026-10-22T08:10:00.0000+00:00",
              "event": "{{eventName}}",
              "data": { "paymentId": "test-payment-id" }
            }
            """,
            Encoding.UTF8,
            "application/json"
        );
        return await client.SendAsync(request);
    }

    private async Task<Instance> ReadInstance() =>
        await Services
            .GetRequiredService<IInstanceClient>()
            .GetInstance(App, Org, InstanceOwnerPartyId, _instanceGuid, StorageAuthenticationMethod.ServiceOwner());

    private async Task<PaymentInformation> ReadRecord()
    {
        (_, PaymentInformation? paymentInformation) = await Services
            .GetRequiredService<IDataService>()
            .GetByType<PaymentInformation>(
                await ReadInstance(),
                "paymentInformation",
                StorageAuthenticationMethod.ServiceOwner()
            );
        return paymentInformation ?? throw new InvalidOperationException("No payment record.");
    }

    private static List<string?> GetIssueCodes(string problemDetails) =>
        (JsonNode.Parse(problemDetails)?["validationIssues"]?.AsArray() ?? [])
            .Select(issue => issue?["code"]?.GetValue<string>())
            .ToList();

    /// <summary>Records who each process event a save writes says acted.</summary>
    private sealed class ProcessEventRecorder(IInstanceMutationClient inner, List<PlatformUser> users)
        : IInstanceMutationClient
    {
        public Task<InstanceMutationWithStorageMetadata> CommitInstanceMutationWithStorageMetadata(
            int instanceOwnerPartyId,
            Guid instanceGuid,
            StorageInstanceMutationRequest mutation,
            IReadOnlyDictionary<string, StorageInstanceMutationContent> contentParts,
            StorageAuthenticationMethod? authenticationMethod = null,
            StorageWritePreconditions? preconditions = null,
            CancellationToken cancellationToken = default
        )
        {
            lock (users)
            {
                users.AddRange(mutation.ProcessState?.Events?.Select(instanceEvent => instanceEvent.User) ?? []);
            }

            return inner.CommitInstanceMutationWithStorageMetadata(
                instanceOwnerPartyId,
                instanceGuid,
                mutation,
                contentParts,
                authenticationMethod,
                preconditions,
                cancellationToken
            );
        }
    }

    /// <summary>
    /// Holds the next save that updates a data element, once the test asks for it, while the test's action runs, and
    /// commits it before any save that action makes: a step run again then reads before that save and saves after it.
    /// </summary>
    private sealed class SaveHolder(IInstanceMutationClient inner, PaymentTaskProcessTests test)
        : IInstanceMutationClient
    {
        public async Task<InstanceMutationWithStorageMetadata> CommitInstanceMutationWithStorageMetadata(
            int instanceOwnerPartyId,
            Guid instanceGuid,
            StorageInstanceMutationRequest mutation,
            IReadOnlyDictionary<string, StorageInstanceMutationContent> contentParts,
            StorageAuthenticationMethod? authenticationMethod = null,
            StorageWritePreconditions? preconditions = null,
            CancellationToken cancellationToken = default
        )
        {
            Task<InstanceMutationWithStorageMetadata> Commit() =>
                inner.CommitInstanceMutationWithStorageMetadata(
                    instanceOwnerPartyId,
                    instanceGuid,
                    mutation,
                    contentParts,
                    authenticationMethod,
                    preconditions,
                    cancellationToken
                );

            if (test._heldSave is { } heldSave)
            {
                test._heldSave = null;
                await heldSave.Value;
            }

            if (test._runAgainAtNextRecordSave is { } runAgain && mutation.UpdateDataElements.Count > 0)
            {
                test._runAgainAtNextRecordSave = null;
                var save = new Lazy<Task<InstanceMutationWithStorageMetadata>>(Commit);
                test._heldSave = save;
                await runAgain();
                test._heldSave = null;
                return await save.Value;
            }

            return await Commit();
        }
    }

    /// <summary>Denies one action, and asks the app's own authorization for everything else.</summary>
    private sealed class DenyingAuthorizationService(IAuthorizationService inner, string deniedAction)
        : IAuthorizationService
    {
        public Task<List<Party>?> GetPartyList(CancellationToken cancellationToken = default) =>
            inner.GetPartyList(cancellationToken);

        public Task<bool?> ValidateSelectedParty(int partyId, CancellationToken cancellationToken = default) =>
            inner.ValidateSelectedParty(partyId, cancellationToken);

        public async Task<bool> AuthorizeAction(
            AppIdentifier appIdentifier,
            InstanceIdentifier instanceIdentifier,
            ClaimsPrincipal user,
            string action,
            string? taskId = null,
            CancellationToken cancellationToken = default
        ) =>
            action != deniedAction
            && await inner.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId, cancellationToken);

        public Task<List<UserAction>> AuthorizeActions(
            Instance instance,
            ClaimsPrincipal user,
            List<AltinnAction> actions,
            CancellationToken cancellationToken = default
        ) => inner.AuthorizeActions(instance, user, actions, cancellationToken);
    }
}
