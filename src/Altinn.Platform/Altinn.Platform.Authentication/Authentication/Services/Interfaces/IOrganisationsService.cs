using System.Threading.Tasks;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Interface handling methods for operations related to organisations
    /// </summary>
    public interface IOrganisationsService 
    {
        /// <summary>
        /// Lookups an organisation and returns the altinn org identifier.
        /// </summary>
        /// <param name="orgNumber">organisation number</param>
        /// <returns>altin organisation identifier</returns>
        public Task<string> LookupOrg(string orgNumber);
    }
}
