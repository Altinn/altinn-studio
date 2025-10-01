using Altinn.Notifications.Core.Models.ContactPoints;

namespace Altinn.Notifications.Core.Integrations
{
    /// <summary>
    /// Interface describing a client for the register service
    /// </summary>
    public interface IRegisterClient
    {
        /// <summary>
        /// Retrieves contact points for a list of organizations
        /// </summary>
        /// <param name="organizationNumbers">A list of organization numbers to look up contact points for</param>
        /// <returns>A list of <see cref="OrganizationContactPoints"/> for the provided organizations</returns>
        public Task<List<OrganizationContactPoints>> GetOrganizationContactPoints(List<string> organizationNumbers);
    }
}
