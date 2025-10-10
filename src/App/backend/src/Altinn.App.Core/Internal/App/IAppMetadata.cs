using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Interface for fetching app metadata
/// </summary>
public interface IAppMetadata
{
    /// <summary>
    /// Get Application metadata asynchronously
    /// </summary>
    /// <returns><see cref="ApplicationMetadata"/></returns>
    /// <exception cref="ApplicationConfigException"></exception>
    public Task<ApplicationMetadata> GetApplicationMetadata();

    /// <summary>
    /// Returns the application XACML policy for an application.
    /// </summary>
    /// <returns>The application  XACML policy for an application.</returns>
    /// <exception cref="FileNotFoundException"></exception>
    public Task<string> GetApplicationXACMLPolicy();

    /// <summary>
    /// Returns the application BPMN process for an application.
    /// </summary>
    /// <returns>The application BPMN process.</returns>
    /// <exception cref="ApplicationConfigException"></exception>
    public Task<string> GetApplicationBPMNProcess();
}
