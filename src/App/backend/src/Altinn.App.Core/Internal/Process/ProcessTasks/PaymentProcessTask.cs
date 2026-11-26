using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for collecting user payment. Only a payment attempt, the action pipeline
/// that <c>pay</c> starts, moves it on.
/// </summary>
internal sealed class PaymentProcessTask : IActionPipelineTask, IProcessTaskAbandonPreparer
{
    /// <summary>How long a payment attempt waits for the payment before it settles it with the payment processor.</summary>
    internal static readonly TimeSpan AttemptTimeout = TimeSpan.FromHours(24);

    /// <summary>The user action that starts a payment attempt.</summary>
    internal const string PayAction = "pay";

    private readonly IPdfService _pdfService;
    private readonly IProcessReader _processReader;
    private readonly IPaymentService _paymentService;
    private readonly ITranslationService _translationService;

    private const string PdfContentType = "application/pdf";
    private const string ReceiptFileName = "Betalingskvittering.pdf";

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentProcessTask"/> class.
    /// </summary>
    public PaymentProcessTask(
        IPdfService pdfService,
        IProcessReader processReader,
        IPaymentService paymentService,
        ITranslationService translationService
    )
    {
        _pdfService = pdfService;
        _processReader = processReader;
        _paymentService = paymentService;
        _translationService = translationService;
    }

    /// <inheritdoc/>
    public string Type => AltinnTaskTypes.Payment;

    /// <inheritdoc/>
    public string StartAction => PayAction;

    /// <inheritdoc/>
    public ServiceTaskPipeline DefineActionPipeline(PipelineBuilder pipeline) =>
        pipeline
            .Stage(StartAttempt, new MailboxOptions { Timeout = AttemptTimeout }, out MailboxHandle attempt)
            .ConcludeOnReplies(attempt, onMessage: HandleAttemptMessage, onClosed: SettleAtDeadline);

    /// <inheritdoc/>
    public ValidationIssue ProcessNextRefusal(string taskId) =>
        BuiltInValidationIssues.PaymentNotCompleted(GetAltinnPaymentConfiguration(taskId).Validate().PaymentDataType);

