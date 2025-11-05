#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
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
            bool isNotAuthenticated = !AuthenticationHelper.IsAuthenticated(HttpContext);
            if (isNotAuthenticated)
            {
                return Ok(new BelongsToOrgDto { BelongsToOrg = false });
            }

            try
            {
                var organizations = await _giteaService.GetUserOrganizations();
                return Ok(new BelongsToOrgDto { BelongsToOrg = organizations.Count > 0 });
            }
            catch (Exception)
            {
                return Ok(new BelongsToOrgDto { BelongsToOrg = false });
            }
        }
    }
}
