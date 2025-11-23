using KS.Fiks.Maskinporten.Client;
using FiksMaskinportenToken = Ks.Fiks.Maskinporten.Client.MaskinportenToken;
using IAltinnMaskinportenClient = Altinn.App.Core.Features.Maskinporten.IMaskinportenClient;
using IFiksMaskinportenClient = Ks.Fiks.Maskinporten.Client.IMaskinportenClient;

namespace Altinn.App.Clients.Fiks.FiksIO;

internal sealed class FiksIOMaskinportenClient : IFiksMaskinportenClient
{
    private readonly IAltinnMaskinportenClient _altinnMaskinportenClient;
    private readonly TimeProvider _timeProvider;

    public FiksIOMaskinportenClient(
        IAltinnMaskinportenClient altinnMaskinportenClient,
        TimeProvider? timeProvider = null
    )
    {
        _altinnMaskinportenClient = altinnMaskinportenClient;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public async Task<FiksMaskinportenToken> GetAccessToken(IEnumerable<string> scopes)
    {
        var token = await _altinnMaskinportenClient.GetAccessToken(scopes);
        var expiresIn = token.ExpiresAt - _timeProvider.GetUtcNow();

        return new TokenWrapper(token.Value, (int)expiresIn.TotalSeconds);
    }

    public Task<FiksMaskinportenToken> GetAccessToken(TokenRequest tokenRequest) =>
        GetAccessToken([tokenRequest.Scopes]);

    public Task<FiksMaskinportenToken> GetAccessToken(string scopes) => GetAccessToken([scopes]);

    public Task<FiksMaskinportenToken> GetDelegatedAccessToken(string consumerOrg, IEnumerable<string> scopes) =>
        throw new NotSupportedException();

    public Task<FiksMaskinportenToken> GetDelegatedAccessToken(string consumerOrg, string scopes) =>
        throw new NotSupportedException();

    public Task<FiksMaskinportenToken> GetDelegatedAccessTokenForAudience(
        string consumerOrg,
        string audience,
        IEnumerable<string> scopes
    ) => throw new NotSupportedException();

    public Task<FiksMaskinportenToken> GetDelegatedAccessTokenForAudience(
        string consumerOrg,
        string audience,
        string scopes
    ) => throw new NotSupportedException();

    public Task<FiksMaskinportenToken> GetOnBehalfOfAccessToken(string consumerOrg, IEnumerable<string> scopes) =>
        throw new NotSupportedException();

    public Task<FiksMaskinportenToken> GetOnBehalfOfAccessToken(string consumerOrg, string scopes) =>
        throw new NotSupportedException();

    internal sealed class TokenWrapper : FiksMaskinportenToken
    {
        internal int ExpiresIn { get; }

        internal TokenWrapper(string token, int expiresIn)
            : base(token, expiresIn)
        {
            ExpiresIn = expiresIn;
        }
    }
}
