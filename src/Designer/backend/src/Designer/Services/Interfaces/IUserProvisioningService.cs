using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Creates user accounts in the backing git server via reverse-proxy auto-registration.
/// WARNING: Calling EnsureUserExistsAsync will create a real user in the git server.
/// This should only be called from the OIDC login flow and the bot account creation flow.
/// Do not use this service for general user lookups or validation.
/// </summary>
public interface IUserProvisioningService
{
    Task EnsureUserExistsAsync(string username, string? fullName = null, CancellationToken cancellationToken = default);
}
