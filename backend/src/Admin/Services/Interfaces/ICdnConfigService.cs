namespace Altinn.Studio.Admin.Services.Interfaces;

public interface ICdnConfigService
{
    public Task<List<string>> GetOrgEnvironments(string org);

    public Task<string> GetPlatformBaseUrl(string env);

    public Task<string> GetAppsBaseUrl(string org, string env);
}
