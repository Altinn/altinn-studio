namespace KubernetesWrapper.Models;

public class AppException
{
    public string AppName { get; set; }
    public IEnumerable<AppExceptionDataPoint> DataPoints { get; set; }
}
