using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Features.Payment;

public sealed class PaymentServiceTests
{
    private readonly MockedServiceCollection _fixture = new();

    private const string Language = LanguageConst.Nb;
    private const string TaskId = "Task_1";
    private const string PaymentDataTypeId = "paymentInformation";
    private static readonly Guid _mailboxId = Guid.Parse("0f8b3c1e-5d2a-4e7b-9c4d-6a1f2b3c4d5e");
    private static readonly Guid _stepId = Guid.Parse("5c2e8f41-7a3b-4d6e-9f10-2b4c6d8e0a13");
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly Instance _instance = new Instance()
    {
        Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
        Process = new ProcessState
        {
            CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = TaskId },
        },
        Data = [],
    };

    /// <summary>A payment processor of the app library's own, which a payment attempt can ask for more.</summary>
    private readonly Mock<IPaymentProcessor> _attemptProcessor = new(MockBehavior.Strict);

    public PaymentServiceTests(ITestOutputHelper outputHelper)
    {
        _fixture.OutputHelper = outputHelper;
        _fixture.AppMetadata.DataTypes.Add(
            new DataType() { Id = PaymentDataTypeId, AllowedContentTypes = ["application/json"] }
        );
        _fixture.Storage.AddInstance(_instance);
        _fixture.Services.AddTransient<IPaymentService, PaymentService>();
        _fixture.Mock<IProcessReader>();
        _fixture
            .Mock<IWorkflowEngineService>()
            .Setup(s => s.IsMailboxOpen(_mailboxId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _attemptProcessor.As<IPaymentAttemptProcessor>();
        _attemptProcessor.Setup(p => p.PaymentProcessorId).Returns("paymentProcessorId");
    }

    // The verdict table. Every row reads the processor's status first; a call to the processor follows only where the
    // table names one, and a refused call reads again. "retryable" stores nothing: the step is tried again.
    [Theory]
    // A check, or a Nets event other than a failed charge.
    [InlineData("check", new[] { PaymentStatus.Paid }, null, null, PaymentStatus.Paid, "confirm")]
    [InlineData("netsEvent", new[] { PaymentStatus.Paid }, null, null, PaymentStatus.Paid, "confirm")]
    [InlineData("netsEvent", new[] { PaymentStatus.Authorized }, null, null, PaymentStatus.Authorized, "await")]
    [InlineData("check", new[] { PaymentStatus.Created }, null, null, PaymentStatus.Created, "await")]
    [InlineData("check", new[] { PaymentStatus.Cancelled }, null, null, PaymentStatus.Cancelled, "release")]
    // A failed charge.
    [InlineData("chargeFailed", new[] { PaymentStatus.Authorized }, null, true, PaymentStatus.Failed, "release")]
    [InlineData(
        "chargeFailed",
        new[] { PaymentStatus.Authorized, PaymentStatus.Paid },
        null,
        false,
        PaymentStatus.Paid,
        "confirm"
    )]
    [InlineData(
        "chargeFailed",
        new[] { PaymentStatus.Authorized, PaymentStatus.Cancelled },
        null,
        false,
        PaymentStatus.Failed,
        "release"
    )]
    [InlineData(
        "chargeFailed",
        new[] { PaymentStatus.Authorized, PaymentStatus.Authorized },
        null,
        false,
        null,
        "retryable"
    )]
    [InlineData("chargeFailed", new[] { PaymentStatus.Created }, null, null, PaymentStatus.Created, "await")]
    [InlineData("chargeFailed", new[] { PaymentStatus.Cancelled }, null, null, PaymentStatus.Failed, "release")]
    // A cancel.
    [InlineData("cancel", new[] { PaymentStatus.Created }, true, null, PaymentStatus.Cancelled, "reject")]
    [InlineData(
        "cancel",
        new[] { PaymentStatus.Created, PaymentStatus.Paid },
        false,
        null,
        PaymentStatus.Paid,
        "confirm"
    )]
    [InlineData(
        "cancel",
        new[] { PaymentStatus.Created, PaymentStatus.Authorized },
        false,
        null,
        PaymentStatus.Authorized,
        "await"
    )]
    [InlineData(
        "cancel",
        new[] { PaymentStatus.Created, PaymentStatus.Cancelled },
        false,
        null,
        PaymentStatus.Cancelled,
        "reject"
    )]
    [InlineData("cancel", new[] { PaymentStatus.Created, PaymentStatus.Created }, false, null, null, "retryable")]
    [InlineData("cancel", new[] { PaymentStatus.Paid }, null, null, PaymentStatus.Paid, "confirm")]
    [InlineData("cancel", new[] { PaymentStatus.Authorized }, null, null, PaymentStatus.Authorized, "await")]
    [InlineData("cancel", new[] { PaymentStatus.Cancelled }, null, null, PaymentStatus.Cancelled, "reject")]
    // The deadline.
    [InlineData("deadline", new[] { PaymentStatus.Paid }, null, null, PaymentStatus.Paid, "confirm")]
    [InlineData("deadline", new[] { PaymentStatus.Authorized }, null, true, PaymentStatus.Cancelled, "release")]
    [InlineData(
        "deadline",
        new[] { PaymentStatus.Authorized, PaymentStatus.Authorized },
        null,
        false,
        null,
        "retryable"
    )]
    [InlineData("deadline", new[] { PaymentStatus.Created }, true, null, PaymentStatus.Cancelled, "release")]
    [InlineData(
        "deadline",
        new[] { PaymentStatus.Created, PaymentStatus.Paid },
        false,
        null,
        PaymentStatus.Paid,
        "confirm"
    )]
    [InlineData(
        "deadline",
        new[] { PaymentStatus.Created, PaymentStatus.Authorized },
        false,
        true,
        PaymentStatus.Cancelled,
        "release"
    )]
    [InlineData("deadline", new[] { PaymentStatus.Created, PaymentStatus.Created }, false, null, null, "retryable")]
    [InlineData("deadline", new[] { PaymentStatus.Cancelled }, null, null, PaymentStatus.Cancelled, "release")]
    // A failed payment, which only a processor an app implements reports.
    [InlineData("check", new[] { PaymentStatus.Failed }, null, null, PaymentStatus.Failed, "release")]
    [InlineData("cancel", new[] { PaymentStatus.Failed }, null, null, PaymentStatus.Failed, "reject")]
    // A status no started payment can have.
    [InlineData("check", new[] { PaymentStatus.Skipped }, null, null, null, "permanent")]
    public async Task AttemptVerdict_FollowsTheVerdictTable(
        string trigger,
        PaymentStatus[] reports,
        bool? terminateAccepted,
        bool? cancelReservationAccepted,
        PaymentStatus? stored,
        string ending
    )
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(PaymentStatus.Created));
        UseProcessor(_attemptProcessor, reports);
        SetupTerminate(_attemptProcessor, terminateAccepted);
        SetupCancelReservation(cancelReservationAccepted);
        AllowReject(true);

        ServiceTaskExchangeResult result = await Settle(dataMutator, trigger);

        Assert.Equal(ending, Describe(result));
        Assert.Equal(stored, GetStoredRecord(dataMutator)?.Status);
        _attemptProcessor.Verify(
            p =>
                p.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(reports.Length)
        );
        VerifyCalls(terminateAccepted, cancelReservationAccepted);
    }

    // Releasing or moving back on a payment the processor reports as open needs the call the verdict names, accepted.
    [Theory]
    [InlineData("Release", null, null, PaymentStatus.Created, false)]
    [InlineData("Release", "Terminate", null, PaymentStatus.Created, false)]
    [InlineData("GoBack", "Terminate", null, PaymentStatus.Created, false)]
    [InlineData("Release", "CancelReservation", "Terminate", PaymentStatus.Authorized, false)]
    [InlineData("Release", "Terminate", "Terminate", PaymentStatus.Created, true)]
    [InlineData("GoBack", "Terminate", "Terminate", PaymentStatus.Created, true)]
    [InlineData("Release", null, null, PaymentStatus.Cancelled, true)]
    [InlineData("AwaitNextMessage", null, null, PaymentStatus.Created, true)]
    public void AttemptVerdict_EndsOnAnOpenPayment_OnlyAfterTheCallItNamesWasAccepted(
        string ending,
        string? namedCall,
        string? acceptedCall,
        PaymentStatus reported,
        bool mayEnd
    )
    {
        var verdict = new PaymentAttemptVerdict(
            PaymentStatus.Cancelled,
            Enum.Parse<PaymentAttemptEnding>(ending),
            namedCall is null ? null : Enum.Parse<PaymentProcessorCall>(namedCall)
        );

        Exception? exception = Record.Exception(() =>
            verdict.EnsureMayEnd(reported, acceptedCall is null ? null : Enum.Parse<PaymentProcessorCall>(acceptedCall))
        );

        Assert.Equal(mayEnd, exception is null);
    }

    [Fact]
    public async Task Cancel_WhenTheTaskHasNoWayBack_TerminatesAndReleases()
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(PaymentStatus.Created));
        UseProcessor(_attemptProcessor, PaymentStatus.Created);
        SetupTerminate(_attemptProcessor, true);
        AllowReject(false);

        ServiceTaskExchangeResult result = await Settle(dataMutator, "cancel");

        Assert.Equal("release", Describe(result));
        Assert.Equal(PaymentStatus.Cancelled, GetStoredRecord(dataMutator)?.Status);
    }

    // Every step of an attempt that ends in a way the relay acts on stores which step it was and how it ended, so the
    // record changes even when the processor reports nothing new.
    // The stored ending is the one the run returns: a cancel on a task with no way back releases.
    [Theory]
    [InlineData("check", PaymentStatus.Created, null, true, "AwaitNextMessage")]
    [InlineData("check", PaymentStatus.Paid, null, true, "MoveOn")]
    [InlineData("cancel", PaymentStatus.Created, true, true, "GoBack")]
    [InlineData("cancel", PaymentStatus.Created, true, false, "Release")]
    [InlineData("deadline", PaymentStatus.Created, true, true, "Release")]
    public async Task AttemptStep_StoresItsStepIdAndEnding(
        string trigger,
        PaymentStatus reported,
        bool? terminateAccepted,
        bool taskHasWayBack,
        string ending
    )
    {
        PaymentInformation payment = CreatePaymentInformation(PaymentStatus.Created);
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(payment);
        UseProcessor(_attemptProcessor, reported, payment.PaymentDetails);
        SetupTerminate(_attemptProcessor, terminateAccepted);
        AllowReject(taskHasWayBack);

        await Settle(dataMutator, trigger);

        Assert.Equal((_stepId, ending), GetStoredStep(dataMutator));
    }

    // A step that runs again after its save committed cannot read the record against its state, and reads it as Storage
    // has it now. When the record names the step, it ends as that run did, without asking the processor or storing.
    [Theory]
    [InlineData("check", "AwaitNextMessage", "await")]
    [InlineData("netsEvent", "MoveOn", "confirm")]
    [InlineData("cancel", "GoBack", "reject")]
    [InlineData("deadline", "Release", "release")]
    public async Task AttemptStep_RunAgainAfterItsSaveCommitted_EndsAsTheStoredRunDid(
        string trigger,
        string storedEnding,
        string ending
    )
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(PaymentStatus.Created));
        StoreAfterTheStateWasCaptured(dataMutator, _stepId, storedEnding);
        UseProcessor(_attemptProcessor);
        AllowReject(true);

        ServiceTaskExchangeResult result = await Settle(dataMutator, trigger);

        Assert.Equal(ending, Describe(result));
        Assert.Null(GetStoredRecord(dataMutator));
        _attemptProcessor.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(true, "AwaitNextMessage", nameof(CompletedServiceTaskOpeningStageResult))]
    [InlineData(true, "MoveOn", "confirm")]
    [InlineData(false, "AwaitNextMessage", nameof(CompletedServiceTaskOpeningStageResult))]
    [InlineData(false, "MoveOn", "confirm")]
    public async Task StartAttempt_RunAgainAfterItsSaveCommitted_EndsAsTheStoredRunDid(
        bool earlierRecord,
        string storedEnding,
        string ending
    )
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(
            earlierRecord ? CreatePaymentInformation(PaymentStatus.Created) : null
        );
        StoreAfterTheStateWasCaptured(dataMutator, _stepId, storedEnding);
        UseProcessor(_attemptProcessor);

        ServiceTaskOpeningStageResult result = await StartAttempt(dataMutator);

        Assert.Equal(
            ending,
            result is CompletedServiceTaskOpeningStageResult ? result.GetType().Name : Describe(result)
        );
        Assert.Null(GetStoredRecord(dataMutator));
        _attemptProcessor.VerifyNoOtherCalls();
    }

    // The record changed under the step, and not by an earlier run of it.
    [Theory]
    [InlineData("open", true)]
    [InlineData("open", false)]
    [InlineData("check", true)]
    public async Task AttemptStep_ThatFindsARecordAnotherStepStored_FailsOnTheConflict(string step, bool earlierRecord)
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(
            earlierRecord ? CreatePaymentInformation(PaymentStatus.Created) : null
        );
        StoreAfterTheStateWasCaptured(dataMutator, Guid.NewGuid(), "AwaitNextMessage");
        UseProcessor(_attemptProcessor);

        await Assert.ThrowsAsync<DataElementContentConflictException>(() =>
            step == "open" ? StartAttempt(dataMutator) : Settle(dataMutator, step)
        );
        Assert.Null(GetStoredRecord(dataMutator));
        _attemptProcessor.VerifyNoOtherCalls();
    }

    // A record that names this step with an ending this version does not know, as after a rollback across a version
    // that added one: the step fails, to be retried, instead of deciding again. Whether or not the step could read the
    // record against its state.
    [Theory]
    [InlineData("open", true)]
    [InlineData("open", false)]
    [InlineData("check", true)]
    [InlineData("check", false)]
    public async Task AttemptStep_WhoseStoredEndingThisVersionDoesNotKnow_FailsWithoutDecidingAgain(
        string step,
        bool storedAfterTheStateWasCaptured
    )
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(PaymentStatus.Created));
        if (storedAfterTheStateWasCaptured)
        {
            StoreAfterTheStateWasCaptured(dataMutator, _stepId, "Released");
        }
        else
        {
            dataMutator
                .Setup(x => x.GetBinaryData(It.IsAny<DataElementIdentifier>()))
                .ReturnsAsync(CreateRecordStoredBy(_stepId, "Released"));
        }
        UseProcessor(_attemptProcessor);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            step == "open" ? StartAttempt(dataMutator) : Settle(dataMutator, step)
        );
        Assert.Null(GetStoredRecord(dataMutator));
        _attemptProcessor.VerifyNoOtherCalls();
    }

    // An opening stage that released stored nothing; its closed mailbox tells a later run to release again.
    [Fact]
    public async Task StartAttempt_WhoseMailboxIsClosed_ReleasesWithoutAskingTheProcessor()
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(PaymentStatus.Created));
        UseProcessor(_attemptProcessor);
        _fixture
            .Mock<IWorkflowEngineService>()
            .Setup(s => s.IsMailboxOpen(_mailboxId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        ServiceTaskOpeningStageResult result = await StartAttempt(dataMutator);

        Assert.Equal("release", Describe(result));
        Assert.Null(GetStoredRecord(dataMutator));
        _attemptProcessor.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Deadline_WhenTheProcessorCannotBeAsked_FailsWithoutReleasing()
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(PaymentStatus.Created));
        UseProcessor(_attemptProcessor);
        _attemptProcessor
            .Setup(p =>
                p.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new PaymentException("Failed to retrieve payment"));

        // The step fails retryable on the exception.
        await Assert.ThrowsAsync<PaymentException>(() => Settle(dataMutator, "deadline"));
        Assert.Null(GetStoredRecord(dataMutator));
    }

    [Fact]
    public async Task Deadline_OnAReservationAnAppsProcessorCannotCancel_IsRetryable()
    {
        var appProcessor = new Mock<IPaymentProcessor>(MockBehavior.Strict);
        appProcessor.Setup(p => p.PaymentProcessorId).Returns("paymentProcessorId");
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(PaymentStatus.Created));
        UseProcessor(appProcessor, PaymentStatus.Authorized, PaymentStatus.Authorized);

        ServiceTaskExchangeResult result = await Settle(dataMutator, "deadline");

        Assert.Equal("retryable", Describe(result));
        Assert.Null(GetStoredRecord(dataMutator));
    }

    [Fact]
    public async Task Message_ThatIsNotAPaymentAttemptMessage_FailsPermanently()
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(PaymentStatus.Created));
        UseProcessor(_attemptProcessor);

        ServiceTaskExchangeResult result = await HandleMessage(dataMutator, """{"kind":"refund"}""");

        Assert.Equal("permanent", Describe(result));
        Assert.Null(GetStoredRecord(dataMutator));
    }

    [Fact]
    public async Task StartAttempt_CreatesThePaymentForTheAttemptsMailbox_AndStoresIt()
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(stored: null);
        OrderDetails orderDetails = SetupOrderDetails(totalPriceExVat: 1000);
        UseProcessor(_attemptProcessor);
        var paymentDetails = new PaymentDetails { PaymentId = "newPaymentId", RedirectUrl = "https://checkout" };
        _attemptProcessor
            .As<IPaymentAttemptProcessor>()
            .Setup(p =>
                p.StartPayment(It.IsAny<Instance>(), orderDetails, Language, _mailboxId, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(paymentDetails);

        ServiceTaskOpeningStageResult result = await StartAttempt(dataMutator);

        Assert.IsType<CompletedServiceTaskOpeningStageResult>(result);
        PaymentInformation stored = Assert.IsType<PaymentInformation>(GetStoredRecord(dataMutator));
        Assert.Equal(PaymentStatus.Created, stored.Status);
        Assert.Equal(_mailboxId, stored.MailboxId);
        Assert.Equal(Language, stored.Language);
        Assert.Equal(TaskId, stored.TaskId);
        Assert.Equal("newPaymentId", stored.PaymentDetails?.PaymentId);
        Assert.Equal((_stepId, "AwaitNextMessage"), GetStoredStep(dataMutator));
        _attemptProcessor
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
    public async Task StartAttempt_WithAnAppsOwnProcessor_CreatesThePaymentThroughItsPublicInterface()
    {
        var appProcessor = new Mock<IPaymentProcessor>(MockBehavior.Strict);
        appProcessor.Setup(p => p.PaymentProcessorId).Returns("paymentProcessorId");
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(stored: null);
        OrderDetails orderDetails = SetupOrderDetails(totalPriceExVat: 1000);
        UseProcessor(appProcessor);
        appProcessor
            .Setup(p => p.StartPayment(It.IsAny<Instance>(), orderDetails, Language, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaymentDetails { PaymentId = "newPaymentId", RedirectUrl = "https://checkout" });

        ServiceTaskOpeningStageResult result = await StartAttempt(dataMutator);

        Assert.IsType<CompletedServiceTaskOpeningStageResult>(result);
        Assert.Equal(_mailboxId, GetStoredRecord(dataMutator)?.MailboxId);
    }

    [Fact]
    public async Task StartAttempt_OrderThatCostsNothing_StoresSkippedAndMovesOnWithoutAPayment()
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(stored: null);
        SetupOrderDetails(totalPriceExVat: 0);
        UseProcessor(_attemptProcessor);

        ServiceTaskOpeningStageResult result = await StartAttempt(dataMutator);

        Assert.Equal("confirm", Describe(result));
        Assert.Equal(PaymentStatus.Skipped, GetStoredRecord(dataMutator)?.Status);
        Assert.Equal((_stepId, "MoveOn"), GetStoredStep(dataMutator));
        _attemptProcessor
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
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task StartAttempt_ThatCannotCreateThePayment_ReleasesWithNothingStored(bool orderCalculationFails)
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(stored: null);
        if (orderCalculationFails)
        {
            _fixture
                .Mock<IOrderDetailsCalculator>()
                .Setup(c => c.CalculateOrderDetails(It.IsAny<Instance>(), Language, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("The order cannot be calculated."));
        }
        else
        {
            SetupOrderDetails(totalPriceExVat: 1000);
        }
        UseProcessor(_attemptProcessor);
        _attemptProcessor
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
            .ThrowsAsync(new PaymentException("Failed to create payment"));

        ServiceTaskOpeningStageResult result = await StartAttempt(dataMutator);

        Assert.Equal("release", Describe(result));
        Assert.Null(GetStoredRecord(dataMutator));
    }

    // A payment record from an earlier visit to the task, such as one v8 left. "create" starts a new payment over it,
    // "adopt" opens the attempt on the reserved payment without creating one.
    [Theory]
    [InlineData(PaymentStatus.Paid, null, null, PaymentStatus.Paid, "confirm")]
    [InlineData(PaymentStatus.Created, true, null, PaymentStatus.Created, "create")]
    [InlineData(PaymentStatus.Created, false, PaymentStatus.Paid, PaymentStatus.Paid, "confirm")]
    [InlineData(PaymentStatus.Created, false, PaymentStatus.Authorized, PaymentStatus.Authorized, "adopt")]
    [InlineData(PaymentStatus.Authorized, false, PaymentStatus.Authorized, PaymentStatus.Authorized, "adopt")]
    [InlineData(PaymentStatus.Created, false, PaymentStatus.Cancelled, PaymentStatus.Created, "create")]
    [InlineData(PaymentStatus.Created, false, PaymentStatus.Created, null, "release")]
    [InlineData(PaymentStatus.Cancelled, null, null, PaymentStatus.Created, "create")]
    [InlineData(PaymentStatus.Failed, null, null, PaymentStatus.Created, "create")]
    [InlineData(PaymentStatus.Skipped, null, null, PaymentStatus.Created, "create")]
    public async Task StartAttempt_OverAnEarlierPayment_SettlesItFirst(
        PaymentStatus existingStatus,
        bool? terminateAccepted,
        PaymentStatus? reported,
        PaymentStatus? stored,
        string outcome
    )
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(existingStatus));
        SetupOrderDetails(totalPriceExVat: 1000);
        UseProcessor(_attemptProcessor, reported is { } status ? new[] { status } : Array.Empty<PaymentStatus>());
        SetupTerminate(_attemptProcessor, terminateAccepted);
        _attemptProcessor
            .As<IPaymentAttemptProcessor>()
            .Setup(p =>
                p.StartPayment(
                    It.IsAny<Instance>(),
                    It.IsAny<OrderDetails>(),
                    It.IsAny<string?>(),
                    _mailboxId,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new PaymentDetails { PaymentId = "newPaymentId", RedirectUrl = "https://checkout" });

        ServiceTaskOpeningStageResult result = await StartAttempt(dataMutator);

        PaymentInformation? storedRecord = GetStoredRecord(dataMutator);
        Assert.Equal(stored, storedRecord?.Status);
        string actual = (result, storedRecord?.PaymentDetails?.PaymentId) switch
        {
            (CompletedServiceTaskOpeningStageResult, "newPaymentId") => "create",
            (CompletedServiceTaskOpeningStageResult, "paymentId") => "adopt",
            _ => Describe(result),
        };
        Assert.Equal(outcome, actual);
        if (actual is "create" or "adopt")
        {
            Assert.Equal(_mailboxId, storedRecord?.MailboxId);
        }
        VerifyCalls(terminateAccepted, cancelReservationAccepted: null);
    }

    // At the task's end, a record that does not show the payment as paid takes what the processor reports, with its
    // details; a paid one is not asked about.
    [Theory]
    [InlineData(PaymentStatus.Authorized, PaymentStatus.Paid)]
    [InlineData(PaymentStatus.Created, PaymentStatus.Paid)]
    [InlineData(PaymentStatus.Created, PaymentStatus.Authorized)]
    [InlineData(PaymentStatus.Paid, null)]
    public async Task RefreshUnpaidPayment_StagesWhatTheProcessorReportsForARecordNotShownAsPaid(
        PaymentStatus stored,
        PaymentStatus? reported
    )
    {
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreatePaymentInformation(stored));
        var reportedDetails = new PaymentDetails { PaymentId = "paymentId", ChargedDate = "2026-11-26" };
        if (reported is { } status)
        {
            UseProcessor(_attemptProcessor, status, reportedDetails);
        }
        else
        {
            _fixture.Services.AddSingleton(_attemptProcessor.Object);
        }

        await WithPaymentService(async service =>
        {
            await service.RefreshUnpaidPayment(dataMutator.Object, CreatePaymentConfiguration());
            return true;
        });

        PaymentInformation? staged = GetStoredRecord(dataMutator);
        Assert.Equal(reported, staged?.Status);
        Assert.Equal(reported is null ? null : "2026-11-26", staged?.PaymentDetails?.ChargedDate);
    }

    [Fact]
    public async Task GetPaymentInformation_ReturnsTheStoredRecordWithoutAskingTheProcessor()
    {
        await using var sp = _fixture.BuildServiceProvider();
        PaymentInformation payment = CreatePaymentInformation(PaymentStatus.Created);
        await sp.GetRequiredService<IDataService>()
            .InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, payment);

        PaymentInformation result = await sp.GetRequiredService<IPaymentService>()
            .GetPaymentInformation(_instance, CreatePaymentConfiguration(), TaskId, Language);

        Assert.Equal(PaymentStatus.Created, result.Status);
        Assert.Equal("paymentId", result.PaymentDetails?.PaymentId);
        _attemptProcessor.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetPaymentInformation_WithoutARecord_IsUninitializedWithTheOrderDetails()
    {
        OrderDetails orderDetails = SetupOrderDetails(totalPriceExVat: 1000);
        await using var sp = _fixture.BuildServiceProvider();

        PaymentInformation result = await sp.GetRequiredService<IPaymentService>()
            .GetPaymentInformation(_instance, CreatePaymentConfiguration(), TaskId, Language);

        Assert.Equal(PaymentStatus.Uninitialized, result.Status);
        Assert.Same(orderDetails, result.OrderDetails);
        Assert.Equal(TaskId, result.TaskId);
    }

    [Theory]
    [InlineData("paymentId", true)]
    [InlineData("anotherPaymentId", false)]
    public async Task FindPaymentRecord_FindsTheRecordThatHoldsThePayment(string paymentId, bool found)
    {
        _fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetProcessTasks())
            .Returns([
                new() { Id = "Task_Data" },
                new()
                {
                    Id = TaskId,
                    ExtensionElements = new()
                    {
                        TaskExtension = new() { PaymentConfiguration = new() { PaymentDataType = PaymentDataTypeId } },
                    },
                },
            ]);
        await using var sp = _fixture.BuildServiceProvider();
        await sp.GetRequiredService<IDataService>()
            .InsertJsonObject(
                new InstanceIdentifier(_instance),
                PaymentDataTypeId,
                CreatePaymentInformation(PaymentStatus.Created)
            );

        PaymentInformation? result = await sp.GetRequiredService<IPaymentService>()
            .FindPaymentRecord(_instance, paymentId);

        Assert.Equal(found, result is not null);
    }

    private async Task<ServiceTaskExchangeResult> Settle(Mock<IInstanceDataMutator> dataMutator, string trigger) =>
        trigger switch
        {
            "deadline" => await WithPaymentService(service =>
                service.SettleAtDeadline(CreateStageContext(dataMutator), CreatePaymentConfiguration())
            ),
            "check" => await HandleMessage(dataMutator, PaymentAttemptMessage.Check),
            "cancel" => await HandleMessage(dataMutator, PaymentAttemptMessage.Cancel),
            "netsEvent" => await HandleMessage(
                dataMutator,
                PaymentAttemptMessage.NetsEvent("payment.checkout.completed")
            ),
            "chargeFailed" => await HandleMessage(
                dataMutator,
                PaymentAttemptMessage.NetsEvent("payment.charge.failed")
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(trigger), trigger, null),
        };

    private Task<ServiceTaskExchangeResult> HandleMessage(Mock<IInstanceDataMutator> dataMutator, string payload) =>
        WithPaymentService(service =>
            service.HandleAttemptMessage(
                CreateStageContext(dataMutator),
                new ServiceTaskReply
                {
                    Payload = payload,
                    IdempotencyKey = "key",
                    AcceptedAt = DateTimeOffset.UtcNow,
                    Position = 0,
                },
                CreatePaymentConfiguration()
            )
        );

    private Task<ServiceTaskOpeningStageResult> StartAttempt(Mock<IInstanceDataMutator> dataMutator) =>
        WithPaymentService(service =>
            service.StartAttempt(
                CreateStageContext(dataMutator),
                new ServiceTaskMailbox { Id = _mailboxId, Deadline = DateTimeOffset.UtcNow.AddHours(24) },
                CreatePaymentConfiguration()
            )
        );

    private async Task<T> WithPaymentService<T>(Func<IPaymentService, Task<T>> act)
    {
        await using var sp = _fixture.BuildServiceProvider();
        return await act(sp.GetRequiredService<IPaymentService>());
    }

    private static StageContext CreateStageContext(Mock<IInstanceDataMutator> dataMutator) =>
        new()
        {
            InstanceDataMutator = dataMutator.Object,
            WorkflowId = Guid.NewGuid(),
            StepId = _stepId,
        };

    private static string Describe(ServiceTaskExchangeResult result) =>
        result switch
        {
            ServiceTaskAwaitNextReplyResult => "await",
            SuccessfulServiceTaskResult { Action: { } action } => action,
            ReleasedServiceTaskResult => "release",
            FailedServiceTaskResult { Kind: FailureKind.Retryable } => "retryable",
            FailedServiceTaskResult { Kind: FailureKind.Permanent } => "permanent",
            _ => result.ToString(),
        };

    private static string Describe(ServiceTaskOpeningStageResult result) =>
        result switch
        {
            ConcludedServiceTaskOpeningStageResult { Result: var conclusion } => Describe(conclusion),
            _ => result.ToString(),
        };

    /// <summary>
    /// Registers <paramref name="processor"/> as the payment's processor, reporting <paramref name="reports"/> in turn.
    /// </summary>
    private void UseProcessor(Mock<IPaymentProcessor> processor, params PaymentStatus[] reports) =>
        UseProcessor(processor, reports, details: null);

    private void UseProcessor(Mock<IPaymentProcessor> processor, PaymentStatus report, PaymentDetails? details) =>
        UseProcessor(processor, [report], details);

    private void UseProcessor(Mock<IPaymentProcessor> processor, PaymentStatus[] reports, PaymentDetails? details)
    {
        _fixture.Services.AddSingleton(processor.Object);
        var sequence = processor.SetupSequence(p =>
            p.GetPaymentStatus(
                It.IsAny<Instance>(),
                "paymentId",
                It.IsAny<decimal>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()
            )
        );
        foreach (PaymentStatus report in reports)
        {
            sequence = sequence.ReturnsAsync(
                (report, details ?? new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "https://checkout" })
            );
        }
    }

    private static void SetupTerminate(Mock<IPaymentProcessor> processor, bool? accepted)
    {
        if (accepted is { } terminated)
        {
            processor
                .Setup(p =>
                    p.TerminatePayment(
                        It.IsAny<Instance>(),
                        It.Is<PaymentInformation>(payment => payment.PaymentDetails!.PaymentId == "paymentId"),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(terminated);
        }
    }

    private void SetupCancelReservation(bool? accepted)
    {
        if (accepted is { } cancelled)
        {
            _attemptProcessor
                .As<IPaymentAttemptProcessor>()
                .Setup(p =>
                    p.CancelReservation(
                        It.IsAny<Instance>(),
                        It.Is<PaymentInformation>(payment => payment.PaymentDetails!.PaymentId == "paymentId"),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(cancelled);
        }
    }

    private void VerifyCalls(bool? terminateAccepted, bool? cancelReservationAccepted)
    {
        _attemptProcessor.Verify(
            p =>
                p.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()),
            terminateAccepted is null ? Times.Never() : Times.Once()
        );
        _attemptProcessor
            .As<IPaymentAttemptProcessor>()
            .Verify(
                p =>
                    p.CancelReservation(
                        It.IsAny<Instance>(),
                        It.IsAny<PaymentInformation>(),
                        It.IsAny<CancellationToken>()
                    ),
                cancelReservationAccepted is null ? Times.Never() : Times.Once()
            );
    }

    private void AllowReject(bool allowed) =>
        _fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetAltinnTaskExtension(TaskId))
            .Returns(new AltinnTaskExtension { AltinnActions = allowed ? [new AltinnAction("reject")] : [] });

    private OrderDetails SetupOrderDetails(decimal totalPriceExVat)
    {
        OrderDetails orderDetails = CreateOrderDetails();
        orderDetails.OrderLines[0].PriceExVat = totalPriceExVat;
        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(c => c.CalculateOrderDetails(It.IsAny<Instance>(), Language, It.IsAny<CancellationToken>()))
            .ReturnsAsync(orderDetails);
        return orderDetails;
    }

    /// <summary>A data mutator for the payment task, holding <paramref name="stored"/> as the payment record.</summary>
    private Mock<IInstanceDataMutator> CreateDataMutator(PaymentInformation? stored)
    {
        var paymentDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = PaymentDataTypeId,
            ContentType = "application/json",
        };
        var instance = new Instance
        {
            Id = _instance.Id,
            AppId = "ttd/mocked-app",
            Process = _instance.Process,
            Data = stored is null ? [] : [paymentDataElement],
        };
        var dataMutator = new Mock<IInstanceDataMutator>();
        dataMutator
            .As<IReloadableInstanceData>()
            .Setup(x => x.ReloadFromStorage(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        dataMutator.Setup(x => x.Instance).Returns(instance);
        dataMutator.Setup(x => x.TaskId).Returns(TaskId);
        dataMutator.Setup(x => x.Language).Returns(Language);
        if (stored is not null)
        {
            dataMutator
                .Setup(x => x.GetBinaryData(paymentDataElement))
                .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(stored, _jsonSerializerOptions));
        }

        return dataMutator;
    }

    /// <summary>
    /// Makes Storage hold a record that <paramref name="stepId"/> stored, ending with <paramref name="ending"/>, after the
    /// state of <paramref name="dataMutator"/> was captured: a record the state shows can no longer be read against it,
    /// and one it does not show appears on a reload.
    /// </summary>
    private static void StoreAfterTheStateWasCaptured(
        Mock<IInstanceDataMutator> dataMutator,
        Guid stepId,
        string ending
    )
    {
        Instance instance = dataMutator.Object.Instance;
        DataElement paymentDataElement =
            instance.Data.SingleOrDefault()
            ?? new DataElement
            {
                Id = Guid.NewGuid().ToString(),
                DataType = PaymentDataTypeId,
                ContentType = "application/json",
            };
        byte[] current = CreateRecordStoredBy(stepId, ending);
        var conflict = new DataElementContentConflictException(instance.Id, Guid.Parse(paymentDataElement.Id));
        bool reloaded = false;
        dataMutator
            .As<IReloadableInstanceData>()
            .Setup(x => x.ReloadFromStorage(It.IsAny<CancellationToken>()))
            .Callback(() =>
            {
                reloaded = true;
                instance.Data = [paymentDataElement];
            })
            .Returns(Task.CompletedTask);
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .Returns(() => reloaded ? Task.FromResult<ReadOnlyMemory<byte>>(current) : throw conflict);
    }

    /// <summary>A record of a created payment that <paramref name="stepId"/> stored, ending with <paramref name="ending"/>.</summary>
    private static byte[] CreateRecordStoredBy(Guid stepId, string ending)
    {
        JsonObject record = JsonSerializer
            .SerializeToNode(CreatePaymentInformation(PaymentStatus.Created), _jsonSerializerOptions)!
            .AsObject();
        record["attemptStep"] = new JsonObject { ["stepId"] = stepId.ToString(), ["ending"] = ending };
        return JsonSerializer.SerializeToUtf8Bytes(record, _jsonSerializerOptions);
    }

    /// <summary>The step id and ending the stored record names; null when the step staged none.</summary>
    private static (Guid, string)? GetStoredStep(Mock<IInstanceDataMutator> dataMutator)
    {
        IInvocation? write = dataMutator.Invocations.SingleOrDefault(invocation =>
            invocation.Method.Name
                is nameof(IInstanceDataMutator.UpdateBinaryDataElement)
                    or nameof(IInstanceDataMutator.AddBinaryDataElement)
        );
        if (write is null)
        {
            return null;
        }

        int bytesIndex = write.Method.Name == nameof(IInstanceDataMutator.UpdateBinaryDataElement) ? 2 : 3;
        JsonNode? step = JsonNode.Parse(((ReadOnlyMemory<byte>)write.Arguments[bytesIndex]).Span)?["attemptStep"];
        return step is null
            ? null
            : (Guid.Parse(step["stepId"]!.GetValue<string>()), step["ending"]!.GetValue<string>());
    }

    /// <summary>The payment record the step staged, over the old one or as a new one; null when it staged none.</summary>
    private static PaymentInformation? GetStoredRecord(Mock<IInstanceDataMutator> dataMutator)
    {
        IInvocation? write = dataMutator.Invocations.SingleOrDefault(invocation =>
            invocation.Method.Name
                is nameof(IInstanceDataMutator.UpdateBinaryDataElement)
                    or nameof(IInstanceDataMutator.AddBinaryDataElement)
        );
        if (write is null)
        {
            return null;
        }

        Assert.Equal("application/json", write.Arguments[1]);
        int bytesIndex = write.Method.Name == nameof(IInstanceDataMutator.UpdateBinaryDataElement) ? 2 : 3;
        return JsonSerializer.Deserialize<PaymentInformation>(
            ((ReadOnlyMemory<byte>)write.Arguments[bytesIndex]).Span,
            _jsonSerializerOptions
        );
    }

    private static PaymentInformation CreatePaymentInformation(PaymentStatus status)
    {
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.Status = status;
        return paymentInformation;
    }

    [Theory]
    [InlineData(null)]
    [InlineData(PaymentStatus.Skipped)]
    [InlineData(PaymentStatus.Cancelled)]
    [InlineData(PaymentStatus.Failed)]
    public async Task PrepareAbandon_PaymentThatCannotComplete_CanAbandonWithoutContactingProcessor(
        PaymentStatus? storedStatus
    )
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(storedStatus);
        _fixture.Mock<IPaymentProcessor>();

        bool alreadyPaid = await PrepareAbandon(dataMutator.Object);

        Assert.False(alreadyPaid);
        _fixture.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
        VerifyNoPaymentUpdate(dataMutator);
    }

    [Fact]
    public async Task PrepareAbandon_StoredPaid_IsAlreadyPaidWithoutContactingProcessor()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Paid);
        _fixture.Mock<IPaymentProcessor>();

        bool alreadyPaid = await PrepareAbandon(dataMutator.Object);

        Assert.True(alreadyPaid);
        _fixture.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
        VerifyNoPaymentUpdate(dataMutator);
    }

    [Theory]
    [InlineData(PaymentStatus.Created)]
    [InlineData(PaymentStatus.Authorized)]
    public async Task PrepareAbandon_ProcessorTerminatesPayment_StoresCancelledAndCanAbandon(PaymentStatus storedStatus)
    {
        var (dataMutator, paymentDataElement) = CreateDataMutatorWithPayment(storedStatus);
        SetupTerminate(terminated: true);

        bool alreadyPaid = await PrepareAbandon(dataMutator.Object);

        Assert.False(alreadyPaid);
        Assert.Equal(PaymentStatus.Cancelled, GetUpdatedStatus(dataMutator, paymentDataElement));
        _fixture.VerifyMocks();
    }

    [Theory]
    [InlineData(PaymentStatus.Paid, true)]
    [InlineData(PaymentStatus.Authorized, true)]
    [InlineData(PaymentStatus.Cancelled, false)]
    [InlineData(PaymentStatus.Failed, false)]
    public async Task PrepareAbandon_ProcessorRefusesToTerminate_StoresTheStatusItReports(
        PaymentStatus processorStatus,
        bool alreadyPaid
    )
    {
        var (dataMutator, paymentDataElement) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        SetupTerminate(terminated: false);
        SetupProcessorStatus(() => (processorStatus, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "" }));

        Assert.Equal(alreadyPaid, await PrepareAbandon(dataMutator.Object));
        Assert.Equal(processorStatus, GetUpdatedStatus(dataMutator, paymentDataElement));
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task PrepareAbandon_ProcessorRefusesToTerminateAPaymentThatHasNotGoneThrough_Throws()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        SetupTerminate(terminated: false);
        SetupProcessorStatus(() =>
            (PaymentStatus.Created, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "" })
        );

        PaymentException exception = await Assert.ThrowsAsync<PaymentException>(() =>
            PrepareAbandon(dataMutator.Object)
        );

        Assert.Equal("Unable to cancel existing paymentProcessorId payment with ID: paymentId.", exception.Message);
        VerifyNoPaymentUpdate(dataMutator);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task PrepareAbandon_ProcessorUnreachableOnTerminate_Throws()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns("paymentProcessorId");
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>())
            )
            .ThrowsAsync(new HttpRequestException("Connection refused"))
            .Verifiable(Times.Once);

        await Assert.ThrowsAsync<HttpRequestException>(() => PrepareAbandon(dataMutator.Object));
        VerifyNoPaymentUpdate(dataMutator);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task PrepareAbandon_ProcessorUnreachableOnStatus_Throws()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        SetupTerminate(terminated: false);
        SetupProcessorStatus(() => throw new PaymentException("Failed to retrieve payment"));

        await Assert.ThrowsAsync<PaymentException>(() => PrepareAbandon(dataMutator.Object));
        VerifyNoPaymentUpdate(dataMutator);
        _fixture.VerifyMocks();
    }

    private async Task<bool> PrepareAbandon(IInstanceDataMutator dataMutator)
    {
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        return await paymentService.PrepareAbandon(dataMutator, CreatePaymentConfiguration());
    }

    private (Mock<IInstanceDataMutator> DataMutator, DataElement PaymentDataElement) CreateDataMutatorWithPayment(
        PaymentStatus? status
    )
    {
        var paymentDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = PaymentDataTypeId,
            ContentType = "application/json",
        };
        var instance = new Instance
        {
            Id = _instance.Id,
            AppId = _instance.AppId,
            Process = _instance.Process,
            Data = status is null ? [] : [paymentDataElement],
        };
        var dataMutator = new Mock<IInstanceDataMutator>();
        dataMutator.Setup(x => x.Instance).Returns(instance);
        dataMutator.Setup(x => x.Language).Returns(Language);
        if (status is { } storedStatus)
        {
            PaymentInformation paymentInformation = CreatePaymentInformation();
            paymentInformation.Status = storedStatus;
            dataMutator
                .Setup(x => x.GetBinaryData(paymentDataElement))
                .ReturnsAsync(
                    System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(
                        paymentInformation,
                        new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
                    )
                );
        }

        return (dataMutator, paymentDataElement);
    }

    private void SetupTerminate(bool terminated)
    {
        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns("paymentProcessorId");
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(
                    It.IsAny<Instance>(),
                    It.Is<PaymentInformation>(p =>
                        p.PaymentDetails != null && p.PaymentDetails.PaymentId == "paymentId"
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(terminated)
            .Verifiable(Times.Once);
    }

    private void SetupProcessorStatus(Func<(PaymentStatus, PaymentDetails)> status) =>
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    "paymentId",
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(status)
            .Verifiable(Times.Once);

    private static PaymentStatus GetUpdatedStatus(
        Mock<IInstanceDataMutator> dataMutator,
        DataElement paymentDataElement
    )
    {
        IInvocation update = Assert.Single(
            dataMutator.Invocations,
            invocation => invocation.Method.Name == nameof(IInstanceDataMutator.UpdateBinaryDataElement)
        );
        Assert.Equal(paymentDataElement.Id, ((DataElementIdentifier)update.Arguments[0]).Id);
        Assert.Equal("application/json", update.Arguments[1]);
        PaymentInformation storedPaymentInformation =
            System.Text.Json.JsonSerializer.Deserialize<PaymentInformation>(
                ((ReadOnlyMemory<byte>)update.Arguments[2]).Span,
                new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
            ) ?? throw new InvalidOperationException("Stored payment information is null");
        return storedPaymentInformation.Status;
    }

    private static void VerifyNoPaymentUpdate(Mock<IInstanceDataMutator> dataMutator) =>
        dataMutator.Verify(
            x =>
                x.UpdateBinaryDataElement(
                    It.IsAny<DataElementIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<ReadOnlyMemory<byte>>()
                ),
            Times.Never
        );

    private static PaymentInformation CreatePaymentInformation()
    {
        return new PaymentInformation
        {
            TaskId = "Task_1",
            Status = PaymentStatus.Created,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Currency = "NOK",
                OrderLines = [],
                Receiver = new PaymentReceiver(),
            },
            PaymentDetails = new PaymentDetails { RedirectUrl = "Redirect URL", PaymentId = "paymentId" },
        };
    }

    private static OrderDetails CreateOrderDetails()
    {
        return new OrderDetails()
        {
            PaymentProcessorId = "paymentProcessorId",
            Currency = "NOK",
            OrderLines =
            [
                new PaymentOrderLine
                {
                    Id = "001",
                    Name = "Fee",
                    PriceExVat = 1000,
                    VatPercent = 25,
                },
            ],
            Receiver = new PaymentReceiver(),
        };
    }

    private static ValidAltinnPaymentConfiguration CreatePaymentConfiguration()
    {
        return new AltinnPaymentConfiguration
        {
            PaymentDataType = PaymentDataTypeId,
            PaymentReceiptPdfDataType = "paymentReceiptPdf",
        }.Validate();
    }
}
