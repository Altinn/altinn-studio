using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Reports;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Admin;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/v1/admin/reports/{org}/{env}")]
public class ReportsController(IReportService reportService) : ControllerBase
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
    public async Task<IActionResult> GetReportData(
        string org,
        string env,
        [FromQuery] string token,
        CancellationToken cancellationToken
    )
    {
        ReportData? reportData = await reportService.GetReportDataAsync(org, env, token, cancellationToken);
        return reportData is null ? NotFound() : Ok(reportData);
    }
}
