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
    private static readonly Guid _mailboxId = Guid.Parse("c0ffee11-1111-4a1a-9c3d-4d5e6f708192");
    private static readonly DateTimeOffset _executionReferenceTime = DateTimeOffset.Parse("2026-05-17T10:15:30+02:00");

    [Fact]
    public async Task Define_ComposesTheSendStageAndOpensItsMailbox()
    {
        await using var fixture = CreateFixture();

        ServiceTaskPipeline pipeline = fixture.FiksArkivPipeline;

        Assert.Equal(2, pipeline.Items.Count);
        var stage = Assert.IsType<ServiceTaskStage.MailboxOpening>(pipeline.Items[0]);

        Assert.Equal(TimeSpan.FromDays(7), stage.Declaration.Timeout);

        // The send is the pipeline's only stage, so it opens the exchange at item index 0 — and the
        // conclusion, the item after it, answers that exchange.
        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Items[1]);
        Assert.Equal(0, exchange.OpeningIndex);
        Assert.Null(exchange.StepOptions);
    }

    [Fact]
    public async Task SendToArchive_SendsWithTheMailboxIdAsReplyAddress_AndCompletesTheStage()
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
                    _mailboxId,
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

        ServiceTaskOpeningStageResult result = await SendStage(fixture)(
            CreateContext(dataMutator.Object),
            MailboxFactory()
        );

        Assert.IsType<CompletedServiceTaskOpeningStageResult>(result);
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

        Guid laterMailboxId = Guid.Parse("76aec9b6-ea01-41ed-bad2-828cdf7f2bb2");
        Guid laterStepId = Guid.Parse("2b0e0f8c-24a1-4d6a-9d3e-6a3b2f1c0d97");
        var send = SendStage(fixture);
        await send(CreateContext(dataMutator.Object), MailboxFactory());
        await send(CreateContext(dataMutator.Object), MailboxFactory());
        await send(CreateContext(dataMutator.Object, stepId: laterStepId), MailboxFactory(laterMailboxId));

        Assert.Equal(
            [(_workflowStepId, _mailboxId), (_workflowStepId, _mailboxId), (laterStepId, laterMailboxId)],
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

        ServiceTaskOpeningStageResult result = await SendStage(fixture)(
            CreateContext(dataMutator.Object, stepId: Guid.Empty),
            MailboxFactory()
        );

        var failed = Assert.IsType<FailedServiceTaskOpeningStageResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("did not supply a step id", failed.ErrorMessage);
        sender.VerifyNoOtherCalls();
        dataMutator.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SendToArchive_FailedSend_ReturnsRetryableFailureRegardlessOfMoveToNextTask(bool moveToNextTask)
    {
        // A transient failure may succeed on the retry, so MoveToNextTask does not divert it: errorHandling
        // covers only an archiving that cannot succeed.
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = moveToNextTask, Action = "reject" },
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

        ServiceTaskOpeningStageResult result = await SendStage(fixture)(
            CreateContext(dataMutator.Object),
            MailboxFactory()
        );

        var failed = Assert.IsType<FailedServiceTaskOpeningStageResult>(result);
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        Assert.Equal("Fiks unavailable", failed.ErrorMessage);
        sender.Verify();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SendToArchive_CutOffAtTheExecutionDeadline_FailsRatherThanReportingSuccess(bool moveToNextTask)
    {
        // Cut off at the execution deadline, the shipment may or may not have left — never a conclusion.
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = moveToNextTask, Action = "reject" },
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

        ServiceTaskOpeningStageResult result = await SendStage(fixture)(
            CreateContext(dataMutator.Object, cancellationToken: cancelled.Token),
            MailboxFactory()
        );

        var failed = Assert.IsType<FailedServiceTaskOpeningStageResult>(result);
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        Assert.Contains("cut off at this attempt's execution deadline", failed.ErrorMessage);
        sender.Verify();
    }

    /// <summary>
    /// Load-bearing: <c>MaskinportenException</c> wraps transport failures and 5xx as well as refusals, and
    /// even a genuine refusal can heal (key rollover, clock skew). Concluding on it would advance the
    /// process past a shipment that never left, or close the mailbox over a passing outage — so it retries,
    /// whatever <c>errorHandling</c> says.
    /// </summary>
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SendToArchive_MaskinportenFailure_ReturnsRetryableFailureAndConcludesNothing(bool moveToNextTask)
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = moveToNextTask, Action = "reject" },
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

        ServiceTaskOpeningStageResult result = await SendStage(fixture)(
            CreateContext(dataMutator.Object),
            MailboxFactory()
        );

        var failed = Assert.IsType<FailedServiceTaskOpeningStageResult>(result);
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        sender.Verify();
    }

    [Fact]
    public async Task SendToArchive_RecipientNotFound_ConcludesDownTheErrorHandlingPath()
    {
        // Deterministic and case-level — the recipient comes from the instance's own data — so this send
        // fails identically every time and concludes exactly as an archive rejection does.
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = true, Action = "reject" },
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

        ServiceTaskOpeningStageResult result = await SendStage(fixture)(
            CreateContext(dataMutator.Object),
            MailboxFactory()
        );

        var concluded = Assert.IsType<ConcludedServiceTaskOpeningStageResult>(result);
        var success = Assert.IsType<ServiceTaskSuccessResult>(concluded.Result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.Action);
        sender.Verify();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SendToArchive_RecipientNotFound_WithoutMoveToNextTask_ConcludesAsPermanentFailure(
        bool errorHandlingConfigured
    )
    {
        var settings = errorHandlingConfigured
            ? new FiksArkivSettings { ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = false } }
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

        ServiceTaskOpeningStageResult result = await SendStage(fixture)(
            CreateContext(dataMutator.Object),
            MailboxFactory()
        );

        var concluded = Assert.IsType<ConcludedServiceTaskOpeningStageResult>(result);
        var failed = Assert.IsType<ServiceTaskFailedResult>(concluded.Result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("recipient account does not exist", failed.ErrorMessage);
        Assert.Contains("Retrying cannot succeed", failed.ErrorMessage);
        sender.Verify();
    }

    /// <summary>
    /// Deterministic but app-level: refused integration credentials are an operations problem no citizen
    /// action helps, so errorHandling is never consulted — and a plain stage failure, never a conclusion,
    /// because concluding closes the mailbox and an operator who fixes the credentials and resumes would
    /// re-run a send whose answers could never be delivered.
    /// </summary>
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SendToArchive_CredentialsRefused_FailsTheWorkflowRegardlessOfMoveToNextTask(bool moveToNextTask)
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = moveToNextTask, Action = "reject" },
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

        ServiceTaskOpeningStageResult result = await SendStage(fixture)(
            CreateContext(dataMutator.Object),
            MailboxFactory()
        );

        var failed = Assert.IsType<FailedServiceTaskOpeningStageResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("integration credentials", failed.ErrorMessage);
        Assert.Contains("resume the workflow", failed.ErrorMessage);
        sender.Verify();
    }

    [Theory]
    [InlineData(MailboxClosedReason.Deadline, "stayed open for 7 days")]
    [InlineData(MailboxClosedReason.Request, "was closed before a receipt arrived")]
    public async Task HandleArchiveClosed_FailsInItsOwnWords(MailboxClosedReason reason, string expectedWording)
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var messageHandler = new Mock<IFiksArkivMessageHandler>(MockBehavior.Strict);
        await using var fixture = CreateFixture(messageHandler: messageHandler);

        ServiceTaskResult result = await OnClosed(fixture)(CreateContext(dataMutator.Object), reason);

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("never confirmed the record", failed.ErrorMessage);
        Assert.Contains(expectedWording, failed.ErrorMessage);
        Assert.Contains("manual follow-up", failed.ErrorMessage);
        dataMutator.VerifyNoOtherCalls();
        messageHandler.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleArchiveMessage_Acknowledgement_CompletesAndKeepsTheMailboxOpen()
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var loggerMock = new Mock<ILogger<FiksArkivServiceTask>>();
        await using var fixture = CreateFixture(logger: loggerMock);
        ServiceTaskReply reply = ReplyFactory(
            FiksArkivMeldingtype.ArkivmeldingOpprettMottatt,
            payloads: [("mottatt.xml", "<mottatt />")]
        );

        ServiceTaskExchangeResult result = await OnMessage(fixture)(CreateContext(dataMutator.Object), reply);

        Assert.IsType<ServiceTaskAwaitNextReplyResult>(result);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, "has received the record", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleArchiveMessage_UnknownMessageType_CompletesAndKeepsTheMailboxOpen()
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var loggerMock = new Mock<ILogger<FiksArkivServiceTask>>();
        await using var fixture = CreateFixture(logger: loggerMock);
        ServiceTaskReply reply = ReplyFactory("no.ks.fiks.arkiv.v1.something.we.do.not.model");

        ServiceTaskExchangeResult result = await OnMessage(fixture)(CreateContext(dataMutator.Object), reply);

        Assert.IsType<ServiceTaskAwaitNextReplyResult>(result);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Warning, "is not a type this task models", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleArchiveMessage_Receipt_SavesTheConfirmationRecordAndConcludes()
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

        var instanceClient = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(x => x.MarkInstanceComplete(It.IsAny<InstanceIdentifier>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);

        await using var fixture = CreateFixture(instanceClient: instanceClient);

        ServiceTaskReply reply = ReceiptReplyFactory(SuccessfulArchiveReceipt());

        ServiceTaskExchangeResult result = await OnMessage(fixture)(CreateContext(dataMutator.Object), reply);

        var success = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("fiks-arkiv-success", success.Action);
        dataMutator.Verify();
        instanceClient.Verify();
        Assert.NotNull(savedReceipt);
        Assert.Contains("arkivmeldingKvittering", Encoding.UTF8.GetString(savedReceipt.Value.Span));
    }

    [Fact]
    public async Task HandleArchiveMessage_Receipt_WithMarkInstanceComplete_MarksBeforeConcluding()
    {
        var settings = SettingsWithReceipt(
            successHandling: new FiksArkivSuccessHandlingSettings
            {
                MoveToNextTask = true,
                Action = "confirm",
                MarkInstanceComplete = true,
            }
        );
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        AllowAnyBinaryDataElement(dataMutator);
        var instanceClient = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(x => x.MarkInstanceComplete(It.IsAny<InstanceIdentifier>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);

        await using var fixture = CreateFixture(settings, instanceClient: instanceClient);

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(SuccessfulArchiveReceipt())
        );

        var success = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.Equal("confirm", success.Action);
        instanceClient.Verify();
    }

    [Fact]
    public async Task HandleArchiveMessage_Receipt_WhenMoveToNextTaskIsDisabled_ConcludesWithoutAutoAdvance()
    {
        var settings = SettingsWithReceipt(
            successHandling: new FiksArkivSuccessHandlingSettings { MoveToNextTask = false }
        );
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        AllowAnyBinaryDataElement(dataMutator);

        await using var fixture = CreateFixture(settings);

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(SuccessfulArchiveReceipt())
        );

        var success = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    [Fact]
    public async Task HandleArchiveMessage_Receipt_WithoutSuccessHandlingConfigured_AdvancesWithNoAction()
    {
        var settings = SettingsWithReceipt(successHandling: null);
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        AllowAnyBinaryDataElement(dataMutator);
        var instanceClient = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        await using var fixture = CreateFixture(settings, instanceClient: instanceClient);

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(SuccessfulArchiveReceipt())
        );

        var success = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Null(success.Action);
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleArchiveMessage_Receipt_MoveToNextTaskDisabledButMarkComplete_MarksAndStaysPut()
    {
        var settings = SettingsWithReceipt(
            successHandling: new FiksArkivSuccessHandlingSettings
            {
                MoveToNextTask = false,
                MarkInstanceComplete = true,
            }
        );
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        AllowAnyBinaryDataElement(dataMutator);
        var instanceClient = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(x => x.MarkInstanceComplete(It.IsAny<InstanceIdentifier>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);
        await using var fixture = CreateFixture(settings, instanceClient: instanceClient);

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(SuccessfulArchiveReceipt())
        );

        var success = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        instanceClient.Verify();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task HandleArchiveMessage_ErrorMessage_WithoutExplicitMoveToNextTask_FailsPermanently(
        bool blockPresent
    )
    {
        // An omitted errorHandling block and a block leaving moveToNextTask at its default mean the same
        // thing: an archive error fails the task, so the rejection reaches monitoring.
        var settings = new FiksArkivSettings
        {
            ErrorHandling = blockPresent ? new FiksArkivErrorHandlingSettings() : null,
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture(settings);

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReplyFactory(FiksArkivMeldingtype.Ikkefunnet)
        );

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("rejected the record", failed.ErrorMessage);
    }

    [Theory]
    [InlineData(FiksArkivMeldingtype.Ugyldigforespørsel)]
    [InlineData(FiksArkivMeldingtype.Serverfeil)]
    [InlineData(FiksArkivMeldingtype.Ikkefunnet)]
    public async Task HandleArchiveMessage_ErrorMessage_WhenMoveToNextTask_ConcludesDownTheConfiguredPath(
        string messageType
    )
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = true, Action = "reject" },
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture(settings);

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReplyFactory(messageType)
        );

        var success = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.Action);
    }

    [Fact]
    public async Task HandleArchiveMessage_ErrorMessage_WhenNotMoveToNextTask_FailsPermanently()
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = false },
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture(settings);

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReplyFactory(FiksArkivMeldingtype.Serverfeil)
        );

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("rejected the record", failed.ErrorMessage);
    }

    [Fact]
    public async Task HandleArchiveMessage_ReceiptReportingFailure_IsTreatedAsAnError()
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = false },
        };
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture(settings);

        var failedReceipt = new ArkivmeldingKvittering
        {
            MappeFeilet = new Ugyldigforespoersel { Feilmelding = "Saksmappen kunne ikke opprettes" },
        };

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(failedReceipt)
        );

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
    }

    [Fact]
    public async Task HandleArchiveMessage_ReceiptWithoutAReadablePayload_FailsRatherThanAdvancingWithoutEvidence()
    {
        // Advancing without the confirmation record would assert an outcome the process cannot show; the
        // unreadable message stays available in the mailbox's record.
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture();
        ServiceTaskReply reply = ReplyFactory(
            FiksArkivMeldingtype.ArkivmeldingOpprettKvittering,
            payloads: [("arkivmelding-kvittering.xml", "not xml at all")]
        );

        ServiceTaskExchangeResult result = await OnMessage(fixture)(CreateContext(dataMutator.Object), reply);

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("could not be read as an archive receipt", failed.ErrorMessage);
        dataMutator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleArchiveMessage_ReceiptWithNoPayloadsAtAll_FailsTheSameWay()
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        await using var fixture = CreateFixture();

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReplyFactory(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering)
        );

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
    }

    [Fact]
    public async Task HandleArchiveMessage_UnreadableDeliveredMessage_FailsPermanently()
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

        ServiceTaskExchangeResult result = await OnMessage(fixture)(CreateContext(dataMutator.Object), reply);

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
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
    public async Task HandleArchiveMessage_CallsTheMessageHandlerForEveryMessage(string messageType, bool expectError)
    {
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        AllowAnyBinaryDataElement(dataMutator);
        var messageHandler = new Mock<IFiksArkivMessageHandler>(MockBehavior.Strict);
        FiksArkivReceivedMessage? seenMessage = null;
        ServiceTaskContext? seenContext = null;
        messageHandler
            .Setup(x => x.HandleMessage(It.IsAny<FiksArkivReceivedMessage>(), It.IsAny<ServiceTaskContext>()))
            .Callback(
                (FiksArkivReceivedMessage message, ServiceTaskContext context) =>
                {
                    seenMessage = message;
                    seenContext = context;
                }
            )
            .Returns(Task.CompletedTask);

        var instanceClient = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(x => x.MarkInstanceComplete(It.IsAny<InstanceIdentifier>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        await using var fixture = CreateFixture(messageHandler: messageHandler, instanceClient: instanceClient);

        ServiceTaskContext context = CreateContext(dataMutator.Object);
        await OnMessage(fixture)(context, ReceiptOrPlainReply(messageType));

        Assert.NotNull(seenMessage);
        Assert.Equal(expectError, seenMessage.IsError);
        Assert.Equal(messageType, seenMessage.MessageType);
        Assert.Equal(_deliveredMessageId, seenMessage.MessageId);
        Assert.Same(context, seenContext);
        messageHandler.Verify(
            x => x.HandleMessage(It.IsAny<FiksArkivReceivedMessage>(), It.IsAny<ServiceTaskContext>()),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleArchiveMessage_AFailingMessageHandler_IsRetryableAndConcludesNothing()
    {
        // The message is frozen at its position, so a retry hands the same message to the same handler — what
        // a transient app dependency needs. The strict mocks prove nothing was saved or advanced.
        var dataMutator = InstanceDataMutatorMockFactory(CreateInstance());
        var instanceClient = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        var messageHandler = new Mock<IFiksArkivMessageHandler>(MockBehavior.Strict);
        messageHandler
            .Setup(x => x.HandleMessage(It.IsAny<FiksArkivReceivedMessage>(), It.IsAny<ServiceTaskContext>()))
            .ThrowsAsync(new InvalidOperationException("the app's notification service is down"));

        await using var fixture = CreateFixture(messageHandler: messageHandler, instanceClient: instanceClient);

        ServiceTaskExchangeResult result = await OnMessage(fixture)(
            CreateContext(dataMutator.Object),
            ReceiptReplyFactory(SuccessfulArchiveReceipt())
        );

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        Assert.Contains(nameof(IFiksArkivMessageHandler), failed.ErrorMessage);
        Assert.Contains("the app's notification service is down", failed.ErrorMessage);
        dataMutator.VerifyNoOtherCalls();
        instanceClient.VerifyNoOtherCalls();
    }

    private static Func<ServiceTaskContext, ServiceTaskMailbox, Task<ServiceTaskOpeningStageResult>> SendStage(
        TestFixture fixture
    ) => Assert.IsType<ServiceTaskStage.MailboxOpening>(fixture.FiksArkivPipeline.Items[0]).Work;

    private static Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> OnMessage(
        TestFixture fixture
    ) => Exchange(fixture).OnMessage;

    private static Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> OnClosed(
        TestFixture fixture
    ) => Exchange(fixture).OnClosed;

    private static PipelineConclusion.ReplyExchange Exchange(TestFixture fixture) =>
        Assert.IsType<PipelineConclusion.ReplyExchange>(fixture.FiksArkivPipeline.Items[^1]);

    private static ServiceTaskMailbox MailboxFactory(Guid? mailboxId = null) =>
        new() { Id = mailboxId ?? _mailboxId, Deadline = _executionReferenceTime + TimeSpan.FromDays(7) };

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
        Mock<IFiksArkivMessageHandler>? messageHandler = null,
        Mock<IFiksArkivInstanceClient>? instanceClient = null
    )
    {
        void Configure(IServiceCollection services)
        {
            services.AddSingleton(new Mock<IFiksArkivMessageSender>(MockBehavior.Strict).Object);
            if (logger is not null)
                services.AddSingleton(logger.Object);
            if (messageHandler is not null)
                services.AddSingleton(messageHandler.Object);
            if (instanceClient is not null)
                services.AddSingleton(instanceClient.Object);
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
            CorrelationId = _mailboxId.ToString(),
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

    private static ServiceTaskContext CreateContext(
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
