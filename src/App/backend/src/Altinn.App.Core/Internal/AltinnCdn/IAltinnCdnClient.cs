namespace Altinn.App.Core.Internal.AltinnCdn;

internal interface IAltinnCdnClient : IDisposable
{
    Task<AltinnCdnOrgDetails?> GetOrgDetails(CancellationToken cancellationToken = default);
}
