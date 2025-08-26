namespace Altinn.Studio.Admin.Models;

public class Log
{
    public required string AppName { get; set; }
    public required IEnumerable<LogDataPoint> DataPoints { get; set; }
}
