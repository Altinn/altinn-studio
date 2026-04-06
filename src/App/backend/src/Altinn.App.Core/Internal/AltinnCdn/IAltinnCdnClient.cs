namespace Altinn.App.Core.Internal.AltinnCdn;

internal interface IAltinnCdnClient
{
    Task<AltinnCdnOrgDetails?> GetOrgDetails(CancellationToken cancellationToken = default);

    Task<AltinnCdnOrgName?> GetOrgNameByAppId(string appId, CancellationToken cancellationToken = default);
}
