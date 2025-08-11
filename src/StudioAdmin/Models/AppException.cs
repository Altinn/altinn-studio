namespace Altinn.Studio.Admin.Models;

public class AppException
{
    public required string AppName { get; set; }
    public required IEnumerable<AppExceptionDataPoint> DataPoints { get; set; }
}
