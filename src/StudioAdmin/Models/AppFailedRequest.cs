
namespace Altinn.Studio.Admin.Models;

public class AppFailedRequest
{
    public DateTime TimeGenerated { get; set; }
    public string Url { get; set; }
    public string ResultCode { get; set; }
}
