using System.Collections.Generic;
using System.Linq;
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

        [HttpGet]
        [Route("designer/api/{org}/resources/repository/{id}")]
        public ActionResult<ServiceResource> GetResourceById(string org, string id)
        {
            if (id.ToLower().Contains("repository:"))
            {
                string[] idSplit = id.Split(':');
                string repo = idSplit[1];
                List<ServiceResource> repositoryResourceList = _repository.GetServiceResources(org, repo);
                return repositoryResourceList != null ? repositoryResourceList.First() : StatusCode(204);
            }
            else if (id.ToLower().Contains("id:"))
            {
                string[] idSplit = id.Split(':');
                string identifier = idSplit[1];
                ServiceResource resource = _repository.GetServiceResourceById(org, identifier);
                return resource != null ? resource : StatusCode(204);
            }
            else
            {
                return StatusCode(404);
            }
        }

        [HttpPut]
        [Route("designer/api/{org}/resources/repository/updateresource/{id}")]
        public ActionResult UpdateResource(string org, string id, [FromBody] ServiceResource resource)
        {
            return _repository.UpdateServiceResource(org, id, resource);
        }

        [HttpPost]
        [Route("designer/api/{org}/resources/repository/addresource")]
        public ActionResult<ServiceResource> AddResource(string org, string repository, [FromBody] ServiceResource resource)
        {
            return _repository.AddServiceResource(org, repository, resource);
        }
    }
}
