using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[Route("designer/api/[controller]")]
[ApiController]
public class ContactController : ControllerBase
{
    private readonly IGitea _giteaService;

    public ContactController(IGitea giteaService)
    {
        _giteaService = giteaService;
    }

    [AllowAnonymous]
    [HttpGet("belongs-to-org")]
    public async Task<IActionResult> BelongsToOrg()
    {
        bool isNotAuthenticated = string.IsNullOrEmpty(AuthenticationHelper.GetDeveloperUserName(HttpContext));
        if (isNotAuthenticated)
        {
            return Ok(new { belongsToOrg = false });
        }

        try
        {
            var organizations = await _giteaService.GetUserOrganizations();
            return Ok(new { belongsToOrg = organizations.Count > 0 });
        }
        catch
        {
            return Ok(new { belongsToOrg = false });
        }
    }
}
