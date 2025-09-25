#nullable enable
using Altinn.Platform.Register.Models;

namespace LocalTest.Services.Register.Interface
{
    /// <summary>
    /// Interface handling methods for operations related to organizations
    /// </summary>
    public interface IOrganizations
    {
        /// <summary>
        /// Method that fetches a organization based on a organization number
        /// </summary>
        /// <param name="orgNr">The organization number</param>
        /// <returns></returns>
        Task<Organization?> GetOrganization(string orgNr);
    }
}
