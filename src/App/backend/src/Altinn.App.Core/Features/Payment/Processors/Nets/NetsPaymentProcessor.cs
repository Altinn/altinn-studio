using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Payment.Processors.Nets;

/// <summary>
/// Implementation of IPaymentProcessor for Nets. https://developer.nexigroup.com/nexi-checkout/en-EU/api/
/// </summary>
internal class NetsPaymentProcessor : IPaymentProcessor
{
    private readonly NetsPaymentSettings _settings;
    private readonly GeneralSettings _generalSettings;
    private readonly INetsClient _netsClient;

    /// <summary>
    /// Amounts are specified in the lowest monetary unit for the given currency, without punctuation marks. For example: 100,00 NOK is specified as 10000 and 9.99 USD is specified as 999.
    /// Entering the amount 100 corresponds to 1 unit of the currency entered, such as e.g. 1 NOK.
    /// </summary>
    private const int LowestMonetaryUnitMultiplier = 100;

    /// <summary>
    /// Implementation of IPaymentProcessor for Nets.
    /// </summary>
    public NetsPaymentProcessor(
        INetsClient netsClient,
        IOptions<NetsPaymentSettings> settings,
        IOptions<GeneralSettings> generalSettings
    )
    {
        _netsClient = netsClient;
        _settings = settings.Value;
        _generalSettings = generalSettings.Value;
    }

    /// <inheritdoc />
    public string PaymentProcessorId => "Nets Easy";

