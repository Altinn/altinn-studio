using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Payment;

/// <summary>
/// Verifies that the task's payment is complete and generates the receipt PDF. Declared by the payment task for
/// its end phase. A payment that is not complete is a permanent failure: retrying cannot pay it.
/// </summary>
internal sealed class CompletePaymentCommand : WorkflowEngineCommandBase<ProcessTaskPayload>
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private const string PdfContentType = "application/pdf";
    private const string ReceiptFileName = "Betalingskvittering.pdf";

    public static string Key => "CompletePayment";

    private readonly IProcessReader _processReader;
    private readonly IPdfService _pdfService;

    public CompletePaymentCommand(IProcessReader processReader, IPdfService pdfService)
    {
        _processReader = processReader;
        _pdfService = pdfService;
    }

    /// <inheritdoc/>
    public override string GetKey() => Key;

    /// <inheritdoc/>
    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessTaskPayload payload
    )
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken ct = context.CancellationToken;
        string taskId = payload.TaskId;
        ValidAltinnPaymentConfiguration paymentConfiguration = PaymentTaskConfiguration.Get(_processReader, taskId);

        DataElement? paymentDataElement = dataMutator
            .GetDataElementsForType(paymentConfiguration.PaymentDataType)
            .SingleOrDefault();
        if (paymentDataElement is null)
        {
            return ProcessEngineCommandResult.FailedPermanent(
                $"Process task command '{Key}' failed: Payment information not found.",
                "ProcessTaskCommandFailed"
            );
        }

        ReadOnlyMemory<byte> paymentData = await dataMutator.GetBinaryData(paymentDataElement);
        PaymentInformation paymentInformation =
            JsonSerializer.Deserialize<PaymentInformation>(paymentData.Span, _jsonSerializerOptions)
            ?? throw new InvalidOperationException("Unable to deserialize stored payment information.");

        if (paymentInformation.Status == PaymentStatus.Skipped)
        {
            return ProcessEngineCommandResult.Completed();
        }

        if (paymentInformation.Status != PaymentStatus.Paid)
        {
            return ProcessEngineCommandResult.FailedPermanent(
                $"Process task command '{Key}' failed: The payment is not completed.",
                "ProcessTaskCommandFailed"
            );
        }

        await using Stream pdfStream = await _pdfService.GeneratePdf(dataMutator, taskId, false, ct: ct);
        using var memoryStream = new MemoryStream();
        await pdfStream.CopyToAsync(memoryStream, ct);

        dataMutator.AddBinaryDataElement(
            paymentConfiguration.PaymentReceiptPdfDataType,
            PdfContentType,
            ReceiptFileName,
            memoryStream.ToArray(),
            taskId
        );

        return ProcessEngineCommandResult.Completed();
    }
}
