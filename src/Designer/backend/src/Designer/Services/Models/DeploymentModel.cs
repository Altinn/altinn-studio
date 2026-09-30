#nullable disable
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Models;

/// <summary>
/// Domain model for Deployment
/// </summary>
public class DeploymentModel
{
    /// <summary>
    /// TagName
    /// </summary>
    public string TagName { get; set; }

    /// <summary>
    /// Environment Name
    /// </summary>
    public string EnvName { get; set; }

    /// <summary>
    /// Requested app status. When null, the default for the environment is used.
    /// </summary>
    public AppStatus? AppStatus { get; set; }
}
