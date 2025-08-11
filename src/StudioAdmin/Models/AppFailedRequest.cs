
namespace Altinn.Studio.Admin.Models;

public class AppFailedRequest
{
    public required string AppName { get; set; }
    public required IEnumerable<AppFailedRequestDataPoint> DataPoints { get; set; }
}
