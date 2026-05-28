using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for collecting user payment.
/// </summary>
internal sealed class PaymentProcessTask : IProcessTask
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly IPdfService _pdfService;
    private readonly IProcessReader _processReader;
    private readonly IPaymentService _paymentService;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IAppMetadata _appMetadata;
    private readonly IHostEnvironment _hostEnvironment;

    private const string PdfContentType = "application/pdf";
    private const string ReceiptFileName = "Betalingskvittering.pdf";

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentProcessTask"/> class.
    /// </summary>
    public PaymentProcessTask(
        IPdfService pdfService,
        IProcessReader processReader,
        IPaymentService paymentService,
        AppImplementationFactory appImplementationFactory,
        IAppMetadata appMetadata,
        IHostEnvironment hostEnvironment
    )
    {
        _pdfService = pdfService;
        _processReader = processReader;
        _paymentService = paymentService;
        _appImplementationFactory = appImplementationFactory;
        _appMetadata = appMetadata;
        _hostEnvironment = hostEnvironment;
    }

    /// <inheritdoc/>
    public string Type => AltinnTaskTypes.Payment;

    /// <inheritdoc/>
    public async Task Start(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        Instance instance = dataMutator.Instance;
        string taskId = GetTaskId(dataMutator);
        ValidAltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId).Validate();

        if (_hostEnvironment.IsDevelopment())
        {
            ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
            AllowedContributorsHelper.EnsureDataTypeIsAppOwned(appMetadata, paymentConfiguration.PaymentDataType);
        }

        await CleanupAnyExistingPayment(dataMutator, paymentConfiguration);
    }

    /// <inheritdoc/>
    public async Task End(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken ct = context.CancellationToken;
        Instance instance = dataMutator.Instance;
        string taskId = GetTaskId(dataMutator);
        AltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId);

        PaymentStatus paymentStatus = await _paymentService.GetPaymentStatus(instance, paymentConfiguration.Validate());

        if (paymentStatus == PaymentStatus.Skipped)
            return;

        if (paymentStatus != PaymentStatus.Paid)
            throw new PaymentException("The payment is not completed.");

        await using Stream pdfStream = await _pdfService.GeneratePdf(instance, taskId, false, ct: ct);
        using var memoryStream = new MemoryStream();
        await pdfStream.CopyToAsync(memoryStream, ct);

        ValidAltinnPaymentConfiguration validatedPaymentConfiguration = paymentConfiguration.Validate();
        UpsertTaskGeneratedBinaryDataElement(
            dataMutator,
            validatedPaymentConfiguration.PaymentReceiptPdfDataType,
            PdfContentType,
            ReceiptFileName,
            memoryStream.ToArray(),
            taskId
        );
    }

    /// <inheritdoc/>
    public async Task Abandon(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        Instance instance = dataMutator.Instance;
        string taskId = GetTaskId(dataMutator);
        AltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId);
        await CleanupAnyExistingPayment(dataMutator, paymentConfiguration.Validate());
    }

    private static string GetTaskId(IInstanceDataAccessor dataAccessor) =>
        dataAccessor.TaskId
        ?? dataAccessor.Instance.Process?.CurrentTask?.ElementId
        ?? throw new InvalidOperationException("Process task requires a current task id.");

    private async Task CleanupAnyExistingPayment(
        IInstanceDataMutator dataMutator,
        ValidAltinnPaymentConfiguration paymentConfiguration
    )
    {
        DataElement? paymentDataElement = dataMutator
            .GetDataElementsForType(paymentConfiguration.PaymentDataType)
            .SingleOrDefault();
        if (paymentDataElement is null)
        {
            return;
        }

        ReadOnlyMemory<byte> paymentData = await dataMutator.GetBinaryData(paymentDataElement);
        PaymentInformation paymentInformation =
            JsonSerializer.Deserialize<PaymentInformation>(paymentData.Span, _jsonSerializerOptions)
            ?? throw new InvalidOperationException("Unable to deserialize stored payment information.");

        if (paymentInformation.Status == PaymentStatus.Paid)
        {
            return;
        }

        if (paymentInformation.Status != PaymentStatus.Skipped)
        {
            string paymentProcessorId = paymentInformation.OrderDetails.PaymentProcessorId;
            IPaymentProcessor paymentProcessor =
                _appImplementationFactory
                    .GetAll<IPaymentProcessor>()
                    .FirstOrDefault(pp => pp.PaymentProcessorId == paymentProcessorId)
                ?? throw new PaymentException($"Payment processor with ID '{paymentProcessorId}' not found.");

            bool success = await paymentProcessor.TerminatePayment(dataMutator.Instance, paymentInformation);
            string paymentId = paymentInformation.PaymentDetails?.PaymentId ?? "missing";
            if (!success)
            {
                throw new PaymentException(
                    $"Unable to cancel existing {paymentProcessorId} payment with ID: {paymentId}."
                );
            }
        }

        dataMutator.RemoveDataElement(paymentDataElement);
    }

    private static void UpsertTaskGeneratedBinaryDataElement(
        IInstanceDataMutator dataMutator,
        string dataTypeId,
        string contentType,
        string fileName,
        ReadOnlyMemory<byte> bytes,
        string taskId
    )
    {
        DataElement? existingDataElement = dataMutator.Instance.Data.SingleOrDefault(de =>
            de.DataType == dataTypeId
            && de.References?.Exists(reference =>
                reference.ValueType == ReferenceType.Task && reference.Value == taskId
            )
                is true
        );

        if (existingDataElement is not null)
        {
            dataMutator.UpdateBinaryDataElement(existingDataElement, contentType, bytes);
            return;
        }

        dataMutator.AddBinaryDataElement(dataTypeId, contentType, fileName, bytes, generatedFromTask: taskId);
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
