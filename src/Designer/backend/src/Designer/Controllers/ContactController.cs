#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    [Route("designer/api/[controller]")]
    [ApiController]
    public class ContactController : ControllerBase
    {
        private readonly IGiteaClient _giteaClient;

        public ContactController(IGiteaClient giteaClient)
        {
            _giteaClient = giteaClient;
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
                var organizations = await _giteaClient.GetUserOrganizations();
                return Ok(new BelongsToOrgDto { BelongsToOrg = organizations.Count > 0 });
            }
            catch (Exception)
            {
                return Ok(new BelongsToOrgDto { BelongsToOrg = false });
            }
        }
    }
}
