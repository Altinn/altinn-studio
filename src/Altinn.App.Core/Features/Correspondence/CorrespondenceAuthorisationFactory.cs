using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Correspondence;

internal sealed class CorrespondenceAuthorisationFactory
{
    private IMaskinportenClient? _maskinportenClient;
    private readonly IServiceProvider _serviceProvider;

    public Func<Task<JwtToken>> Maskinporten =>
        async () =>
        {
            _maskinportenClient ??= _serviceProvider.GetRequiredService<IMaskinportenClient>();

            return await _maskinportenClient.GetAltinnExchangedToken(
                ["altinn:correspondence.write", "altinn:serviceowner/instances.read"]
            );
        };

    public CorrespondenceAuthorisationFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
}
