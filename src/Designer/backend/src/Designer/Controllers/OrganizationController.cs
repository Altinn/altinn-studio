#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
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
        private readonly IGiteaClient _giteaClientClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrganizationController"/> class.
        /// </summary>
        /// <param name="giteaClientClient">the gitea client</param>
        public OrganizationController(IGiteaClient giteaClientClient)
        {
            _giteaClientClient = giteaClientClient;
        }

        /// <summary>
        /// List of all organizations a user has access to.
        /// </summary>
        /// <returns>A list over all organizations user has access to</returns>
        [HttpGet]
        public async Task<List<Organization>> Organizations()
        {
            List<Organization> orglist = await _giteaClientClient.GetUserOrganizations();
            return orglist ?? new List<Organization>();
        }
    }
}
