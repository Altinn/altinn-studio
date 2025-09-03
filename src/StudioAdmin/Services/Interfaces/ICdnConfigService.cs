namespace Altinn.Studio.Admin.Services.Interfaces;

/// <summary>
/// Interface for a service that provides configuration information from static files in Altinn CDN.
/// </summary>
public interface ICdnConfigService
{
    /// <summary>
    /// Gets a list of environments the specific organization has access to.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <returns>The task result contains a list of environment names.</returns>
    public Task<List<string>> GetOrgEnvironments(string org);

    /// <summary>
    /// Gets the base URL for the platform in the specified environment.
    /// </summary>
    /// <param name="env">The environment identifier.</param>
    /// <returns>The task result contains the base URL as a string.</returns>
    public Task<string> GetPlatformBaseUrl(string env);

    /// <summary>
    /// Gets the base URL for applications in the specified organization and environment.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="env">The environment identifier.</param>
    /// <returns>The task result contains the base URL as a string.</returns>
    public Task<string> GetAppsBaseUrl(string org, string env);

    /// <summary>
    /// Gets a sorted list of all environment names
    /// </summary>
    /// <returns>The task result contains the list of environment names.</returns>
    public Task<IEnumerable<string>> GetSortedEnvironmentNames();
}
