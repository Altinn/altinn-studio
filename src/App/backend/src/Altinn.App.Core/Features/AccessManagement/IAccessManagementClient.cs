using System.Text.Json;
using Altinn.App.Core.Internal.AccessManagement.Models;

namespace Altinn.App.Core.Features.AccessManagement;

/// <summary>
/// Interface for access management client that handles delegation of rights.
/// This interface is used to delegate and revoke rights for users in the context of an application.
/// </summary>
public interface IAccessManagementClient
{
    /// <summary>
    /// Delegates rights to a user for a set of resources for a specific app instance.
    /// </summary>
    /// <param name="delegation">The delegation request.</param>
    /// <param name="ct">Cancellationtoken.</param>
    /// <returns>DelegationResponse</returns>
    /// <exception cref="HttpRequestException"></exception>
    /// <exception cref="JsonException"></exception>
    public Task<DelegationResponse> DelegateRights(DelegationRequest delegation, CancellationToken ct = default);

    /// <summary>
    /// Revokes rights from a user for a set of resources for a specific app instance.
    /// </summary>
    /// <param name="delegation">The delegation request.</param>
    /// <param name="ct">Cancellationtoken.</param>
    /// <returns>DelegationResponse</returns>
    /// <exception cref="HttpRequestException"></exception>
    /// <exception cref="JsonException"></exception>
    public Task<DelegationResponse> RevokeRights(DelegationRequest delegation, CancellationToken ct = default);
}
