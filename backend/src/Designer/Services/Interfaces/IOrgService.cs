using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface to describe the org service.
    /// </summary>
    public interface IOrgService
    {
        /// <summary>
        /// Returns the list of organisations with metadata from CDN.
        /// </summary>
        public Task<OrgList> GetOrgList();

        /// <summary>
        /// Checks if provided organisation name is in org list.
        /// </summary>
        public Task<bool> IsOrg(string nameToCheck);
    }
}
