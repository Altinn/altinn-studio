using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Finds what runs of an app in each of the org's environments.
/// </summary>
public interface IRunningDeploymentsService
{
    /// <summary>
    /// Gets the deployments of an app that run in the org's environments
    /// </summary>
    /// <param name="org">Organization</param>
    /// <param name="app">Application name</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>One deployment for each environment the app runs in</returns>
    Task<List<RunningDeployment>> GetAsync(string org, string app, CancellationToken ct);
}
