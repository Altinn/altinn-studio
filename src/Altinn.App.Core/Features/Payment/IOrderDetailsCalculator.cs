using Altinn.App.Core.Features.Payment.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Payment;

/// <summary>
/// Interface that app developers need to implement in order to use the payment feature
/// </summary>
[ImplementableByApps]
public interface IOrderDetailsCalculator
{
    /// <summary>
    /// Method that calculates an order based on an instance.
    /// </summary>
    /// <remarks>
    /// The instance (and its data) needs to be fetched based on the <see cref="Instance"/> if the calculation
    /// depends on instance or data properties.
    /// This method can be called multiple times for the same instance, in order to preview the price before payment starts.
    /// </remarks>
    /// <returns>The Payment order that contains information about the requested payment</returns>
    Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language);
}
