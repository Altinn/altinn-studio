namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Interface reporting features needed by frontend and their status to support multiple versions of the backend
/// </summary>
public interface IFrontendFeatures
{
    /// <summary>
    /// Fetch frontend features that are supported by this backend
    /// </summary>
    /// <returns>List of frontend features enabled/disabled for this backend</returns>
    public Task<Dictionary<string, bool>> GetFrontendFeatures();
}