    /// <inheritdoc/>
    public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context)
    {
        try
        {
            ValidAltinnPaymentConfiguration configuration = GetAltinnPaymentConfiguration(context.TaskId).Validate();
            if (context.Environment == HostingEnvironment.Development)
            {
                AllowedContributorsHelper.EnsureDataTypeIsAppOwned(
                    context.ApplicationMetadata,
                    configuration.PaymentDataType
                );
            }
            return [];
        }
        catch (ApplicationConfigException e)
        {
            return [e.Message];
        }
    }

    /// <inheritdoc/>
    public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Stage(RemoveClosedPayment).Build();

    /// <inheritdoc/>
    public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) =>
        pipeline.Stage(RefreshUnpaidPayment).Stage(StoreReceipt).Build();

    /// <inheritdoc/>
    /// <remarks>
    /// <see cref="PrepareAbandon"/> has settled the payment with the payment processor before the transition.
    /// </remarks>
    public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Stage(RemoveClosedPayment).Build();

    /// <inheritdoc/>
    public async Task<ProcessChangeResult?> PrepareAbandon(
        IInstanceDataMutator dataMutator,
        string taskId,
        CancellationToken cancellationToken
    )
    {
        ValidAltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId).Validate();
        bool alreadyPaid = await _paymentService.PrepareAbandon(dataMutator, paymentConfiguration, cancellationToken);
        if (!alreadyPaid)
            return null;

        List<ValidationIssueWithSource> validationIssues =
        [
            ValidationIssueWithSource.FromIssue(
                BuiltInValidationIssues.PaymentAlreadyCompleted(paymentConfiguration.PaymentDataType),
                source: GetType().FullName ?? nameof(PaymentProcessTask),
                noIncrementalUpdates: true
            ),
        ];
        await _translationService.TranslateValidationIssues(validationIssues, dataMutator.Language);
        return new ProcessChangeResult
        {
            Success = false,
            ErrorType = ProcessErrorType.Conflict,
            ErrorTitle = "The payment is already completed.",
            ErrorMessage =
                $"Task {LogSanitizer.Sanitize(taskId)} cannot be rejected, because the payment has gone through at the payment processor.",
            ValidationIssues = validationIssues,
        };
    }

    private Task<ServiceTaskOpeningStageResult> StartAttempt(StageContext context, ServiceTaskMailbox mailbox) =>
        _paymentService.StartAttempt(context, mailbox, GetPaymentConfiguration(context.InstanceDataMutator));

    private Task<ServiceTaskExchangeResult> HandleAttemptMessage(StageContext context, ServiceTaskReply reply) =>
        _paymentService.HandleAttemptMessage(context, reply, GetPaymentConfiguration(context.InstanceDataMutator));

    private Task<ServiceTaskResult> SettleAtDeadline(StageContext context, MailboxClosedReason _) =>
        _paymentService.SettleAtDeadline(context, GetPaymentConfiguration(context.InstanceDataMutator));

    private ValidAltinnPaymentConfiguration GetPaymentConfiguration(IInstanceDataAccessor dataAccessor) =>
        GetAltinnPaymentConfiguration(GetTaskId(dataAccessor)).Validate();

    /// <summary>
    /// Stores what the payment processor reports for a payment the record does not show as paid, in a stage of its own
    /// because the receipt is made from the record in Storage. It is the net for two runs of one attempt step that
    /// overlap, where Storage keeps one run's record and the engine the other's ending: the process then moves on with a
    /// record that still shows the payment reserved.
    /// </summary>
    private async Task<StageResult> RefreshUnpaidPayment(StageContext context)
    {
        await _paymentService.RefreshUnpaidPayment(
            context.InstanceDataMutator,
            GetPaymentConfiguration(context.InstanceDataMutator),
            context.CancellationToken
        );
        return StageResult.Completed();
    }

    /// <summary>
    /// Stores the receipt of a completed payment. One stage: whether a receipt is due is read from the stored
    /// payment, which costs nothing to repeat, so only generating the receipt is worth retrying. A receipt this
    /// task already stored is kept, so a step run again after it committed does not store a second one.
    /// </summary>
    private async Task<StageResult> StoreReceipt(StageContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = GetTaskId(dataMutator);
        ValidAltinnPaymentConfiguration configuration = GetAltinnPaymentConfiguration(taskId).Validate();

        StoredPaymentInformation? storedPayment = await StoredPaymentInformation.Read(
            dataMutator,
            configuration.PaymentDataType
        );
        // Only a payment attempt moves the task on, after storing Paid or Skipped; this is a safety net.
        if (storedPayment is null)
        {
            return StageResult.FailedRetryable("Payment information not found.");
        }

        PaymentInformation payment = storedPayment.PaymentInformation;
        if (payment.Status == PaymentStatus.Skipped)
        {
            return StageResult.Completed();
        }
        if (payment.Status != PaymentStatus.Paid)
        {
            return StageResult.FailedRetryable("The payment is not completed.");
        }
        if (HasReceiptFrom(dataMutator, configuration.PaymentReceiptPdfDataType, taskId))
        {
            return StageResult.Completed();
        }

        // The actor's language: the one the user chose for the transition, or for the payment processor's webhook, the
        // language the user paid in
        byte[] pdf = await _pdfService.GeneratePdf(
            dataMutator.Instance,
            taskId,
            language: dataMutator.Language ?? LanguageConst.Nb,
            cancellationToken: context.CancellationToken
        );
        dataMutator.AddBinaryDataElement(
            configuration.PaymentReceiptPdfDataType,
            PdfContentType,
            ReceiptFileName,
            pdf,
            generatedFromTask: taskId
        );
        return StageResult.Completed();
    }

    /// <summary>
    /// Removes the stored payment record when the payment can no longer complete. Any other record stays, so that a
    /// later pay action, which runs before any transition, can terminate or verify the payment with the processor.
    /// </summary>
    private async Task<StageResult> RemoveClosedPayment(StageContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        ValidAltinnPaymentConfiguration configuration = GetAltinnPaymentConfiguration(GetTaskId(dataMutator))
            .Validate();

        StoredPaymentInformation? storedPayment = await StoredPaymentInformation.Read(
            dataMutator,
            configuration.PaymentDataType
        );

        if (storedPayment is not null && storedPayment.PaymentInformation.Status.IsClosed())
        {
            dataMutator.RemoveDataElement(storedPayment.DataElement);
        }
        return StageResult.Completed();
    }

    private static string GetTaskId(IInstanceDataAccessor dataAccessor) =>
        dataAccessor.TaskId
        ?? dataAccessor.Instance.Process?.CurrentTask?.ElementId
        ?? throw new InvalidOperationException("Process task requires a current task id.");

    /// <summary>
    /// Whether the instance already holds a receipt this task generated. Receipts from earlier visits to the task
    /// are removed when the task starts, so one that is present when the task ends was stored by this transition.
    /// </summary>
    private static bool HasReceiptFrom(IInstanceDataAccessor dataAccessor, string receiptDataType, string taskId) =>
        dataAccessor
            .GetDataElementsForType(receiptDataType)
            .Any(element =>
                element.References?.Exists(reference =>
                    reference.Relation == RelationType.GeneratedFrom
                    && reference.ValueType == ReferenceType.Task
                    && reference.Value == taskId
                )
                    is true
            );

    private AltinnPaymentConfiguration GetAltinnPaymentConfiguration(string taskId)
    {
        AltinnPaymentConfiguration? paymentConfiguration = _processReader
            .GetAltinnTaskExtension(taskId)
            ?.PaymentConfiguration;

        if (paymentConfiguration == null)
        {
            throw new ApplicationConfigException("PaymentConfig is missing in the payment process task configuration.");
        }

        _ = paymentConfiguration.Validate();

        return paymentConfiguration;
    }
}
