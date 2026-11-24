using System.Text;
using System.Text.Json;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmeldingkvittering;
using KS.Fiks.Arkiv.Models.V1.Feilmelding;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivServiceTaskTest
{
    private static readonly Guid _workflowId = Guid.Parse("2f4bd7b5-19f0-4bd0-bd0c-9c7ec6f45a4a");
    private static readonly Guid _workflowStepId = Guid.Parse("9ec7e888-8f05-423c-a54c-572f36b121ef");
    private static readonly Guid _replyAddressId = Guid.Parse("c0ffee11-1111-4a1a-9c3d-4d5e6f708192");
    private static readonly DateTimeOffset _executionReferenceTime = DateTimeOffset.Parse("2026-05-17T10:15:30+02:00");

    [Fact]
    public async Task Define_ComposesOneExternalStageWithTheArchiveTimeoutAndTimeoutHandler()
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture();

        ServiceTaskPipeline pipeline = fixture.FiksArkivPipeline;

        // The send and every reply are one item: replies run at the send's index, and nothing follows them.
        var stage = Assert.IsType<ServiceTaskItem.ExternalStage>(Assert.Single(pipeline.Items));
        Assert.Equal(TimeSpan.FromDays(7), stage.Timeout);
        Assert.Null(stage.StepOptions);

        // The composed timeout handler is the task's own, not the runtime's default failure.
        Assert.NotNull(stage.OnTimeout);
        var failed = Assert.IsType<FailedServiceTaskResult>(await stage.OnTimeout(CreateContext(dataMutator.Object)));
        Assert.Contains("never confirmed the record", failed.ErrorMessage);
    }

    [Fact]
    public async Task SendToArchive_SendsWithTheReplyAddress_AndCompletesTheStage()
    {
        var instance = CreateInstance();
        var dataMutator = InstanceDataMutatorMockFactory(instance);
        var sender = new Mock<IFiksArkivMessageSender>(MockBehavior.Strict);
        sender
            .Setup(x =>
                x.GenerateAndSendMessage(
                    "Task_1",
                    "no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett",
                    _workflowStepId,
                    _replyAddressId,
                    _executionReferenceTime,
                    dataMutator.Object,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(TestHelpers.GetFiksIOMessageResponse())
            .Verifiable(Times.Once);

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(sender.Object);
        });

        ServiceTaskResult result = await Send(fixture)(CreateContext(dataMutator.Object), ReplyAddressFactory());

        Assert.IsType<CompletedServiceTaskResult>(result);
        sender.Verify();
    }

    [Fact]
    public async Task SendToArchive_SameStageRetryUsesSameIdentities_ANewPassUsesNewOnes()
    {
        var instance = CreateInstance();
        var dataMutator = InstanceDataMutatorMockFactory(instance);
        var sender = new Mock<IFiksArkivMessageSender>(MockBehavior.Strict);
        var received = new List<(Guid SendersReference, Guid ReplyAddress)>();
        sender
            .Setup(x =>
                x.GenerateAndSendMessage(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<DateTimeOffset>(),
                    dataMutator.Object,
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (
                    string _,
                    string _,
                    Guid sendersReference,
                    Guid replyAddress,
                    DateTimeOffset _,
                    IInstanceDataMutator _,
                    CancellationToken _
                ) => received.Add((sendersReference, replyAddress))
            )
            .ReturnsAsync(TestHelpers.GetFiksIOMessageResponse());

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(sender.Object);
        });

        Guid laterReplyAddressId = Guid.Parse("76aec9b6-ea01-41ed-bad2-828cdf7f2bb2");
        Guid laterStepId = Guid.Parse("2b0e0f8c-24a1-4d6a-9d3e-6a3b2f1c0d97");
        var send = Send(fixture);
        await send(CreateContext(dataMutator.Object), ReplyAddressFactory());
        await send(CreateContext(dataMutator.Object), ReplyAddressFactory());
        await send(CreateContext(dataMutator.Object, stepId: laterStepId), ReplyAddressFactory(laterReplyAddressId));

        Assert.Equal(
            [
                (_workflowStepId, _replyAddressId),
                (_workflowStepId, _replyAddressId),
                (laterStepId, laterReplyAddressId),
            ],
            received
        );
    }

    [Fact]
    public async Task SendToArchive_WithoutAStepId_ReturnsPermanentFailureWithoutHostOrMutatorSideEffects()
    {
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        var sender = new Mock<IFiksArkivMessageSender>(MockBehavior.Strict);
        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(sender.Object);
        });

        ServiceTaskResult result = await Send(fixture)(
            CreateContext(dataMutator.Object, stepId: Guid.Empty),
            ReplyAddressFactory()
        );

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("did not supply a step id", failed.ErrorMessage);
        sender.VerifyNoOtherCalls();
        dataMutator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SendToArchive_FailedSend_ReturnsRetryableFailure()
    {
        // A transient failure may succeed on the retry, so errorHandling does not divert it: it covers only an
        // archiving that cannot succeed.
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { Action = "reject" },
        };
        var instance = CreateInstance();
        var dataMutator = InstanceDataMutatorMockFactory(instance);
        var sender = FailingSenderMockFactory(new TimeoutException("Fiks unavailable"));
        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(sender.Object);
            },
            [("CustomFiksArkivSettings", settings)]
        );

        ServiceTaskResult result = await Send(fixture)(CreateContext(dataMutator.Object), ReplyAddressFactory());

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        Assert.Equal("Fiks unavailable", failed.ErrorMessage);
        sender.Verify();
    }

    [Fact]
    public async Task SendToArchive_CutOffAtTheExecutionDeadline_FailsRatherThanReportingSuccess()
    {
        // Cut off at the execution deadline, the shipment may or may not have left — never the end of the task.
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { Action = "reject" },
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var sender = FailingSenderMockFactory(new OperationCanceledException("attempt deadline"));
        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(sender.Object);
            },
            [("CustomFiksArkivSettings", settings)]
        );

        using var cancelled = new CancellationTokenSource();
        await cancelled.CancelAsync();

        ServiceTaskResult result = await Send(fixture)(
            CreateContext(dataMutator.Object, cancellationToken: cancelled.Token),
            ReplyAddressFactory()
        );

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        Assert.Contains("cut off at this attempt's execution deadline", failed.ErrorMessage);
        sender.Verify();
    }

    /// <summary>
    /// Load-bearing: <c>MaskinportenException</c> wraps transport failures and 5xx as well as refusals, and
    /// even a genuine refusal can heal (key rollover, clock skew). Ending the task on it would advance the
    /// process past a shipment that never left, or close the reply address over a passing outage — so it retries,
    /// whatever <c>errorHandling</c> says.
    /// </summary>
    [Fact]
    public async Task SendToArchive_MaskinportenFailure_ReturnsRetryableFailureAndEndsNothing()
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { Action = "reject" },
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var sender = FailingSenderMockFactory(
            new Altinn.App.Core.Features.Maskinporten.Exceptions.MaskinportenAuthenticationException(
                "token request refused"
            )
        );
        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(sender.Object);
            },
            [("CustomFiksArkivSettings", settings)]
        );

        ServiceTaskResult result = await Send(fixture)(CreateContext(dataMutator.Object), ReplyAddressFactory());

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        sender.Verify();
    }

    [Fact]
    public async Task SendToArchive_RecipientNotFound_EndsTheTaskDownTheErrorHandlingPathWithoutWaiting()
    {
        // Deterministic and case-level — the recipient comes from the instance's own data — so this send
        // fails identically every time and ends the task exactly as an archive rejection does. Ending it from the
        // send, rather than completing, means the task never waits for replies to a shipment that never left.
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { Action = "archive-failed" },
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var sender = FailingSenderMockFactory(
            new KS.Fiks.IO.Send.Client.Exceptions.FiksIOSendUnexpectedResponseException(
                "Send failed with status code NotFound"
            )
        );
        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(sender.Object);
            },
            [("CustomFiksArkivSettings", settings)]
        );

        ServiceTaskResult result = await Send(fixture)(CreateContext(dataMutator.Object), ReplyAddressFactory());

        var ended = Assert.IsType<EndedServiceTaskResult>(result);
        Assert.Equal("archive-failed", ended.Action);
        sender.Verify();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SendToArchive_RecipientNotFound_WithoutAnAction_EndsTheTaskWithReject(
        bool errorHandlingConfigured
    )
    {
        // An omitted errorHandling block and one without an action mean the same thing: the archiving cannot
        // succeed, so the process moves on with `reject` for the gateway after the task to route.
        var settings = errorHandlingConfigured
            ? new FiksArkivSettings { ErrorHandling = new FiksArkivErrorHandlingSettings() }
            : new FiksArkivSettings();
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var sender = FailingSenderMockFactory(
            new KS.Fiks.IO.Send.Client.Exceptions.FiksIOSendUnexpectedResponseException(
                "Send failed with status code NotFound"
            )
        );
        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(sender.Object);
            },
            [("CustomFiksArkivSettings", settings)]
        );

        ServiceTaskResult result = await Send(fixture)(CreateContext(dataMutator.Object), ReplyAddressFactory());

        var ended = Assert.IsType<EndedServiceTaskResult>(result);
        Assert.Equal("reject", ended.Action);
        sender.Verify();
    }

    /// <summary>
    /// Deterministic but app-level: refused integration credentials are an operations problem no citizen
    /// action helps, so errorHandling is never consulted — and a failure, never the end of the task, because
    /// ending it closes the reply address and an operator who fixes the credentials and resumes would re-run a
    /// send whose answers could never be delivered.
    /// </summary>
    [Fact]
    public async Task SendToArchive_CredentialsRefused_FailsTheWorkflow()
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { Action = "reject" },
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var sender = FailingSenderMockFactory(
            new KS.Fiks.IO.Send.Client.Exceptions.FiksIOSendUnauthorizedException("credentials refused")
        );
        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(sender.Object);
            },
            [("CustomFiksArkivSettings", settings)]
        );

        ServiceTaskResult result = await Send(fixture)(CreateContext(dataMutator.Object), ReplyAddressFactory());

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("integration credentials", failed.ErrorMessage);
        Assert.Contains("resume the workflow", failed.ErrorMessage);
        sender.Verify();
    }

    [Fact]
    public async Task HandleArchiveTimeout_FailsPermanentlyInOneMessage()
    {
        // The reply address closing on its deadline and an operator closing it are the same outcome for this
        // task, and the handler is not told which: one message covers both.
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var messageHandler = new Mock<IFiksArkivMessageHandler>(MockBehavior.Strict);
        await using var fixture = CreateFixture(messageHandler: messageHandler);

        ServiceTaskResult result = await OnTimeout(fixture)(CreateContext(dataMutator.Object));

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("never confirmed the record", failed.ErrorMessage);
        Assert.Contains("the reply address closed before a receipt arrived", failed.ErrorMessage);
        Assert.Contains("manual follow-up", failed.ErrorMessage);
        dataMutator.VerifyNoOtherCalls();
        messageHandler.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleArchiveReply_Acknowledgement_AwaitsTheNextReply()
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var loggerMock = new Mock<ILogger<FiksArkivServiceTask>>();
        await using var fixture = CreateFixture(logger: loggerMock);
        ServiceTaskReply reply = ReplyFactory(
            FiksArkivMeldingtype.ArkivmeldingOpprettMottatt,
            payloads: [("mottatt.xml", "<mottatt />")]
        );

        ServiceTaskReplyResult result = await OnReply(fixture)(CreateContext(dataMutator.Object), reply);

        Assert.IsType<ServiceTaskAwaitNextReplyResult>(result);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, "has received the record", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleArchiveReply_UnknownMessageType_AwaitsTheNextReply()
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var loggerMock = new Mock<ILogger<FiksArkivServiceTask>>();
        await using var fixture = CreateFixture(logger: loggerMock);
        ServiceTaskReply reply = ReplyFactory("no.ks.fiks.arkiv.v1.something.we.do.not.model");

        ServiceTaskReplyResult result = await OnReply(fixture)(CreateContext(dataMutator.Object), reply);

        Assert.IsType<ServiceTaskAwaitNextReplyResult>(result);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Warning, "is not a type this task models", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleArchiveReply_Receipt_SavesTheConfirmationRecordAndEndsTheTask()
    {
        var existingReceipt = new DataElement
        {
            Id = "05c4b1cf-9a4e-4a7c-9b3f-1f2e3d4c5b6a",
            DataType = "fiks-receipt",
            Filename = "fiks-receipt.xml",
        };
        var instance = CreateInstance();
        instance.Data = [existingReceipt];
        var dataMutator = InstanceDataMutatorMockFactory(instance);
        ReadOnlyMemory<byte>? savedReceipt = null;
        dataMutator.Setup(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>())).Verifiable(Times.Once);
        dataMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    "fiks-receipt",
                    "application/xml",
                    "fiks-receipt.xml",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    "Task_1",
                    It.IsAny<List<KeyValueEntry>?>()
                )
            )
            .Callback(
                (string _, string _, string _, ReadOnlyMemory<byte> data, string? _, List<KeyValueEntry>? _) =>
                    savedReceipt = data
            )
            .Returns((BinaryDataChange)null!)
            .Verifiable(Times.Once);

        await using var fixture = CreateFixture();

        ServiceTaskReply reply = ReceiptReplyFactory(SuccessfulArchiveReceipt());

        ServiceTaskReplyResult result = await OnReply(fixture)(CreateContext(dataMutator.Object), reply);

        var ended = Assert.IsType<EndedServiceTaskResult>(result);
        Assert.Equal("fiks-arkiv-success", ended.Action);
        dataMutator.Verify();
        Assert.NotNull(savedReceipt);
        Assert.Contains("arkivmeldingKvittering", Encoding.UTF8.GetString(savedReceipt.Value.Span));
    }

    [Fact]
    public async Task HandleArchiveReply_Receipt_WithoutSuccessHandlingConfigured_AdvancesWithNoAction()
    {
        // The default: the process moves on along its default flow.
        var settings = SettingsWithReceipt(successHandling: null);
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        AllowAnyBinaryDataElement(dataMutator);
        await using var fixture = CreateFixture(settings);

        ServiceTaskReplyResult result = await OnReply(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(SuccessfulArchiveReceipt())
        );

        var ended = Assert.IsType<EndedServiceTaskResult>(result);
        Assert.Null(ended.Action);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task HandleArchiveReply_ErrorMessage_WithoutAnAction_EndsTheTaskWithReject(bool blockPresent)
    {
        // An omitted errorHandling block and one without an action mean the same thing: the archive will not
        // answer differently if asked again, so the process moves on with `reject` for the gateway to route.
        var settings = new FiksArkivSettings
        {
            ErrorHandling = blockPresent ? new FiksArkivErrorHandlingSettings() : null,
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture(settings);

        ServiceTaskReplyResult result = await OnReply(fixture)(
            CreateContext(dataMutator.Object),
            ReplyFactory(FiksArkivMeldingtype.Ikkefunnet)
        );

        var ended = Assert.IsType<EndedServiceTaskResult>(result);
        Assert.Equal("reject", ended.Action);
    }

    [Theory]
    [InlineData(FiksArkivMeldingtype.Ugyldigforespørsel)]
    [InlineData(FiksArkivMeldingtype.Serverfeil)]
    [InlineData(FiksArkivMeldingtype.Ikkefunnet)]
    public async Task HandleArchiveReply_ErrorMessage_EndsTheTaskDownTheConfiguredPath(string messageType)
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { Action = "archive-failed" },
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture(settings);

        ServiceTaskReplyResult result = await OnReply(fixture)(
            CreateContext(dataMutator.Object),
            ReplyFactory(messageType)
        );

        var ended = Assert.IsType<EndedServiceTaskResult>(result);
        Assert.Equal("archive-failed", ended.Action);
    }

    [Fact]
    public async Task HandleArchiveReply_ReceiptReportingFailure_IsTreatedAsAnError()
    {
        var settings = new FiksArkivSettings();
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture(settings);

        var failedReceipt = new ArkivmeldingKvittering
        {
            MappeFeilet = new Ugyldigforespoersel { Feilmelding = "Saksmappen kunne ikke opprettes" },
        };

        ServiceTaskReplyResult result = await OnReply(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(failedReceipt)
        );

        var ended = Assert.IsType<EndedServiceTaskResult>(result);
        Assert.Equal("reject", ended.Action);
    }

    [Fact]
    public async Task HandleArchiveReply_ReceiptWithoutAReadablePayload_FailsRatherThanAdvancingWithoutEvidence()
    {
        // Advancing without the confirmation record would assert an outcome the process cannot show; the
        // unreadable message stays available in the reply address's record.
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture();
        ServiceTaskReply reply = ReplyFactory(
            FiksArkivMeldingtype.ArkivmeldingOpprettKvittering,
            payloads: [("arkivmelding-kvittering.xml", "not xml at all")]
        );

        ServiceTaskReplyResult result = await OnReply(fixture)(CreateContext(dataMutator.Object), reply);

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("could not be read as an archive receipt", failed.ErrorMessage);
        dataMutator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleArchiveReply_ReceiptWithNoPayloadsAtAll_FailsTheSameWay()
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture();

        ServiceTaskReplyResult result = await OnReply(fixture)(
            CreateContext(dataMutator.Object),
            ReplyFactory(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering)
        );

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
    }

    [Fact]
    public async Task HandleArchiveReply_UnreadableDeliveredMessage_FailsPermanently()
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture();
        ServiceTaskReply reply = new()
        {
            IdempotencyKey = "fiks-io-message-id",
            Payload = "this is not the JSON the subscriber delivers",
            AcceptedAt = _executionReferenceTime,
            Position = 0,
        };

        ServiceTaskReplyResult result = await OnReply(fixture)(CreateContext(dataMutator.Object), reply);

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("could not be read", failed.ErrorMessage);
        Assert.Contains("fiks-io-message-id", failed.ErrorMessage);
    }

    [Theory]
    [InlineData(FiksArkivMeldingtype.ArkivmeldingOpprettMottatt, false)]
    [InlineData(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering, false)]
    [InlineData("no.ks.fiks.arkiv.v1.something.we.do.not.model", false)]
    [InlineData(FiksArkivMeldingtype.Serverfeil, true)]
    [InlineData(FiksArkivMeldingtype.Ikkefunnet, true)]
    [InlineData(FiksArkivMeldingtype.Ugyldigforespørsel, true)]
    public async Task HandleArchiveReply_CallsTheMessageHandlerForEveryMessage(string messageType, bool expectError)
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        AllowAnyBinaryDataElement(dataMutator);
        var messageHandler = new Mock<IFiksArkivMessageHandler>(MockBehavior.Strict);
        FiksArkivReceivedMessage? seenMessage = null;
        StageContext? seenContext = null;
        messageHandler
            .Setup(x => x.HandleMessage(It.IsAny<FiksArkivReceivedMessage>(), It.IsAny<StageContext>()))
            .Callback(
                (FiksArkivReceivedMessage message, StageContext context) =>
                {
                    seenMessage = message;
                    seenContext = context;
                }
            )
            .Returns(Task.CompletedTask);

        await using var fixture = CreateFixture(messageHandler: messageHandler);

        StageContext context = CreateContext(dataMutator.Object);
        await OnReply(fixture)(context, ReceiptOrPlainReply(messageType));

        Assert.NotNull(seenMessage);
        Assert.Equal(expectError, seenMessage.IsError);
        Assert.Equal(messageType, seenMessage.MessageType);
        Assert.Equal(_deliveredMessageId, seenMessage.MessageId);
        Assert.Same(context, seenContext);
        messageHandler.Verify(
            x => x.HandleMessage(It.IsAny<FiksArkivReceivedMessage>(), It.IsAny<StageContext>()),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleArchiveReply_AFailingMessageHandler_IsRetryableAndEndsNothing()
    {
        // The message is frozen at its position, so a retry hands the same message to the same handler — what
        // a transient app dependency needs. The strict mocks prove nothing was saved or advanced.
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var messageHandler = new Mock<IFiksArkivMessageHandler>(MockBehavior.Strict);
        messageHandler
            .Setup(x => x.HandleMessage(It.IsAny<FiksArkivReceivedMessage>(), It.IsAny<StageContext>()))
            .ThrowsAsync(new InvalidOperationException("the app's notification service is down"));

        await using var fixture = CreateFixture(messageHandler: messageHandler);

        ServiceTaskReplyResult result = await OnReply(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(SuccessfulArchiveReceipt())
        );

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        Assert.Contains(nameof(IFiksArkivMessageHandler), failed.ErrorMessage);
        Assert.Contains("the app's notification service is down", failed.ErrorMessage);
        dataMutator.VerifyNoOtherCalls();
    }

    private static Func<StageContext, ReplyAddress, Task<ServiceTaskResult>> Send(TestFixture fixture) =>
        ArchiveStage(fixture).Send;

    private static Func<StageContext, ServiceTaskReply, Task<ServiceTaskReplyResult>> OnReply(TestFixture fixture) =>
        ArchiveStage(fixture).OnReply;

    private static Func<StageContext, Task<ServiceTaskResult>> OnTimeout(TestFixture fixture) =>
        ArchiveStage(fixture).OnTimeout ?? throw new InvalidOperationException("The archive stage has no onTimeout.");

    private static ServiceTaskItem.ExternalStage ArchiveStage(TestFixture fixture) =>
        Assert.IsType<ServiceTaskItem.ExternalStage>(Assert.Single(fixture.FiksArkivPipeline.Items));

    private static ReplyAddress ReplyAddressFactory(Guid? replyAddressId = null) =>
        new() { Id = replyAddressId ?? _replyAddressId, Deadline = _executionReferenceTime + TimeSpan.FromDays(7) };

    private static FiksArkivSettings SettingsWithReceipt(FiksArkivSuccessHandlingSettings? successHandling) =>
        new()
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "archive-record-type" },
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "confirmation-record-type" },
            },
            SuccessHandling = successHandling,
        };

    private static TestFixture CreateFixture(
        FiksArkivSettings? settings = null,
        Mock<ILogger<FiksArkivServiceTask>>? logger = null,
        Mock<IFiksArkivMessageHandler>? messageHandler = null
    )
    {
        void Configure(IServiceCollection services)
        {
            services.AddSingleton(new Mock<IFiksArkivMessageSender>(MockBehavior.Strict).Object);
            if (logger is not null)
                services.AddSingleton(logger.Object);
            if (messageHandler is not null)
                services.AddSingleton(messageHandler.Object);
        }

        return settings is null
            ? TestFixture.Create(services =>
            {
                services.AddFiksArkiv();
                Configure(services);
            })
            : TestFixture.Create(
                services =>
                {
                    services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                    Configure(services);
                },
                [("CustomFiksArkivSettings", settings)]
            );
    }

    private static void AllowAnyBinaryDataElement(Mock<IInstanceDataMutator> dataMutator) =>
        dataMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                )
            )
            .Returns((BinaryDataChange)null!);

    private static ArkivmeldingKvittering SuccessfulArchiveReceipt() => new();

    private static ServiceTaskReply ReceiptOrPlainReply(string messageType) =>
        messageType == FiksArkivMeldingtype.ArkivmeldingOpprettKvittering
            ? ReceiptReplyFactory(SuccessfulArchiveReceipt())
            : ReplyFactory(messageType);

    private static ServiceTaskReply ReceiptReplyFactory(ArkivmeldingKvittering receipt) =>
        ReplyFactory(
            FiksArkivMeldingtype.ArkivmeldingOpprettKvittering,
            payloads: [("arkivmelding-kvittering.xml", Encoding.UTF8.GetString(receipt.SerializeXml().Span))]
        );

    private static readonly Guid _deliveredMessageId = Guid.Parse("18b6b0b3-9a4e-4b2a-9e2f-9b1a5e2d4c11");

    private static ServiceTaskReply ReplyFactory(
        string messageType,
        (string Filename, string Content)[]? payloads = null
    )
    {
        var stored = new StoredFiksArkivMessage
        {
            MessageId = _deliveredMessageId,
            MessageType = messageType,
            CorrelationId = _replyAddressId.ToString(),
            Payloads =
            [
                .. (payloads ?? []).Select(x => new StoredFiksArkivPayload
                {
                    Filename = x.Filename,
                    Content = x.Content,
                }),
            ],
        };

        return new ServiceTaskReply
        {
            IdempotencyKey = _deliveredMessageId.ToString(),
            Payload = JsonSerializer.Serialize(stored),
            AcceptedAt = _executionReferenceTime,
            Position = 0,
        };
    }

    private static Instance CreateInstance() =>
        new()
        {
            Id = "12345/27fde586-4078-4c16-8c5f-ec406f1b17de",
            InstanceOwner = new InstanceOwner { PartyId = "12345" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

    private static StageContext CreateContext(
        IInstanceDataMutator dataMutator,
        Guid? stepId = null,
        CancellationToken cancellationToken = default
    ) =>
        new()
        {
            InstanceDataMutator = dataMutator,
            WorkflowId = _workflowId,
            StepId = stepId ?? _workflowStepId,
            ExecutionReferenceTime = _executionReferenceTime,
            CancellationToken = cancellationToken,
        };

    private static Mock<IInstanceDataMutator> InstanceDataMutatorMockFactory(Instance instance)
    {
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        dataMutator.Setup(x => x.Instance).Returns(instance);
        return dataMutator;
    }

    private static Mock<IFiksArkivMessageSender> FailingSenderMockFactory(Exception exception)
    {
        var sender = new Mock<IFiksArkivMessageSender>(MockBehavior.Strict);
        sender
            .Setup(x =>
                x.GenerateAndSendMessage(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(exception)
            .Verifiable(Times.Once);
        return sender;
    }
}
