using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for collecting user payment.
/// </summary>
internal sealed class PaymentProcessTask : IProcessTask
{
    private readonly IPdfService _pdfService;
    private readonly IDataClient _dataClient;
    private readonly IProcessReader _processReader;
    private readonly IPaymentService _paymentService;
    private readonly IAppMetadata _appMetadata;
    private readonly IHostEnvironment _hostEnvironment;

    private const string PdfContentType = "application/pdf";
    private const string ReceiptFileName = "Betalingskvittering.pdf";

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentProcessTask"/> class.
    /// </summary>
    public PaymentProcessTask(
        IPdfService pdfService,
        IDataClient dataClient,
        IProcessReader processReader,
        IPaymentService paymentService,
        IAppMetadata appMetadata,
        IHostEnvironment hostEnvironment
    )
    {
        _pdfService = pdfService;
        _dataClient = dataClient;
        _processReader = processReader;
        _paymentService = paymentService;
        _appMetadata = appMetadata;
        _hostEnvironment = hostEnvironment;
    }

    /// <inheritdoc/>
    public string Type => "payment";

    /// <inheritdoc/>
    public async Task Start(string taskId, Instance instance)
    {
        ValidAltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId).Validate();

        if (_hostEnvironment.IsDevelopment())
        {
            ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
            AllowedContributorsHelper.EnsureDataTypeIsAppOwned(appMetadata, paymentConfiguration.PaymentDataType);
        }

        await _paymentService.CancelAndDeleteAnyExistingPayment(instance, paymentConfiguration);
    }

    /// <inheritdoc/>
    public async Task End(string taskId, Instance instance)
    {
        AltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId);

        PaymentStatus paymentStatus = await _paymentService.GetPaymentStatus(instance, paymentConfiguration.Validate());

        if (paymentStatus == PaymentStatus.Skipped)
            return;

        if (paymentStatus != PaymentStatus.Paid)
            throw new PaymentException("The payment is not completed.");

        Stream pdfStream = await _pdfService.GeneratePdf(instance, taskId, false, CancellationToken.None);

        ValidAltinnPaymentConfiguration validatedPaymentConfiguration = paymentConfiguration.Validate();

        await _dataClient.InsertBinaryData(
            instance.Id,
            validatedPaymentConfiguration.PaymentReceiptPdfDataType,
            PdfContentType,
            ReceiptFileName,
            pdfStream,
            taskId
        );
    }

    /// <inheritdoc/>
    public async Task Abandon(string taskId, Instance instance)
    {
        AltinnPaymentConfiguration paymentConfiguration = GetAltinnPaymentConfiguration(taskId);
        await _paymentService.CancelAndDeleteAnyExistingPayment(instance, paymentConfiguration.Validate());
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
