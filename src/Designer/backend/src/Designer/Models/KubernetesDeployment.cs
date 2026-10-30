#nullable disable
namespace Altinn.Studio.Designer.Models;

public class KubernetesDeployment
{
    public string Release { get; set; }

    public string Version { get; set; }

    public string EnvName { get; set; }
}
