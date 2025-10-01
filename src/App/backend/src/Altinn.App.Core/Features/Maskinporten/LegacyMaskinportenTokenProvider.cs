using Altinn.App.Core.Internal.Maskinporten;

namespace Altinn.App.Core.Features.Maskinporten;

#pragma warning disable CS0618 // Type or member is obsolete

/// <summary>
/// Legacy token provider for <see cref="Altinn.App.Core.EFormidling.Implementation.EformidlingStatusCheckEventHandler2"/>
/// and others that rely on a <see cref="IMaskinportenTokenProvider"/> implementation.
/// </summary>
internal sealed class LegacyMaskinportenTokenProvider : IMaskinportenTokenProvider
{
    private readonly IMaskinportenClient _maskinportenClient;

    public LegacyMaskinportenTokenProvider(IMaskinportenClient maskinportenClient)
    {
        _maskinportenClient = maskinportenClient;
    }

    public async Task<string> GetToken(string scopes)
    {
        return await _maskinportenClient.GetAccessToken([scopes]);
    }

    public async Task<string> GetAltinnExchangedToken(string scopes)
    {
        return await _maskinportenClient.GetAltinnExchangedToken([scopes]);
    }
}
