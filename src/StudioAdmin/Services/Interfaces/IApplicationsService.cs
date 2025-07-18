using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

/// <summary>
/// Interface representing a service that provides information about running applications within an organization.
/// </summary>
public interface IApplicationsService
{
    /// <summary>
    /// Asynchronously retrieves a list of running applications for the specified organization.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <returns>The task result contains a list of running applications.</returns>
    public Task<List<RunningApplication>> GetRunningApplications(string org, CancellationToken ct);
}
