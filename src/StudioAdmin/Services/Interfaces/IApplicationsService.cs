using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

/// <summary>
/// Interface representing a service that provides information about running applications within an organization.
/// </summary>
public interface IApplicationsService
{
    /// <summary>
    /// Asynchronously retrieves running applications for the specified organization, grouped by environment.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <returns>The task result contains a dictionary of running applications for each environment.</returns>
    public Task<Dictionary<string, List<RunningApplication>>> GetRunningApplications(
        string org,
        CancellationToken ct
    );
}
