namespace Altinn.App.Core.Internal.AltinnCdn;

internal interface IAltinnCdnClient : IDisposable
{
    Task<AltinnCdnOrgs> GetOrgs(CancellationToken cancellationToken = default);
}
