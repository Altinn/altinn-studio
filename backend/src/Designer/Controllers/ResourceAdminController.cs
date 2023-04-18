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
        private readonly IRepository _repository;

        public ResourceAdminController(IGitea gitea, IRepository repository)
        {
            _giteaApi = gitea;
            _repository = repository;
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
        public ActionResult<List<ServiceResource>> GetRepositoryResourceList(string org)
        {
            List<ServiceResource> repositoryResourceList = _repository.GetServiceResources(org, string.Format("{0}-resources", org));
            return repositoryResourceList != null && repositoryResourceList.Count > 0 ? repositoryResourceList : StatusCode(204);
        }
    }
}
