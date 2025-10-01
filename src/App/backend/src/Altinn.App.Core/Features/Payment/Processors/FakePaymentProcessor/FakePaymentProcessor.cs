using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Payment.Processors.FakePaymentProcessor;

/// <summary>
/// This class is a fake payment processor that can be used for testing purposes.
/// </summary>
internal sealed class FakePaymentProcessor : IPaymentProcessor
{
    private readonly GeneralSettings _generalSettings;
    public string PaymentProcessorId => "Fake Payment Processor";

    public FakePaymentProcessor(IOptions<GeneralSettings> generalSettings)
    {
        _generalSettings = generalSettings.Value;
    }

    public Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language)
    {
        return Task.FromResult(
            new PaymentDetails { PaymentId = "fake-payment-id", RedirectUrl = GetAltinnAppUrl(instance) }
        );
    }

    public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation)
    {
        return Task.FromResult(true);
    }

    public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(
        Instance instance,
        string paymentId,
        decimal expectedTotalIncVat,
        string? language
    )
    {
        return Task.FromResult(
            (
                PaymentStatus.Paid,
                new PaymentDetails
                {
                    PaymentId = paymentId,
                    RedirectUrl = GetAltinnAppUrl(instance),
                    Payer = new Payer
                    {
                        PrivatePerson = new PayerPrivatePerson
                        {
                            FirstName = "Test",
                            LastName = "Testersen",
                            Email = "test@test.no",
                            PhoneNumber = new PhoneNumber { Prefix = "+47", Number = "12345678" },
                        },
                    },
                    PaymentType = "CARD",
                    PaymentMethod = "MasterCard",
                    CreatedDate = new DateTime().ToLongDateString(),
                    ChargedDate = new DateTime().ToLongDateString(),
                    InvoiceDetails = null,
                    CardDetails = new CardDetails
                    {
                        ExpiryDate = new DateTime().AddYears(2).ToLongDateString(),
                        MaskedPan = "1234********1234",
                    },
                }
            )
        );
    }

    private string GetAltinnAppUrl(Instance instance)
    {
        var instanceIdentifier = new InstanceIdentifier(instance);
        string baseUrl = _generalSettings.FormattedExternalAppBaseUrl(new AppIdentifier(instance));
        var altinnAppUrl = $"{baseUrl}#/instance/{instanceIdentifier}";
        return altinnAppUrl;
    }
}
