using System.Threading.Tasks;

using Altinn.Platform.Authentication.Model;

namespace Altinn.Platform.Authentication.Repositories
{
    /// <summary>
    /// Organisation repository of valid organisations. 
    /// </summary>
    public interface IOrganisationRepository
    {
        /// <summary>
        /// Lookups an organisation and returns the altinn org identifier.
        /// </summary>
        /// <param name="orgNumber">organisation number</param>
        /// <returns>altin organisation identifier</returns>
        public Task<string> LookupOrg(string orgNumber);

        /// <summary>
        /// Lookups an organisation and returns the altinn org identifier.
        /// </summary>
        /// <param name="org">organisation identifierr</param>
        /// <returns>altinn org identifier</returns>
        public Task<string> LookupOrgNumber(string org);

        /// <summary>
        /// Returns the organisation object with the matching org altinn identifier.
        /// </summary>
        /// <param name="org">altinn org identifier</param>
        /// <returns>the organisation or null if not found</returns>
        public Task<Organisation> GetOrganisationByOrg(string org);    

        /// <summary>
        /// Returns the organisation object with the matching orgNumber.
        /// </summary>
        /// <param name="orgNumber">organisation number</param>
        /// <returns>the organisation or null if not found</returns>
        public Task<Organisation> GetOrganisationByOrgNumber(string orgNumber);

        /// <summary>
        /// Trigger harvest of organisation repository.
        /// </summary>
        public Task HarvestOrgs();
    }
}
