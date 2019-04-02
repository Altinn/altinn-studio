using System.Threading.Tasks;
using AltinnCore.ServiceLibrary;

namespace Altinn.Platform.Register.Services.Interfaces
{
    /// <summary>
    /// Interface handling methods for operations related to organizations
    /// </summary>
    public interface IOrganizations
    {
        /// <summary>
        /// Method that fetches a organization based on a organization number
        /// </summary>
        /// <param name="OrgNr">The organization number</param>
        /// <returns></returns>
        Task<Organization> GetOrganization(string OrgNr);
    }
}
