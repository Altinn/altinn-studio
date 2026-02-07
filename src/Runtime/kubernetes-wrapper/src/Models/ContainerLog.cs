namespace Altinn.Studio.KubernetesWrapper.Models;

public class ContainerLog
{
    public DateTime TimeGenerated { get; set; }
    public string LogMessage { get; set; }
}
