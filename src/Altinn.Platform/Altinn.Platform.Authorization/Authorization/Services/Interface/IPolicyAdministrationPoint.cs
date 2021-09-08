using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// Defines the interface for the Policy Administration Point
    /// </summary>
    public interface IPolicyAdministrationPoint
    {
        /// <summary>
        /// Returns a bool based on writing file to storage was successful
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileStream">A stream containing the content of the policy file</param>
        /// <returns></returns>
        Task<bool> WritePolicyAsync(string org, string app, Stream fileStream);

        /// <summary>
        /// Returns a bool based on writing rules for delegation to delegation policy files completed successfully.
        /// </summary>
        /// <param name="rules">The set of rules to be delegated</param>
        /// <returns>Bool result of success.</returns>
        Task<Dictionary<string, bool>> TryWriteDelegationPolicyRules(IList<Rule> rules);
    }
}
