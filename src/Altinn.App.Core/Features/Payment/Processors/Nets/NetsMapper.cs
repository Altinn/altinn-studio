using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;

namespace Altinn.App.Core.Features.Payment.Processors.Nets;

/// <summary>
/// Various mapping methods between Nets types and our internal types.
/// </summary>
internal static class NetsMapper
{
    /// <summary>
    /// Map from NetsConsumer to our Payer type.
    /// </summary>
    public static Payer? MapPayerDetails(NetsConsumer? consumer)
    {
        if (consumer == null)
        {
            return null;
        }

        PayerCompany? payerCompany =
            consumer.Company != null
                ? new PayerCompany
                {
                    Name = consumer.Company.Name,
                    OrganisationNumber = consumer.Company.RegistrationNumber,
                    ContactPerson = new PayerPrivatePerson
                    {
                        FirstName = consumer.Company.ContactDetails?.FirstName,
                        LastName = consumer.Company.ContactDetails?.LastName,
                        Email = consumer.Company.ContactDetails?.Email,
                        PhoneNumber = new PhoneNumber
                        {
                            Prefix = consumer.Company.ContactDetails?.PhoneNumber?.Prefix,
                            Number = consumer.Company.ContactDetails?.PhoneNumber?.Number,
                        }
                    }
                }
                : null;

        PayerPrivatePerson? payerPrivatePerson =
            consumer.PrivatePerson != null
                ? new PayerPrivatePerson
                {
                    FirstName = consumer.PrivatePerson.FirstName,
                    LastName = consumer.PrivatePerson.LastName,
                    Email = consumer.PrivatePerson.Email,
                    PhoneNumber = new PhoneNumber
                    {
                        Prefix = consumer.PrivatePerson.PhoneNumber?.Prefix,
                        Number = consumer.PrivatePerson.PhoneNumber?.Number,
                    }
                }
                : null;

        return new Payer
        {
            Company = payerCompany,
            PrivatePerson = payerPrivatePerson,
            ShippingAddress = MapAddress(consumer.ShippingAddress),
            BillingAddress = MapAddress(consumer.BillingAddress),
        };
    }

    /// <summary>
    /// Map from our PayerType enum to Nets consumer types.
    /// </summary>
    public static List<string> MapConsumerTypes(PayerType[]? payerTypes)
    {
        List<string> consumerTypes = [];

        if (payerTypes == null)
            return consumerTypes;

        if (payerTypes.Contains(PayerType.Company))
        {
            consumerTypes.Add("B2B");
        }

        if (payerTypes.Contains(PayerType.Person))
        {
            consumerTypes.Add("B2C");
        }

        return consumerTypes;
    }

    /// <summary>
    /// Map from NetsInvoiceDetails to our InvoiceDetails type.
    /// </summary>
    public static InvoiceDetails? MapInvoiceDetails(NetsInvoiceDetails? netsInvoiceDetails)
    {
        if (netsInvoiceDetails == null)
            return null;

        return new InvoiceDetails { InvoiceNumber = netsInvoiceDetails.InvoiceNumber, };
    }

    /// <summary>
    /// Map from NetsCardDetails to our CardDetails type.
    /// </summary>
    public static CardDetails? MapCardDetails(NetsCardDetails? netsCardDetails)
    {
        if (netsCardDetails == null)
            return null;

        return new CardDetails { MaskedPan = netsCardDetails.MaskedPan, ExpiryDate = netsCardDetails.ExpiryDate };
    }

    /// <summary>
    /// Map from NetsAddress to our Address type.
    /// </summary>
    public static Address? MapAddress(NetsAddress? address)
    {
        if (address == null)
            return null;

        return new Address
        {
            Name = address.ReceiverLine,
            AddressLine1 = address.AddressLine1,
            AddressLine2 = address.AddressLine2,
            PostalCode = address.PostalCode,
            City = address.City,
            Country = address.Country,
        };
    }
}
