using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

/// <summary>
/// Moves an instance through a real payment task over HTTP, with the app's own process engine and an in-process
/// workflow engine. The gateway after the task routes on the action, as in apps made in Studio.
/// </summary>
public class PaymentTaskProcessTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "payment-task";
    private const int InstanceOwnerPartyId = 500600;
    private const string PaymentProcessorId = "Test Payment Processor";
    private const string WebhookSecret = "webhook-secret";
    private static readonly Guid _instanceGuid = Guid.Parse("9a1f3c52-6d0e-4b7a-8c21-5e4f7d1b2a60");
    private static readonly Guid _paymentDataGuid = Guid.Parse("9a1f3c52-6d0e-4b7a-8c21-5e4f7d1b2a61");
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly Mock<IPaymentProcessor> _paymentProcessor = new(MockBehavior.Strict);
    private readonly Mock<IPdfService> _pdfService = new(MockBehavior.Strict);

    public PaymentTaskProcessTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        _paymentProcessor.Setup(p => p.PaymentProcessorId).Returns(PaymentProcessorId);
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
            services.AddSingleton(webhookSecretProvider.Object);
        };
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    [Fact]
    public async Task Confirm_BeforeThePaymentIsPaid_IsRefused_AndTheInstanceStaysIdle()
    {
        StorePaymentStatus(PaymentStatus.Created);
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        using HttpResponseMessage response = await ProcessNext(client, "confirm");

        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(["PaymentNotCompleted"], GetIssueCodes(body));
        Instance instance = await ReadInstance();
        Assert.Equal("Task_2", instance.Process.CurrentTask?.ElementId);
        Assert.NotEqual(Altinn.Platform.Storage.Interface.Enums.ProcessStatus.Processing, instance.Process.Status);
    }

    [Fact]
    public async Task Reject_WhenThePaymentIsPaid_IsRefusedAsAlreadyPaid_WithoutAskingTheProcessor()
    {
        StorePaymentStatus(PaymentStatus.Paid);
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

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
        _paymentProcessor
            .Setup(p =>
                p.TerminatePayment(
                    It.IsAny<Instance>(),
                    It.Is<PaymentInformation>(info => info.PaymentDetails!.PaymentId == "test-payment-id"),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

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

    [Fact]
    public async Task Webhook_WhenThePaymentIsPaid_StoresIt_AndConfirmsTheTaskAsTheServiceOwner()
    {
        // The policy gives the service owner nothing on the payment task: the app moves the process itself.
        StorePaymentStatus(PaymentStatus.Created);
        SetupProcessorStatus(PaymentStatus.Paid);
        using HttpClient client = GetRootedClient(Org, App);

        using HttpResponseMessage response = await PostWebhook(client);

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Instance instance = await ReadInstance();
        Assert.NotNull(instance.Process.Ended);
        Assert.Equal("EndEvent_1", instance.Process.EndEvent);
        Assert.Contains(instance.Data, dataElement => dataElement.DataType == "paymentReceiptPdf");
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(instance));
        // The receipt is in the language the user paid in.
        _pdfService.Verify(p =>
            p.GeneratePdf(
                It.IsAny<Instance>(),
                "Task_2",
                "en",
                It.IsAny<List<string>?>(),
                It.IsAny<bool>(),
                It.IsAny<StorageAuthenticationMethod?>(),
                It.IsAny<CancellationToken>()
            )
        );
    }

    [Fact]
    public async Task Webhook_AfterAnEarlierOneEndedTheProcess_AnswersOk()
    {
        // Nets calls for the checkout and for the charge. The first call already saw the charge and ended the process.
        StorePaymentStatus(PaymentStatus.Created);
        SetupProcessorStatus(PaymentStatus.Paid);
        using HttpClient client = GetRootedClient(Org, App);
        using HttpResponseMessage first = await PostWebhook(client);
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());
        Assert.NotNull((await ReadInstance()).Process.Ended);

        using HttpResponseMessage response = await PostWebhook(client);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Webhook_WhenTheRecordChangesBeforeItsSave_StartsOverFromAFreshRead()
    {
        // The processor's other webhook stores an older answer while this one asks the processor.
        StorePaymentStatus(PaymentStatus.Created);
        int asked = 0;
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
            .Returns(async () =>
            {
                if (asked++ == 0)
                {
                    await Services
                        .GetRequiredService<IDataService>()
                        .UpdateJsonObject(
                            new InstanceIdentifier(InstanceOwnerPartyId, _instanceGuid),
                            "paymentInformation",
                            _paymentDataGuid,
                            CreatePaymentInformation(PaymentStatus.Authorized)
                        );
                }
                return (PaymentStatus.Paid, new PaymentDetails { PaymentId = "test-payment-id", RedirectUrl = "" });
            });
        using HttpClient client = GetRootedClient(Org, App);

        using HttpResponseMessage response = await PostWebhook(client);

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Assert.Equal(2, asked);
        Instance instance = await ReadInstance();
        Assert.Equal("EndEvent_1", instance.Process.EndEvent);
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(instance));
    }

    [Fact]
    public async Task Webhook_WhenThePaymentIsOnlyReserved_StoresIt_AndLeavesTheProcessOnTheTask()
    {
        StorePaymentStatus(PaymentStatus.Created);
        SetupProcessorStatus(PaymentStatus.Authorized);
        using HttpClient client = GetRootedClient(Org, App);

        using HttpResponseMessage response = await PostWebhook(client);

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Instance instance = await ReadInstance();
        Assert.Equal("Task_2", instance.Process.CurrentTask?.ElementId);
        Assert.Equal(PaymentStatus.Authorized, await ReadStoredStatus(instance));
    }

    [Fact]
    public async Task Webhook_StartsTheTransitionOnceMore_WhenAWriteStoppedItFromStarting()
    {
        // A write lands after the webhook read the instance for the transition, and before the transition starts. It
        // only bumps the instance version: validators run in parallel, and writing the payment record would race
        // PaymentTaskValidator's read of the same mock file.
        StorePaymentStatus(PaymentStatus.Created);
        SetupProcessorStatus(PaymentStatus.Paid);
        var validator = new FirstRunActionValidator();
        using HttpClient client = GetRootedClient(
            Org,
            App,
            configureServices: services => services.AddSingleton<IValidator>(validator)
        );
        validator.FirstRun = () =>
            Services
                .GetRequiredService<ApiTestStorageMetadata>()
                .BumpInstance($"{InstanceOwnerPartyId}/{_instanceGuid}");

        using HttpResponseMessage response = await PostWebhook(client);

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Assert.Equal(2, validator.Runs);
        Instance instance = await ReadInstance();
        Assert.Equal("EndEvent_1", instance.Process.EndEvent);
    }

    [Fact]
    public async Task Poll_ThatAskedTheProcessorBeforeTheWebhookStored_ReturnsTheStoredStatus_AndKeepsIt()
    {
        // The form asks while the payment is being charged: the processor still says Authorized to it, and the
        // webhook stores Paid before the form's call saves.
        StorePaymentStatus(PaymentStatus.Created);
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
            .Returns(async () =>
            {
                await Services
                    .GetRequiredService<IDataService>()
                    .UpdateJsonObject(
                        new InstanceIdentifier(InstanceOwnerPartyId, _instanceGuid),
                        "paymentInformation",
                        _paymentDataGuid,
                        CreatePaymentInformation(PaymentStatus.Paid)
                    );
                return (
                    PaymentStatus.Authorized,
                    new PaymentDetails { PaymentId = "test-payment-id", RedirectUrl = "" }
                );
            });
        using HttpClient client = GetPollingClient();

        using HttpResponseMessage response = await GetPayment(client);

        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Paid", JsonNode.Parse(body)?["status"]?.GetValue<string>());
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(await ReadInstance()));
    }

    [Fact]
    public async Task Poll_WhenTheProcessorReportsNothingNew_WritesNothing()
    {
        StorePaymentStatus(PaymentStatus.Authorized);
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
            .ReturnsAsync(
                (
                    PaymentStatus.Authorized,
                    new PaymentDetails
                    {
                        PaymentId = "test-payment-id",
                        RedirectUrl = "https://payment.example/checkout",
                    }
                )
            );
        using HttpClient client = GetPollingClient();
        StorageVersionMetadata before = await ReadVersions();

        using HttpResponseMessage response = await GetPayment(client);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(before, await ReadVersions());
    }

    private void SetupProcessorStatus(PaymentStatus status) =>
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
            .ReturnsAsync((status, new PaymentDetails { PaymentId = "test-payment-id", RedirectUrl = "" }));

    private static PaymentInformation CreatePaymentInformation(PaymentStatus status) =>
        new()
        {
            TaskId = "Task_2",
            Status = status,
            OrderDetails = new OrderDetails
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
                        PriceExVat = 100,
                        Quantity = 1,
                        VatPercent = 25,
                    },
                ],
            },
            PaymentDetails = new PaymentDetails
            {
                PaymentId = "test-payment-id",
                RedirectUrl = "https://payment.example/checkout",
            },
            Language = "en",
        };

    private static void StorePaymentStatus(PaymentStatus status) =>
        File.WriteAllBytes(
            TestData.GetDataBlobPath(Org, App, InstanceOwnerPartyId, _instanceGuid, _paymentDataGuid),
            JsonSerializer.SerializeToUtf8Bytes(CreatePaymentInformation(status), _jsonSerializerOptions)
        );

    private static async Task<HttpResponseMessage> ProcessNext(HttpClient client, string action)
    {
        using var content = new StringContent($$"""{"action":"{{action}}"}""", Encoding.UTF8, "application/json");
        return await client.PutAsync(
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}/process/next",
            content
        );
    }

    private HttpClient GetPollingClient() =>
        GetRootedUserClient(
            Org,
            App,
            1337,
            InstanceOwnerPartyId,
            configureServices: services => services.AddSingleton(Mock.Of<IOrderDetailsCalculator>())
        );

    private static async Task<HttpResponseMessage> GetPayment(HttpClient client) =>
        await client.GetAsync($"{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}/payment");

    private static async Task<HttpResponseMessage> PostWebhook(HttpClient client)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}/payment/nets-webhook-listener"
        );
        request.Headers.TryAddWithoutValidation("Authorization", WebhookSecret);
        request.Content = new StringContent(
            """
            {
              "id": "01ba0a0a7b2b4d6f9e2b2d0d6c4f7e8a",
              "merchantId": 0,
              "timestamp": "2026-10-22T08:10:00.0000+00:00",
              "event": "payment.charge.created.v2",
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

    private async Task<StorageVersionMetadata> ReadVersions() =>
        (
            await Services
                .GetRequiredService<IInstanceClientWithStorageMetadata>()
                .GetInstanceWithStorageMetadata(
                    App,
                    Org,
                    InstanceOwnerPartyId,
                    _instanceGuid,
                    StorageAuthenticationMethod.ServiceOwner()
                )
        ).Metadata;

    private async Task<PaymentStatus?> ReadStoredStatus(Instance instance)
    {
        (_, PaymentInformation? paymentInformation) = await Services
            .GetRequiredService<IDataService>()
            .GetByType<PaymentInformation>(instance, "paymentInformation", StorageAuthenticationMethod.ServiceOwner());
        return paymentInformation?.Status;
    }

    private static List<string?> GetIssueCodes(string problemDetails) =>
        (JsonNode.Parse(problemDetails)?["validationIssues"]?.AsArray() ?? [])
            .Select(issue => issue?["code"]?.GetValue<string>())
            .ToList();

    /// <summary>
    /// Runs <see cref="FirstRun"/> the first time the payment task is validated, as a write that lands between a
    /// request's read of the instance and the transition's start would.
    /// </summary>
    private sealed class FirstRunActionValidator : IValidator
    {
        public Action? FirstRun { get; set; }

        public int Runs { get; private set; }

        public string TaskId => "Task_2";

        public bool NoIncrementalValidation => true;

        public Task<bool> HasRelevantChanges(
            IInstanceDataAccessor dataAccessor,
            string taskId,
            DataElementChanges changes
        ) => throw new UnreachableException("Not called, because NoIncrementalValidation is true.");

        public Task<List<ValidationIssue>> Validate(IInstanceDataAccessor dataAccessor, string taskId, string? language)
        {
            if (Runs++ == 0)
            {
                FirstRun?.Invoke();
            }
            return Task.FromResult<List<ValidationIssue>>([]);
        }
    }
}
