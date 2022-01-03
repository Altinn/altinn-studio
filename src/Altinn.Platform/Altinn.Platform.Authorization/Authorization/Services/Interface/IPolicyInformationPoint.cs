using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// Defines the required methods for an implementation of a policy information point.
    /// </summary>
    public interface IPolicyInformationPoint
    {
        /// <summary>
        /// Gets the rules for a list of org/apps, given by a list of offeredbyPartyIds to a list of coveredbyIds
        /// </summary>
        /// <param name="appIds">the org/apps</param>
        /// <param name="offeredByPartyIds">the list of offeredby party ids</param>
        /// <param name="coveredByPartyIds">the list of coveredby party ids</param>
        /// <param name="coveredByUserIds">the list of coveredby user ids</param>
        /// <returns>a list of rules that match the lists of org/apps, offeredby ids, and coveredby ids</returns>
        Task<List<Rule>> GetRulesAsync(List<string> appIds, List<int> offeredByPartyIds, List<int> coveredByPartyIds, List<int> coveredByUserIds);
    }
}
