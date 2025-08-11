namespace KubernetesWrapper.Models;

public class AppFailedRequest
{
    public string AppName { get; set; }
    public IEnumerable<AppFailedRequestDataPoint> DataPoints { get; set; }
}
