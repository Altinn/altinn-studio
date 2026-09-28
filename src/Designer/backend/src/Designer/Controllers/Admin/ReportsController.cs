using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.ContactPoints;
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
        await reportService.SendReportAsync(org, env, frequency, cancellationToken);
        return Ok();
    }
}
