#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the API controller for functionality related to repositories.
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/orgs")]
    public class OrganizationController : ControllerBase
    {
        private readonly IGitea _giteaClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrganizationController"/> class.
        /// </summary>
        /// <param name="giteaClient">the gitea wrapper</param>
        public OrganizationController(IGitea giteaClient)
        {
            _giteaClient = giteaClient;
        }

        /// <summary>
        /// List of all organizations a user has access to.
        /// </summary>
        /// <returns>A list over all organizations user has access to</returns>
        [HttpGet]
        public async Task<List<Organization>> Organizations()
        {
            List<Organization> orglist = await _giteaClient.GetUserOrganizations();
            return orglist ?? new List<Organization>();
        }
    }
}
