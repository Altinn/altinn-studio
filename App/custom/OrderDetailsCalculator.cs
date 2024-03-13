using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Custom.Payment;

/// <summary>
/// Calculating order details for payment
/// </summary>
public class OrderDetailsCalculator : IOrderDetailsCalculator
{
    public Task<OrderDetails> CalculateOrderDetails(Instance instance)
    {
        List<Thing> things =
        [
            new Thing { Description = "A thing", Price = 50 },
            new Thing { Description = "Another thing", Price = 100 }
        ];

        List<PaymentOrderLine> paymentOrderLines = things
            .Select((x, index) =>
                new PaymentOrderLine
                {
                    Id = index.ToString(), Name = x.Description, PriceExVat = x.Price, Quantity = 1, VatPercent = 25.00M
                })
            .ToList();

        var orderDetails = new OrderDetails { Currency = "NOK", OrderLines = paymentOrderLines };

        return Task.FromResult(orderDetails);
    }

    private class Thing
    {
        public required string Description { get; init; }
        public required decimal Price { get; init; }
    }
}