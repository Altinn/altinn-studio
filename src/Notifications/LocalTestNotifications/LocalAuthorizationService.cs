using Altinn.Notifications.Core.Integrations;
using Altinn.Notifications.Core.Models.ContactPoints;

namespace LocalTest.Notifications.LocalTestNotifications
{
    public class LocalAuthorizationService : IAuthorizationService
    {
        public Task<List<OrganizationContactPoints>> AuthorizeUserContactPointsForResource(List<OrganizationContactPoints> organizationContactPoints, string resourceId)
        {
            return Task.FromResult(organizationContactPoints);
        }
    }
}
