using System.Threading.Tasks;
using Altinn.App.Services.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for the entity registry (ER: Enhetsregisteret)
    /// </summary>
    public interface IER
    {
        /// <summary>
        /// Method for getting an organization based on a organization nr
        /// </summary>
        /// <param name="OrgNr">the organization number</param>
        /// <returns>The organization for the given organization number</returns>
        Task<Organization> GetOrganization(string OrgNr);
    }
}
