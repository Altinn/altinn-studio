using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Platform.Events.Functions.Services.Interfaces
{
    /// <summary>
    /// Interface for validate subscription
    /// </summary>
    public interface IValidateSubscriptionService
    {
        /// <summary>
        /// Validates a subscription
        /// </summary>
        /// <returns></returns>
        public Task ValidateSubscription(int subscriptionId);
    }
}
