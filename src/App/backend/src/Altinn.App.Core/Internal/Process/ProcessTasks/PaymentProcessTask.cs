using System.Diagnostics;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Exceptions;
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

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for collecting user payment.
/// </summary>
internal sealed class PaymentProcessTask : IProcessTask, IProcessTaskAbandonPreparer
{
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
    public async Task Start(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = GetTaskId(dataMutator);
        ValidAltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId).Validate();

        await RemoveClosedPayment(dataMutator, paymentConfiguration);
    }

    /// <inheritdoc/>
    public async Task End(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken cancellationToken = context.CancellationToken;
        string taskId = GetTaskId(dataMutator);
        ValidAltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId).Validate();

        PaymentInformation paymentInformation =
            (await StoredPaymentInformation.Read(dataMutator, paymentConfiguration.PaymentDataType))?.PaymentInformation
            ?? throw new PaymentException("Payment information not found.");

        if (paymentInformation.Status == PaymentStatus.Skipped)
            return;

        // PaymentTaskValidator refuses the transition before it starts; this is a safety net.
        if (paymentInformation.Status != PaymentStatus.Paid)
            throw new PaymentException("The payment is not completed.");

        // The actor's language: the one the user chose for the transition, or for the payment processor's webhook, the
        // language the user paid in
        byte[] pdf = await _pdfService.GeneratePdf(
            dataMutator.Instance,
            taskId,
            language: dataMutator.Language ?? LanguageConst.Nb,
            cancellationToken: cancellationToken
        );

        dataMutator.AddBinaryDataElement(
            paymentConfiguration.PaymentReceiptPdfDataType,
            PdfContentType,
            ReceiptFileName,
            pdf,
            generatedFromTask: taskId
        );
    }

    /// <inheritdoc/>
    /// <remarks>
    /// <see cref="PrepareAbandon"/> has settled the payment with the payment processor before the transition.
    /// </remarks>
    public async Task Abandon(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = GetTaskId(dataMutator);
        ValidAltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId).Validate();

        await RemoveClosedPayment(dataMutator, paymentConfiguration);
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult?> PrepareAbandon(
        IInstanceDataMutator dataMutator,
        string taskId,
        CancellationToken cancellationToken
    )
    {
        ValidAltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId).Validate();
        PaymentAbandonOutcome outcome = await _paymentService.PrepareAbandon(
            dataMutator,
            paymentConfiguration,
            cancellationToken
        );

        switch (outcome)
        {
            case PaymentAbandonOutcome.CanAbandon:
                return null;
            case PaymentAbandonOutcome.AlreadyPaid:
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
            case PaymentAbandonOutcome.NotTerminated:
            case PaymentAbandonOutcome.PaymentProcessorFailed:
                return new ProcessChangeResult
                {
                    Success = false,
                    ErrorType = ProcessErrorType.Internal,
                    ErrorTitle = "The payment could not be cancelled.",
                    ErrorMessage =
                        $"Task {LogSanitizer.Sanitize(taskId)} was not rejected, because the payment could not be cancelled at the payment processor. Try again.",
                };
            default:
                throw new UnreachableException($"Unknown payment abandon outcome {outcome}.");
        }
    }

    private static string GetTaskId(IInstanceDataAccessor dataAccessor) =>
        dataAccessor.TaskId
        ?? dataAccessor.Instance.Process?.CurrentTask?.ElementId
        ?? throw new InvalidOperationException("Process task requires a current task id.");

    /// <summary>
    /// Removes the stored payment record when the payment can no longer complete. Any other record stays, so that a
    /// later pay action, which runs before any transition, can terminate or verify the payment with the processor.
    /// </summary>
    private static async Task RemoveClosedPayment(
        IInstanceDataMutator dataMutator,
        ValidAltinnPaymentConfiguration paymentConfiguration
    )
    {
        StoredPaymentInformation? storedPayment = await StoredPaymentInformation.Read(
            dataMutator,
            paymentConfiguration.PaymentDataType
        );

        if (storedPayment is not null && storedPayment.PaymentInformation.Status.IsClosed())
        {
            dataMutator.RemoveDataElement(storedPayment.DataElement);
        }
    }

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
