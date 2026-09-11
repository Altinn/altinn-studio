using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Integration.Tests.WorkflowEngine;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.Payment;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class PaymentWorkflowTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Theory]
    [InlineData(PaymentStatus.Created, false)]
    [InlineData(PaymentStatus.Created, true)]
    [InlineData(PaymentStatus.Skipped, false)]
    [InlineData(PaymentStatus.Paid, false)]
    [InlineData(null, false)]
    public async Task Start_CleansEarlierUnpaidPayment_AndReplaysAfterLostStorageCommitResponse(
        PaymentStatus? status,
        bool loseResponse
    )
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.WorkflowCommands, "payment");
        var fixture = fixtureScope.Fixture;
        await Reset(fixture, loseResponse ? "CleanupPayment" : null);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await Seed(fixture, token, "Task_1", status);
        using var next = await fixture.Instances.ProcessNext(token, instance);
        using var process = await next.Read<AppProcessState>();
        Assert.True(process.Response.IsSuccessStatusCode, process.Data.Body);
        Assert.Equal("Task_Payment", process.Data.Model!.CurrentTask!.ElementId);
        using var current = await Get(fixture, instance);
        Assert.Equal(
            status == PaymentStatus.Paid ? 1 : 0,
            current.Data.Model!.Data.Count(x => x.DataType == "payment")
        );
        Assert.DoesNotContain(current.Data.Model.Data, x => x.DataType == "payment-receipt");
        var state = await State(fixture);
        Assert.Equal(status == PaymentStatus.Created ? (loseResponse ? 2 : 1) : 0, state.TerminationCalls);
        Assert.Equal(status == PaymentStatus.Created ? 1 : 0, state.AcceptedTerminations);
        Assert.Equal(loseResponse ? 1 : 0, state.LostResponses);
        AssertCallbacks(state, "CleanupPayment", loseResponse ? 2 : 1);
    }

    [Theory]
    [InlineData(PaymentStatus.Paid, false)]
    [InlineData(PaymentStatus.Paid, true)]
    [InlineData(PaymentStatus.Skipped, false)]
    [InlineData(PaymentStatus.Created, false)]
    [InlineData(null, false)]
    public async Task End_ValidatesPayment_AndAdoptsReceiptAfterLostStorageCommitResponse(
        PaymentStatus? status,
        bool loseResponse
    )
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.WorkflowCommands, "payment");
        var fixture = fixtureScope.Fixture;
        await Reset(fixture, loseResponse ? "CompletePayment" : null);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await Seed(fixture, token, "Task_Payment", status);
        using var next = await fixture.Instances.ProcessNext(token, instance);
        bool completed = status is PaymentStatus.Paid or PaymentStatus.Skipped;
        if (completed)
        {
            using var process = await next.Read<AppProcessState>();
            Assert.True(process.Response.IsSuccessStatusCode, process.Data.Body);
            Assert.Equal("EndEvent_1", process.Data.Model!.EndEvent);
        }
        else
        {
            using var failure = await next.Read<JsonElement>();
            Assert.Equal(HttpStatusCode.InternalServerError, failure.Response.StatusCode);
            Assert.Equal(
                "stepFailed",
                failure.Data.Model.GetProperty("workflowFailure").GetProperty("kind").GetString()
            );
        }
        using var current = await Get(fixture, instance);
        Assert.Equal(status is null ? 0 : 1, current.Data.Model!.Data.Count(x => x.DataType == "payment"));
        var receipts = current.Data.Model.Data.Where(x => x.DataType == "payment-receipt").ToArray();
        var state = await State(fixture);
        Assert.Equal(0, state.TerminationCalls);
        Assert.Equal(loseResponse ? 1 : 0, state.LostResponses);
        AssertCallbacks(state, "CompletePayment", loseResponse ? 2 : 1);
        if (status == PaymentStatus.Paid)
        {
            var receipt = Assert.Single(receipts);
            Assert.Contains(
                receipt.References,
                x =>
                    x.Relation == RelationType.GeneratedFrom
                    && x.ValueType == ReferenceType.Task
                    && x.Value == "Task_Payment"
            );
            if (loseResponse)
                Assert.Equal(state.ReceiptIdBeforeResponseLoss, receipt.Id);
            Assert.True(state.PdfCalls >= 1);
        }
        else
        {
            Assert.Empty(receipts);
            Assert.Equal(0, state.PdfCalls);
        }
        if (!completed)
        {
            Assert.Equal("Task_Payment", current.Data.Model.Process.CurrentTask.ElementId);
            Assert.Equal(422, Assert.Single(state.Callbacks).StatusCode);
        }
    }

    [Theory]
    [InlineData(PaymentStatus.Created, false)]
    [InlineData(PaymentStatus.Created, true)]
    [InlineData(PaymentStatus.Skipped, false)]
    [InlineData(PaymentStatus.Paid, false)]
    public async Task Abandon_CleansOnlyUnpaidPayment_WithoutExecutingCompletion(
        PaymentStatus status,
        bool loseResponse
    )
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.WorkflowCommands, "payment");
        var fixture = fixtureScope.Fixture;
        await Reset(fixture, loseResponse ? "CleanupPayment" : null);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await Seed(fixture, token, "Task_Payment", status);
        using var next = await fixture.Instances.ProcessNext(token, instance, new ProcessNext { Action = "reject" });
        using var process = await next.Read<AppProcessState>();
        Assert.True(process.Response.IsSuccessStatusCode, process.Data.Body);
        Assert.Equal("Task_1", process.Data.Model!.CurrentTask!.ElementId);
        using var current = await Get(fixture, instance);
        Assert.Equal(
            status == PaymentStatus.Paid ? 1 : 0,
            current.Data.Model!.Data.Count(x => x.DataType == "payment")
        );
        var state = await State(fixture);
        Assert.Equal(status == PaymentStatus.Created ? (loseResponse ? 2 : 1) : 0, state.TerminationCalls);
        Assert.Equal(0, state.PdfCalls);
        AssertCallbacks(state, "CleanupPayment", loseResponse ? 2 : 1);
    }

    [Fact]
    public async Task FailedTermination_RetainsPayment_UntilSameWorkflowIsResumed()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.WorkflowCommands, "payment");
        var fixture = fixtureScope.Fixture;
        await Reset(fixture, terminationFailures: -1);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await Seed(fixture, token, "Task_1", PaymentStatus.Created);
        using var next = await fixture.Instances.ProcessNext(token, instance);
        using var failure = await next.Read<JsonElement>();
        Assert.Equal(HttpStatusCode.InternalServerError, failure.Response.StatusCode);
        Guid workflowId = failure.Data.Model.GetProperty("workflowFailure").GetProperty("workflowId").GetGuid();
        using var failed = await Get(fixture, instance);
        var paymentId = Assert.Single(failed.Data.Model!.Data, x => x.DataType == "payment").Id;
        var before = await State(fixture);
        Assert.Equal(3, before.TerminationCalls);
        Assert.Equal(0, before.AcceptedTerminations);
        Guid stepId = Assert.Single(before.Callbacks.Select(x => x.StepId).Distinct());
        using var allow = await fixture.GetDirectAppClient().PostAsync("/test/payment/allow", null);
        allow.EnsureSuccessStatusCode();
        using var resume = await fixture.Instances.ResumeCurrentTask(token, instance);
        using var resumed = await resume.Read<AppProcessState>();
        Assert.True(resumed.Response.IsSuccessStatusCode, resumed.Data.Body);
        Assert.Equal("Task_Payment", resumed.Data.Model!.CurrentTask!.ElementId);
        using var current = await Get(fixture, instance);
        Assert.DoesNotContain(current.Data.Model!.Data, x => x.Id == paymentId);
        var after = await State(fixture);
        Assert.Equal(4, after.TerminationCalls);
        Assert.Equal(1, after.AcceptedTerminations);
        Assert.All(
            after.Callbacks,
            x =>
            {
                Assert.Equal(workflowId, x.WorkflowId);
                Assert.Equal(stepId, x.StepId);
            }
        );
    }

    private static async Task Reset(AppFixture fixture, string? loseCommandResponse = null, int terminationFailures = 0)
    {
        using var reset = await fixture
            .GetDirectAppClient()
            .PostAsJsonAsync("/test/payment/reset", new { terminationFailures, loseCommandResponse });
        reset.EnsureSuccessStatusCode();
    }

    private static async Task<PaymentState> State(AppFixture fixture) =>
        await fixture.GetDirectAppClient().GetFromJsonAsync<PaymentState>("/test/payment/state")
        ?? throw new InvalidOperationException("Missing payment observations.");

    private static void AssertCallbacks(PaymentState state, string key, int count)
    {
        Assert.Equal(count, state.Callbacks.Length);
        Assert.All(state.Callbacks, x => Assert.Equal(key, x.Key));
        Assert.Single(state.Callbacks.Select(x => x.WorkflowId).Distinct());
        Assert.Single(state.Callbacks.Select(x => x.StepId).Distinct());
    }

    private static async Task<AppFixture.ReadApiResponse<Instance>> Get(
        AppFixture fixture,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.Get(await fixture.Auth.GetServiceOwnerToken(), instance);
        var current = await response.Read<Instance>();
        Assert.True(current.Response.IsSuccessStatusCode, current.Data.Body);
        return current;
    }

    private static async Task<AppFixture.ReadApiResponse<Instance>> Seed(
        AppFixture fixture,
        string token,
        string taskId,
        PaymentStatus? status
    )
    {
        DateTime started = new(2024, 1, 2, 12, 0, 0, DateTimeKind.Utc);
        using var created = await fixture.Storage.CreateInstance(
            token,
            new Instance
            {
                InstanceOwner = new InstanceOwner { PartyId = "501337", PersonNumber = "01039012345" },
                Process = new ProcessState
                {
                    StartEvent = "StartEvent_1",
                    Started = started,
                    CurrentTask = new ProcessElementInfo
                    {
                        ElementId = taskId,
                        AltinnTaskType = taskId == "Task_1" ? "data" : "payment",
                        Started = started,
                        Flow = taskId == "Task_1" ? 1 : 2,
                    },
                },
            }
        );
        var instance = await created.Read<Instance>(
            new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } }
        );
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.True(instance.Data.Model is not null, instance.Data.Body);
        string owner = await fixture.Auth.GetServiceOwnerToken();
        using var model = await fixture.Storage.InsertData(
            owner,
            instance,
            "model",
            "<model><property1>2</property1><property2>2</property2></model>",
            "application/xml"
        );
        Assert.Equal(HttpStatusCode.Created, model.Response.StatusCode);
        if (status is not null)
        {
            var information = new PaymentInformation
            {
                TaskId = "Task_Payment",
                Status = status.Value,
                OrderDetails = new OrderDetails
                {
                    PaymentProcessorId = "integration-payment",
                    Receiver = new PaymentReceiver { Name = "Receiver" },
                    Currency = "NOK",
                    OrderLines =
                    [
                        new PaymentOrderLine
                        {
                            Id = "line-1",
                            Name = "Order",
                            PriceExVat = 100,
                            Quantity = 1,
                            VatPercent = 25,
                        },
                    ],
                },
                PaymentDetails = new PaymentDetails { PaymentId = "payment-123" },
            };
            using var payment = await fixture.Storage.InsertData(
                owner,
                instance,
                "payment",
                JsonSerializer.Serialize(information, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            );
            Assert.Equal(HttpStatusCode.Created, payment.Response.StatusCode);
        }
        return instance;
    }

    private sealed record PaymentState(
        int TerminationCalls,
        int AcceptedTerminations,
        int PdfCalls,
        int LostResponses,
        string? ReceiptIdBeforeResponseLoss,
        PaymentCallback[] Callbacks
    );

    private sealed record PaymentCallback(string Key, Guid WorkflowId, Guid StepId, int RetryCount, int StatusCode);
}
