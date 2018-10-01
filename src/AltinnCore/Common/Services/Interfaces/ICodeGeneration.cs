using System.Collections.Generic;
using AltinnCore.Common.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for the service containing all operations related to code generation for a service
    /// </summary>
    public interface ICodeGeneration
    {
        /// <summary>
        /// Method which generates a class containing calculation and validation logic for a service based on the
        /// given input
        /// </summary>
        /// <param name="org">The organization code</param>
        /// <param name="service">The service code</param>
        /// <param name="edition">The service edition</param>
        /// <param name="ruleContainers">The rule containers to generate logic based on</param>
        /// <param name="serviceMetadata">The service metadata of the service to generate the class for</param>
        void CreateCalculationsAndValidationsClass(string org, string service, string edition,
           List<RuleContainer> ruleContainers, ServiceMetadata serviceMetadata);

        /// <summary>
        /// Gets details about all available rule types
        /// </summary>
        /// <returns>A list of available rule types</returns>
        List<RuleType> GetRuleTypes();

        /// <summary>
        /// Gets details about all available condition types
        /// </summary>
        /// <returns>A list of available condition types</returns>
        List<ConditionType> GetConditionTypes();
    }
}
