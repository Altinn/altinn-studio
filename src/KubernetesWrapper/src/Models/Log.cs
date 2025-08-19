namespace KubernetesWrapper.Models;

public class Log
{
    public string AppName { get; set; }
    public IEnumerable<LogDataPoint> DataPoints { get; set; }
}
