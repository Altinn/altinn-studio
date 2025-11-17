#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

/// <summary>
/// Calculating order details for payment
/// </summary>
public class OrderDetailsCalculator : IOrderDetailsCalculator
{
    private readonly IDataClient _dataClient;

    public OrderDetailsCalculator(IDataClient dataClient)
    {
        _dataClient = dataClient;
    }
    
    public async Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language)
    {
        Form formData = await GetFormData(instance);

        List<PaymentOrderLine> paymentOrderLines = formData?.GoodsAndServicesProperties?.Inventory?.InventoryProperties != null ? 
          formData.GoodsAndServicesProperties.Inventory.InventoryProperties
            .Where(x => !string.IsNullOrEmpty(x.NiceClassification) && !string.IsNullOrEmpty(x.GoodsAndServices))
            .Select((x, index) =>
                new PaymentOrderLine
                {
                    Id = index.ToString(), Name = $"{x.NiceClassification} - {x.GoodsAndServices}", PriceExVat = GetPriceForNiceClassification(x), Quantity = 1, VatPercent = 25.00M
                })
            .ToList() : [];

        return new OrderDetails { PaymentProcessorId = "Fake Payment Processor", Currency = "NOK", OrderLines = paymentOrderLines, Receiver = GetReceiverDetails(), Payer = GetPayerDetails(formData)};
    }

    private Payer? GetPayerDetails(Form? formData)
    {
        if (formData?.ContactInformation == null || formData.Company == null)
        {
            return null;
        }
        
        ContactInformation contactInformation = formData.ContactInformation;
        Company company = formData.Company;
        CompanyProperties? companyProperties = company.CompanyProperties.FirstOrDefault();

        if(companyProperties == null)
        {
            return null;
        }
        
        var payer = new Payer
        {
            PrivatePerson = new PayerPrivatePerson
            {
                Email = contactInformation.Email,
                PhoneNumber = ExtractPhoneNumber(contactInformation.PhoneNumber),
                FirstName = companyProperties.FirstName,
                LastName = companyProperties.LastName
            },
            BillingAddress = new Address
            {
                Name = companyProperties.CompanyName,
                AddressLine1 = companyProperties.StreetAddress,
                PostalCode = companyProperties.ZipCode,
                City = companyProperties.City,
                Country = companyProperties.Country
            },
            ShippingAddress = new Address
            {
                Name = companyProperties.CompanyName,
                AddressLine1 = companyProperties.StreetAddress,
                PostalCode = companyProperties.ZipCode,
                City = companyProperties.City,
                Country = companyProperties.Country
            }
        };

        return payer;
    }

    private async Task<Form> GetFormData(Instance instance)
    {
        DataElement modelData = instance.Data.Single(x => x.DataType == "model");
        InstanceIdentifier instanceIdentifier = new(instance);
        
        return (Form) await _dataClient.GetFormData(instanceIdentifier.InstanceGuid, typeof(Form), instance.Org, instance.AppId,
            instanceIdentifier.InstanceOwnerPartyId, new Guid(modelData.Id));
    }

    private static decimal GetPriceForNiceClassification(InventoryProperties inventoryProperties)
    {
        return inventoryProperties.NiceClassification switch
        {
            "1" => 1000.00M,
            "2" => 2000.00M,
            _ => 500.00M
        };
    }
    
    private static PaymentReceiver GetReceiverDetails()
    {
        return new PaymentReceiver
        {
            Name = "Patentstyret",
            OrganisationNumber = "971 526 157",
            BankAccountNumber = "123456789",
            Email = "test.mail@patentstyret.no",
            PhoneNumber = new PhoneNumber { Prefix = "+47", Number = "12345678" },
            PostalAddress = new Address
            {
                Name = "Patentstyret",
                AddressLine1 = "Postboks 4863 Nydalen",
                AddressLine2 = "",
                PostalCode = "N-0422",
                City = "Oslo",
                Country = "Norway",
            }
        };
    }
    
    public static PhoneNumber ExtractPhoneNumber(string fullPhoneNumber)
    {
        string prefix = fullPhoneNumber.Substring(0, 3);
        string number = fullPhoneNumber.Substring(3);

        return new PhoneNumber
        {
            Prefix = prefix,
            Number = number
        };
    }
}