    /// <inheritdoc />
    public async Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language)
    {
        var instanceIdentifier = new InstanceIdentifier(instance);
        string baseUrl = _generalSettings.FormattedExternalAppBaseUrl(new AppIdentifier(instance));
        var altinnAppUrl = $"{baseUrl}#/instance/{instanceIdentifier}";

        if (_settings.MerchantHandlesConsumerData == true && orderDetails.Payer is null)
        {
            throw new PaymentException(
                "Payer is missing in orderDetails. MerchantHandlesConsumerData is set to true. Payer must be provided."
            );
        }

        var payment = new NetsCreatePayment()
        {
            Order = new NetsOrder
            {
                Amount = (int)(orderDetails.TotalPriceIncVat * LowestMonetaryUnitMultiplier),
                Currency = orderDetails.Currency,
                Reference = orderDetails.OrderReference,
                Items = orderDetails
                    .OrderLines.Select(l => new NetsOrderItem()
                    {
                        Reference = l.Id,
                        Name = l.Name,
                        Quantity = l.Quantity,
                        Unit = l.Unit,
                        UnitPrice = (int)(l.PriceExVat * LowestMonetaryUnitMultiplier),
                        GrossTotalAmount = (int)(
                            l.PriceExVat * LowestMonetaryUnitMultiplier * l.Quantity * (1 + l.VatPercent / 100)
                        ),
                        NetTotalAmount = (int)(l.PriceExVat * LowestMonetaryUnitMultiplier * l.Quantity),
                        TaxAmount = (int)(
                            l.PriceExVat * LowestMonetaryUnitMultiplier * l.Quantity * (l.VatPercent / 100)
                        ),
                        TaxRate = (int)(l.VatPercent * LowestMonetaryUnitMultiplier),
                    })
                    .ToList(),
            },
            MyReference = instance.Id.Split('/')[1],
            PaymentMethodsConfiguration = _settings
                .PaymentMethodsConfiguration?.Select(x => new NetsPaymentMethodConfiguration
                {
                    Name = x.Name,
                    Enabled = x.Enabled,
                })
                .ToList(),
            Checkout = new NetsCheckout
            {
                IntegrationType = "HostedPaymentPage",
                TermsUrl = _settings.TermsUrl,
                ReturnUrl = altinnAppUrl,
                CancelUrl = altinnAppUrl,
                Consumer = NetsMapper.MapConsumerDetails(orderDetails.Payer),
                MerchantHandlesConsumerData = _settings.MerchantHandlesConsumerData ?? orderDetails.Payer is not null,
                ConsumerType = new NetsConsumerType
                {
                    SupportedTypes = NetsMapper.MapConsumerTypes(orderDetails.AllowedPayerTypes),
                },
                Appearance = new NetsApparence
                {
                    DisplayOptions = new NetsApparence.NetsDisplayOptions
                    {
                        ShowOrderSummary = _settings.ShowOrderSummary,
                        ShowMerchantName = _settings.ShowMerchantName,
                    },
                },
                Charge = true,
            },
        };

        HttpApiResult<NetsCreatePaymentSuccess> httpApiResult = await _netsClient.CreatePayment(payment);
        if (!httpApiResult.IsSuccess || httpApiResult.Result?.HostedPaymentPageUrl is null)
        {
            throw new PaymentException(
                "Failed to create payment\n" + httpApiResult.Status + " - " + httpApiResult.RawError
            );
        }

        string hostedPaymentPageUrl = httpApiResult.Result.HostedPaymentPageUrl;
        string paymentId = httpApiResult.Result.PaymentId;

        return new PaymentDetails
        {
            PaymentId = paymentId,
            RedirectUrl = AddLanguageQueryParam(hostedPaymentPageUrl, language),
        };
    }

    /// <inheritdoc />
    public async Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation)
    {
        if (paymentInformation.PaymentDetails?.PaymentId is null)
        {
            throw new PaymentException("PaymentId is missing in paymentInformation. Can't terminate.");
        }

        bool result = await _netsClient.TerminatePayment(paymentInformation.PaymentDetails.PaymentId);
        return result;
    }

    /// <inheritdoc />
    public async Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(
        Instance instance,
        string paymentId,
        decimal expectedTotalIncVat,
        string? language
    )
    {
        HttpApiResult<NetsPaymentFull> httpApiResult = await _netsClient.RetrievePayment(paymentId);

        if (!httpApiResult.IsSuccess || httpApiResult.Result is null)
        {
            throw new PaymentException(
                "Failed to retrieve payment\n" + httpApiResult.Status + " - " + httpApiResult.RawError
            );
        }

        NetsPayment payment =
            httpApiResult.Result.Payment
            ?? throw new PaymentException("Payment information is null in the response from Nets");
        decimal? chargedAmount = payment.Summary?.ChargedAmount;

        PaymentStatus status = chargedAmount > 0 ? PaymentStatus.Paid : PaymentStatus.Created;
        NetsPaymentDetails? paymentPaymentDetails = payment.PaymentDetails;

        NetsCheckoutUrls checkout =
            payment.Checkout ?? throw new PaymentException("Checkout information is missing in the response from Nets");
        string checkoutUrl =
            checkout.Url ?? throw new PaymentException("Checkout URL is missing in the response from Nets");

        PaymentDetails paymentDetails = new()
        {
            PaymentId = paymentId,
            RedirectUrl = AddLanguageQueryParam(checkoutUrl, language),
            Payer = NetsMapper.MapPayerDetails(payment.Consumer),
            PaymentType = paymentPaymentDetails?.PaymentType,
            PaymentMethod = paymentPaymentDetails?.PaymentMethod,
            CreatedDate = payment.Created,
            ChargedDate = payment.Charges?.FirstOrDefault()?.Created,
            InvoiceDetails = NetsMapper.MapInvoiceDetails(paymentPaymentDetails?.InvoiceDetails),
            CardDetails = NetsMapper.MapCardDetails(paymentPaymentDetails?.CardDetails),
        };

        return (status, paymentDetails);
    }

    private static string AddLanguageQueryParam(string url, string? language)
    {
        string? languageCode = language switch
        {
            "nb" => "nb-NO",
            "nn" => "nb-NO", //No support for Nynorsk. Using Bokmål.
            _ => null,
        };

        if (string.IsNullOrEmpty(languageCode))
            return url;

        return QueryHelpers.AddQueryString(url, "language", languageCode);
    }
}
