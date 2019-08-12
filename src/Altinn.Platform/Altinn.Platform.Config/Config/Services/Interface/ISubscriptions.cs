using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Config.Services.Interface
{
    /// <summary>
    /// Interface for actions related to subscriptions
    /// </summary>
    public interface ISubscriptions
    {      
        /// <summary>
        /// Checks if there is a valid subscription for a given party and service
        /// </summary>
        /// <param name="partyId">The partyId</param>
        /// <param name="serviceCode">The service code</param>
        /// <param name="serviceEditionCode">The service edition code</param>
        /// <returns>True if the subscription is valid for the reportee</returns>
        Task<bool> ValidateSubscription(int partyId, string serviceCode, int serviceEditionCode);
    }
}
