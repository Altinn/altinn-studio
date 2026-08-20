using System.Text.Json;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;

namespace WorkflowEngine.App.Tests.Commands.AppCommand;

/// <summary>
/// Unit tests for the mailbox block on the app callback: that it says on the wire exactly what the engine
/// decided, and that it says nothing at all on an ordinary callback. The engine owns what a receive step is
/// told, so these are about faithfulness rather than logic — in particular that an absent delivery reaches the
/// app with its reason.
/// </summary>
public class AppCommandMailboxTests
{
    private static readonly Guid _mailboxId = Guid.Parse("018f4e00-0000-7000-8000-00000000ffff");

    private static async Task<AppCallbackPayload> SendWith(MailboxReceipt? receipt)
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = fixture.GetAppCommand();
        var data = new AppCommandData { CommandKey = "handle-reply" };
        var step = AppCommandTestFixture.CreateStep(
            App.Commands.AppCommand.AppCommand.Create(data),
            operationId: "handle-reply"
        );
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data, mailboxReceipt: receipt);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);
        Assert.Equal(ExecutionStatus.Success, result.Status);

        var body = Assert.Single(fixture.HttpHandler.Requests).Body;
        Assert.NotNull(body);
        return Assert.IsType<AppCallbackPayload>(JsonSerializer.Deserialize<AppCallbackPayload>(body));
    }

    [Fact]
    public async Task Callback_OfAnOrdinaryStep_CarriesNoMailboxBlock()
    {
        // Null rather than present-and-empty: a handler distinguishes "this is a reply handler" from "this is any
        // other command" on the block having a value, so an empty object would be a third state.
        Assert.Null((await SendWith(null)).Mailbox);
    }

    [Fact]
    public async Task Callback_OfAReceiveStepWithItsMessage_CarriesTheMessageAndNoReason()
    {
        var payload = await SendWith(
            MailboxReceipt.Delivered(
                _mailboxId,
                seq: 2,
                new MailboxDelivery
                {
                    IdempotencyKey = "source-msg-3",
                    Payload = """{"status":"confirmed"}""",
                    AcceptedAt = DateTimeOffset.Parse(
                        "2026-08-19T10:11:12Z",
                        System.Globalization.CultureInfo.InvariantCulture
                    ),
                }
            )
        );

        var mailbox = Assert.IsType<AppCallbackMailbox>(payload.Mailbox);
        Assert.Equal(_mailboxId, mailbox.Id);
        Assert.Equal(2L, mailbox.Seq);
        Assert.Null(mailbox.DisposedReason);

        var delivery = Assert.IsType<AppCallbackMailboxDelivery>(mailbox.Delivery);
        Assert.Equal("source-msg-3", delivery.IdempotencyKey);
        Assert.Equal("""{"status":"confirmed"}""", delivery.Payload);
        Assert.Equal(
            DateTimeOffset.Parse("2026-08-19T10:11:12Z", System.Globalization.CultureInfo.InvariantCulture),
            delivery.AcceptedAt
        );
    }

    [Theory]
    [InlineData(MailboxDisposedReason.Request)]
    [InlineData(MailboxDisposedReason.Deadline)]
    public async Task Callback_OfAReceiveStepWithNoMessage_CarriesTheReasonExplicitly(MailboxDisposedReason reason)
    {
        // Both reasons on the wire, because the whole value of carrying one is that the two are told apart.
        var payload = await SendWith(MailboxReceipt.Closed(_mailboxId, seq: 1, reason));

        var mailbox = Assert.IsType<AppCallbackMailbox>(payload.Mailbox);
        Assert.Equal(_mailboxId, mailbox.Id);
        Assert.Equal(1L, mailbox.Seq);
        Assert.Null(mailbox.Delivery);
        Assert.Equal(reason, mailbox.DisposedReason);
    }

    [Fact]
    public async Task Callback_SerializesTheMailboxBlockUnderItsWireNames()
    {
        // Asserted over the raw JSON rather than through a round trip, because the app keeps its own curated copy
        // of this contract and matches on property names.
        using var fixture = AppCommandTestFixture.Create();
        var command = fixture.GetAppCommand();
        var data = new AppCommandData { CommandKey = "handle-reply" };
        var step = AppCommandTestFixture.CreateStep(App.Commands.AppCommand.AppCommand.Create(data));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(
            workflow,
            step,
            data,
            mailboxReceipt: MailboxReceipt.Closed(_mailboxId, seq: 0, MailboxDisposedReason.Deadline)
        );

        await command.Execute(context, TestContext.Current.CancellationToken);

        using var document = JsonDocument.Parse(Assert.Single(fixture.HttpHandler.Requests).Body!);
        var mailbox = document.RootElement.GetProperty("mailbox");

        Assert.Equal(_mailboxId, mailbox.GetProperty("id").GetGuid());
        Assert.Equal(0L, mailbox.GetProperty("seq").GetInt64());
        Assert.Equal(JsonValueKind.Null, mailbox.GetProperty("delivery").ValueKind);
        // Pascal-cased on the wire, as every other engine enum is: FlexibleEnumConverter writes `ToString()` and
        // reads case-insensitively.
        Assert.Equal("Deadline", mailbox.GetProperty("disposedReason").GetString());
    }
}
