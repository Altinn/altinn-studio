namespace Altinn.App.Core.Internal.AltinnCdn;

internal interface IAltinnCdnClient
{
    Task<AltinnCdnOrgDetails?> GetOrgDetails(CancellationToken cancellationToken = default);
}
