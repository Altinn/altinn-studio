using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
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

            foreach (RepositoryModel repo in repositories)
            {
                if (repo.FullName.ToLower().Contains("resources"))
                {
                    return repo;
                }
            }

            return StatusCode(204);
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/repository/resourcelist")]
        public async Task<ActionResult<List<ContentsResponse>>> GetRepositoryResourceList(string org)
        {
            List<ContentsResponse> resourceList = new List<ContentsResponse>();
            List<ContentsResponse> results = await _giteaApi.GetRepositoryContent(org, string.Format("{0}-resources", org));

            foreach (ContentsResponse result in results)
            {
                if (result.name.ToLower().Contains("resource.json"))
                {
                    resourceList.Add(result);
                }
            }

            if (resourceList.Count > 0)
            {
                return resourceList;
            }
            else
            {
                return StatusCode(204);
            }
        }
    }
}
