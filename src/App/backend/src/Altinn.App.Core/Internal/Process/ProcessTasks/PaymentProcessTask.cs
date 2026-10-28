using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for collecting user payment.
/// </summary>
internal sealed class PaymentProcessTask : IProcessTask
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly IPdfService _pdfService;
    private readonly IProcessReader _processReader;
    private readonly AppImplementationFactory _appImplementationFactory;

    private const string PdfContentType = "application/pdf";
    private const string ReceiptFileName = "Betalingskvittering.pdf";

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentProcessTask"/> class.
    /// </summary>
    public PaymentProcessTask(
        IPdfService pdfService,
        IProcessReader processReader,
        AppImplementationFactory appImplementationFactory
    )
    {
        _pdfService = pdfService;
        _processReader = processReader;
        _appImplementationFactory = appImplementationFactory;
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
    public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
        pipeline.Stage(CleanupAnyExistingPayment).Build();

    /// <inheritdoc/>
    public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Stage(StoreReceipt).Build();

    /// <inheritdoc/>
    public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) =>
        pipeline.Stage(CleanupAnyExistingPayment).Build();

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

        DataElement? paymentDataElement = dataMutator
            .GetDataElementsForType(configuration.PaymentDataType)
            .SingleOrDefault();
        if (paymentDataElement is null)
        {
            // The user may still start and complete the payment while the engine retries, within its budget.
            return StageResult.FailedRetryable("Payment information not found.");
        }

        PaymentInformation payment = await ReadPaymentInformation(dataMutator, paymentDataElement);
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

        // The actor's language, the one the user chose for the transition, or nb if it has none
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
    /// Cancels a payment that was started but not completed and removes what was stored about it, so the task
    /// starts, or is left, with no payment pending. A paid payment is kept.
    /// </summary>
    private async Task<StageResult> CleanupAnyExistingPayment(StageContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        ValidAltinnPaymentConfiguration configuration = GetAltinnPaymentConfiguration(GetTaskId(dataMutator))
            .Validate();

        DataElement? paymentDataElement = dataMutator
            .GetDataElementsForType(configuration.PaymentDataType)
            .SingleOrDefault();
        if (paymentDataElement is null)
        {
            return StageResult.Completed();
        }

        PaymentInformation payment = await ReadPaymentInformation(dataMutator, paymentDataElement);
        if (payment.Status == PaymentStatus.Paid)
        {
            return StageResult.Completed();
        }

        if (payment.Status != PaymentStatus.Skipped)
        {
            string paymentProcessorId = payment.OrderDetails.PaymentProcessorId;
            IPaymentProcessor paymentProcessor =
                _appImplementationFactory
                    .GetAll<IPaymentProcessor>()
                    .FirstOrDefault(pp => pp.PaymentProcessorId == paymentProcessorId)
                ?? throw new PaymentException($"Payment processor with ID '{paymentProcessorId}' not found.");

            bool success = await paymentProcessor.TerminatePayment(
                dataMutator.Instance,
                payment,
                context.CancellationToken
            );
            if (!success)
            {
                string paymentId = payment.PaymentDetails?.PaymentId ?? "missing";
                return StageResult.FailedRetryable(
                    $"Unable to cancel existing {paymentProcessorId} payment with ID: {paymentId}."
                );
            }
        }

        dataMutator.RemoveDataElement(paymentDataElement);
        return StageResult.Completed();
    }

    private static string GetTaskId(IInstanceDataAccessor dataAccessor) =>
        dataAccessor.TaskId
        ?? dataAccessor.Instance.Process?.CurrentTask?.ElementId
        ?? throw new InvalidOperationException("Process task requires a current task id.");

    private static async Task<PaymentInformation> ReadPaymentInformation(
        IInstanceDataAccessor dataAccessor,
        DataElement paymentDataElement
    )
    {
        ReadOnlyMemory<byte> paymentData = await dataAccessor.GetBinaryData(paymentDataElement);
        return JsonSerializer.Deserialize<PaymentInformation>(paymentData.Span, _jsonSerializerOptions)
            ?? throw new InvalidOperationException("Unable to deserialize stored payment information.");
    }

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
