#nullable disable
namespace Altinn.Studio.Designer.Models.Dto;

public class UndeployRequest
{
    /// <summary>
    /// Environment name in which the deployment should be undeployed
    /// </summary>
    public string Environment { get; set; }
}
