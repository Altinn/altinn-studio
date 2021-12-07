using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// Defines the required methods for an implementation of a policy information point.
    /// </summary>
    public interface IPolicyInformationPoint
    {
        /// <summary>
        /// Gets rules
        /// </summary>
        /// <param name="orgApp">the org/apps</param>
        /// <param name="offeredByPartyIds">the list of offeredby party ids</param>
        /// <param name="coveredByPartyIds">the list of coveredby party ids</param>
        /// <param name="coveredByUserIds">the list of coveredby user ids</param>
        /// <returns></returns>
        Task<List<Rule>> GetRulesAsync(List<string> orgApp, List<int> offeredByPartyIds, List<int> coveredByPartyIds, List<int> coveredByUserIds);
    }
}
