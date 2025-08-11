namespace KubernetesWrapper.Models;

public class ContainerLog
{
    public DateTimeOffset TimeGenerated { get; set; }
    public string LogMessage { get; set; }
}
