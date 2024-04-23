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

namespace Altinn.App.Custom.Payment;

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
    
    public async Task<OrderDetails> CalculateOrderDetails(Instance instance)
    {
        Form formData = await GetFormData(instance);

        List<PaymentOrderLine> paymentOrderLines = formData.GoodsAndServicesProperties.Inventory.InventoryProperties
            .Where(x => !string.IsNullOrEmpty(x.NiceClassification) && !string.IsNullOrEmpty(x.GoodsAndServices))
            .Select((x, index) =>
                new PaymentOrderLine
                {
                    Id = index.ToString(), Name = $"{x.NiceClassification} - {x.GoodsAndServices}", PriceExVat = GetPriceForNiceClassification(x), Quantity = 1, VatPercent = 25.00M
                })
            .ToList();

        return new OrderDetails { PaymentProcessorId = "Nets Easy", Currency = "NOK", OrderLines = paymentOrderLines, Receiver = };
    }

    private async Task<Form> GetFormData(Instance instance)
    {
        DataElement modelData = instance.Data.Single(x => x.DataType == "model");
        InstanceIdentifier instanceIdentifier = new(instance);
        
        return (Form) await _dataClient.GetFormData(instanceIdentifier.InstanceGuid, typeof(Form), instance.Org, instance.AppId,
            instanceIdentifier.InstanceOwnerPartyId, new Guid(modelData.Id));
    }

    private decimal GetPriceForNiceClassification(InventoryProperties inventoryProperties)
    {
        switch (inventoryProperties.NiceClassification)
        {
            case "1":
                return 1000.00M;
            case "2":
                return 2000.00M;
            default:
                return 500.00M;
        }
    }
}