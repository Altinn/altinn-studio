namespace KubernetesWrapper.Models;

public class AppFailedRequestDataPoint
{
    public DateTimeOffset DateTimeOffset { get; set; }
    public int Count { get; set; }
}
