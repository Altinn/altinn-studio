using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepositoryModel = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Altinn.Studio.Designer.Controllers
{
    [Authorize]
    //[AutoValidateAntiforgeryToken]
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
        public async Task<ActionResult<List<ListviewServiceResource>>> GetRepositoryResourceList(string org)
        {
            string repository = string.Format("{0}-resources", org);
            List<ServiceResource> repositoryResourceList = _repository.GetServiceResources(org, repository);
            List<ListviewServiceResource> listviewServiceResources = new List<ListviewServiceResource>();

            foreach (ServiceResource resource in repositoryResourceList)
            {
                ListviewServiceResource listviewResource = await _giteaApi.MapServiceResourceToListViewResource(org, string.Format("{0}-resources", org), resource);
                listviewResource.HasPolicy = _repository.ResourceHasPolicy(org, repository, resource);
                listviewResource = _repository.AddLastChangedAndCreatedByIfMissingFromGitea(listviewResource);
                listviewServiceResources.Add(listviewResource);
            }

            return listviewServiceResources != null && listviewServiceResources.Count > 0 ? listviewServiceResources : StatusCode(204);
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/repository/{repository}")]
        [Route("designer/api/{org}/resources/repository/{repository}/{id}")]
        public ActionResult<ServiceResource> GetResourceById(string org, string repository, string id = "")
        {
            if (id != "")
            {
                ServiceResource resource = _repository.GetServiceResourceById(org, repository, id);
                return resource != null ? resource : StatusCode(204);
            }
            else
            {
                List<ServiceResource> repositoryResourceList = _repository.GetServiceResources(org, repository);
                return repositoryResourceList != null ? repositoryResourceList.First() : StatusCode(204);
            }
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/repository/validate/{repository}")]
        [Route("designer/api/{org}/resources/repository/validate/{repository}/{id}")]
        public ActionResult GetValidateResource(string org, string repository, string id = "")
        {
            ValidationProblemDetails validationProblemDetails = new ValidationProblemDetails();
            ServiceResource resourceToValidate;

            if (id != "")
            {
                resourceToValidate = _repository.GetServiceResourceById(org, repository, id);
                if (resourceToValidate != null)
                {
                    validationProblemDetails = ValidateResource(resourceToValidate);
                }
            }
            else
            {
                List<ServiceResource> repositoryResourceList = _repository.GetServiceResources(org, repository);
                resourceToValidate = repositoryResourceList.FirstOrDefault();
                if (repositoryResourceList.Count > 0)
                {
                    validationProblemDetails = ValidateResource(resourceToValidate);
                }
            }

            if (resourceToValidate != null)
            {
                if (validationProblemDetails.Errors.Count == 0)
                {
                    validationProblemDetails.Status = 200;
                    validationProblemDetails.Title = "No validation errors occurred.";
                }

                return Ok(validationProblemDetails);
            }
            else
            {
                return StatusCode(400);
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
        public ActionResult<ServiceResource> AddResource(string org, [FromBody] ServiceResource resource)
        {
            return _repository.AddServiceResource(org, resource);
        }

        private ValidationProblemDetails ValidateResource(ServiceResource resource, bool strictMode = false)
        {
            if (!ResourceAdminHelper.ValidDictionaryAttribute(resource.Title))
            {
                ModelState.AddModelError($"{resource.Identifier}.title", "resourceerror.missingtitle");
            }

            if (!ResourceAdminHelper.ValidDictionaryAttribute(resource.Description))
            {
                ModelState.AddModelError($"{resource.Identifier}.description", "resourceerror.missingdescription");
            }

            if (resource.ResourceType == null)
            {
                ModelState.AddModelError($"{resource.Identifier}.resourcetype", "resourceerror.missingresourcetype");
            }

            if (resource.IsComplete == null || resource.IsComplete == false)
            {
                ModelState.AddModelError($"{resource.Identifier}.iscomplete", "resourceerror.missingiscomplete");
            }

            if (strictMode && (resource.ThematicArea == null || string.IsNullOrEmpty(resource.ThematicArea)))
            {
                ModelState.AddModelError($"{resource.Identifier}.thematicarea", "resourceerror.missingthematicarea");
            }

            ValidationProblemDetails details = ProblemDetailsFactory.CreateValidationProblemDetails(HttpContext, ModelState);

            return details;
        }
    }
}
