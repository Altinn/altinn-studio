using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Admin;

[ApiController]
[Authorize(Policy = AltinnPolicy.MustBeOrgOwner)]
[Route("designer/api/v1/admin/[controller]/{org}")]
public class AuditLogsController : ControllerBase
{
    private readonly IAdminAuditLogRepository _repository;

    public AuditLogsController(IAdminAuditLogRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminAuditLogEntry>>> GetForOrg(string org, CancellationToken ct)
    {
        var entries = await _repository.GetForOrgAsync(org, ct);
        return Ok(entries);
    }
}
