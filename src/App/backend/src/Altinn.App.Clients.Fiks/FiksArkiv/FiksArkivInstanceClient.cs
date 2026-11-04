using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivInstanceClient : IFiksArkivInstanceClient
{
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;
    private readonly ILogger<FiksArkivInstanceClient> _logger;

    private readonly AuthenticationMethod _serviceOwnerAuth = AuthenticationMethod.ServiceOwner();

    public FiksArkivInstanceClient(
        IAuthenticationTokenResolver authenticationTokenResolver,
        ILogger<FiksArkivInstanceClient> logger
    )
    {
        _authenticationTokenResolver = authenticationTokenResolver;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<JwtToken> GetServiceOwnerToken(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _authenticationTokenResolver.GetAccessToken(_serviceOwnerAuth, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Failed to retrieve service owner token for FiksArkivInstanceClient: {Error}",
                e.Message
            );
            throw new FiksArkivException($"Error retrieving service owner token: {e.Message}", e);
        }
    }
}
