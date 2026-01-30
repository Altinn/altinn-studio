using Altinn.Authorization.Models;
namespace Altinn.Platform.Authorization.Services.Interface;

/// <summary>
/// The service used to map internal delegation change to delegation change events and push them to the event queue.
/// </summary>
public interface IAccessManagementWrapper
{
    /// <summary>
    /// Endpoint to find all delegation changes for a given user, reportee and app/resource context
    /// </summary>
    /// <returns>Input parameter to the request</returns>
    //public Task<IEnumerable<DelegationChangeExternal>> GetAllDelegationChanges(DelegationChangeInput input, CancellationToken cancellationToken = default);

    /// <summary>
    /// Endpoint to find all delegation changes for a given user, reportee and app/resource context
    /// </summary>
    /// <returns>optional funvation pattern for modifying the request sent to Access Management API</returns>
    //public Task<IEnumerable<DelegationChangeExternal>> GetAllDelegationChanges(CancellationToken cancellationToken = default, params Action<DelegationChangeInput>[] actions);

    /// <summary>
    /// Endpoint to get the list of all authorized parties for the authenticated user
    /// </summary>
    /// <returns>Enumerable of all the parties the user have access to</returns>
    //public Task<IEnumerable<AuthorizedPartyDto>> GetAuthorizedParties(CancellationToken cancellationToken = default);

    /// <summary>
    /// Endpoint to get the a specific authorized party for the authenticated user, if the user has access
    /// </summary>
    /// <returns>The party, if the user have access</returns>
    //public Task<AuthorizedPartyDto> GetAuthorizedParty(int partyId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Endpoint to find all access packages a given to-party has for a given from-party
    /// </summary>
    /// <returns>List of all access package urns if any</returns>
    public Task<IEnumerable<AccessPackageUrn>> GetAccessPackages(Guid to, Guid from, CancellationToken cancellationToken = default);
}
