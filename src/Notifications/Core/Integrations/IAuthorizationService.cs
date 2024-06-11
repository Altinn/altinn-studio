using Altinn.Notifications.Core.Models.ContactPoints;

namespace Altinn.Notifications.Core.Integrations;

/// <summary>
/// Describes the necessary functions of an authorization service that can perform
/// notification recipient filtering based on authorization
/// </summary>
public interface IAuthorizationService
{
    /// <summary>
    /// Describes a method that can create an authorization request to authorize a set of
    /// users for access to a resource.
    /// </summary>
    /// <param name="organizationContactPoints">
    /// The contact points of an organization including user registered contact points.
    /// </param>
    /// <param name="resourceId">The id of the resource.</param>
    /// <returns>A new list of <see cref="OrganizationContactPoints"/> with filtered list of recipients.</returns>
    Task<List<OrganizationContactPoints>> AuthorizeUserContactPointsForResource(
        List<OrganizationContactPoints> organizationContactPoints, string resourceId);
}
