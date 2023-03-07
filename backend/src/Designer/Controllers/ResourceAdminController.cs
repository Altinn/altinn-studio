using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepositoryModel = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Altinn.Studio.Designer.Controllers
{
    [Authorize]
    [AutoValidateAntiforgeryToken]
    public class ResourceAdminController : ControllerBase
    {
        private readonly IGitea _giteaApi;

        public ResourceAdminController(IGitea gitea)
        {
            _giteaApi = gitea;
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/repository")]
        public async Task<ActionResult<RepositoryModel>> GetRepository(string org)
        {
            IList<RepositoryModel> repositories = await _giteaApi.GetOrgRepos(org);
            foreach (var repo in from RepositoryModel repo in repositories
                                 where repo.FullName.ToLower().Contains("resources")
                                 select repo)
            {
                return repo;
            }

            return StatusCode(404);
        }
    }
}
