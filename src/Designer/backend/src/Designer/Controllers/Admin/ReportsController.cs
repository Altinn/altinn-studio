using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Reports;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.Studio.Designer.Controllers.Admin;

[ApiController]
[Authorize]
[Route("designer/api/v1/admin/reports/{org}/{env}")]
public class ReportsController(IReportService reportService, IMemoryCache memoryCache) : ControllerBase
{
    [HttpPost("send")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<IActionResult> SendReport(
        string org,
        string env,
        [FromQuery] ReportFrequency frequency = ReportFrequency.Daily,
        CancellationToken cancellationToken = default
    )
    {
        await reportService.GenerateReportPdfAsync(org, env, frequency, cancellationToken);
        return Ok();
    }

    [HttpGet("data")]
    [AllowAnonymous]
    public IActionResult GetReportData([FromQuery] string token)
    {
        var cacheKey = $"reportData:{token}";
        if (!memoryCache.TryGetValue(cacheKey, out ReportData? reportData) || reportData is null)
        {
            return NotFound();
        }

        return Ok(reportData);
    }
}
