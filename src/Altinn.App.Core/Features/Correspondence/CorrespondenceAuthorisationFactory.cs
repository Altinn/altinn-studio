using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Correspondence;

internal sealed class CorrespondenceAuthorisationFactory
{
    private IMaskinportenClient? _maskinportenClient;
    private readonly IServiceProvider _serviceProvider;

    public Func<string, Task<JwtToken>> Maskinporten =>
        async (scope) =>
        {
            _maskinportenClient ??= _serviceProvider.GetRequiredService<IMaskinportenClient>();
            return await _maskinportenClient.GetAltinnExchangedToken([CorrespondenceApiScopes.ServiceOwner, scope]);
        };

    public CorrespondenceAuthorisationFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<JwtToken> Resolve(CorrespondencePayloadBase payload)
    {
        if (payload.AccessTokenFactory is null && payload.AuthorisationMethod is null)
        {
            throw new CorrespondenceArgumentException(
                "Neither AccessTokenFactory nor AuthorisationMethod was provided in the CorrespondencePayload object"
            );
        }

        if (payload.AccessTokenFactory is not null)
        {
            return await payload.AccessTokenFactory();
        }

        return payload.AuthorisationMethod switch
        {
            CorrespondenceAuthorisation.Maskinporten => await Maskinporten(payload.RequiredScope),
            _ => throw new CorrespondenceArgumentException(
                $"Unknown CorrespondenceAuthorisation `{payload.AuthorisationMethod}`"
            ),
        };
    }
}
