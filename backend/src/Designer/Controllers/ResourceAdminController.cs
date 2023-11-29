using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.ApiClients.Maskinporten.Extensions;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.ResourceRegistry.Core.Enums.Altinn2;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.ResourceRegistry.Core.Models.Altinn2;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata;
using Altinn.Studio.Designer.TypedHttpClients.ResourceRegistryOptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using RepositoryModel = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Altinn.Studio.Designer.Controllers
{
    [Authorize]
    //[AutoValidateAntiforgeryToken]
    public class ResourceAdminController : ControllerBase
    {
        private readonly IGitea _giteaApi;
        private readonly IRepository _repository;
        private readonly IResourceRegistryOptions _resourceRegistryOptions;
        private readonly IMemoryCache _memoryCache;
        private readonly CacheSettings _cacheSettings;
        private readonly IAltinn2MetadataClient _altinn2MetadataClient;
        private readonly IOrgService _orgService;
        private readonly IResourceRegistry _resourceRegistry;
        private readonly ResourceRegistryIntegrationSettings _resourceRegistrySettings;

        public ResourceAdminController(IGitea gitea, IRepository repository, IResourceRegistryOptions resourceRegistryOptions, IMemoryCache memoryCache, IOptions<CacheSettings> cacheSettings, IAltinn2MetadataClient altinn2MetadataClient, IOrgService orgService, IOptions<ResourceRegistryIntegrationSettings> resourceRegistryEnvironment, IResourceRegistry resourceRegistry)
        {
            _giteaApi = gitea;
            _repository = repository;
            _resourceRegistryOptions = resourceRegistryOptions;
            _memoryCache = memoryCache;
            _cacheSettings = cacheSettings.Value;
            _altinn2MetadataClient = altinn2MetadataClient;
            _orgService = orgService;
            _resourceRegistrySettings = resourceRegistryEnvironment.Value;
            _resourceRegistry = resourceRegistry;
        }

        [HttpGet]
        [Route("designer/api/{org}/resources")]
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
        [Route("designer/api/{org}/resources/resourcelist")]
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

            return listviewServiceResources;
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/{repository}")]
        [Route("designer/api/{org}/resources/{repository}/{id}")]
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
        [Route("designer/api/{org}/resources/publishstatus/{repository}/{id}")]
        public async Task<ActionResult<ServiceResourceStatus>> GetPublishStatusById(string org, string repository, string id = "")
        {
            ServiceResourceStatus resourceStatus = new ServiceResourceStatus();
            ServiceResource resource = _repository.GetServiceResourceById(org, repository, id);
            if (resource == null)
            {
                return StatusCode(204);
            }

            resourceStatus.ResourceVersion = resource.Version;

            // Todo. Temp test values until we have integration with resource registry in place
            resourceStatus.PublishedVersions = new List<ResourceVersionInfo>();

            foreach (string envir in _resourceRegistrySettings.Keys)
            {
                resourceStatus = await AddEnvironmentResourceStatus(envir, id, resourceStatus);
            }

            return resourceStatus;
        }

        [Route("designer/api/{org}/resources/validate/{repository}")]
        [Route("designer/api/{org}/resources/validate/{repository}/{id}")]
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
        [Route("designer/api/{org}/resources/updateresource/{id}")]
        public async Task<ActionResult> UpdateResource(string org, string id, [FromBody] ServiceResource resource)
        {
            resource.HasCompetentAuthority = await GetCompetentAuthorityFromOrg(org);
            return _repository.UpdateServiceResource(org, id, resource);
        }

        [HttpPost]
        [Route("designer/api/{org}/resources/addresource")]
        public async Task<ActionResult<ServiceResource>> AddResource(string org, [FromBody] ServiceResource resource)
        {
            resource.HasCompetentAuthority = await GetCompetentAuthorityFromOrg(org);
            return _repository.AddServiceResource(org, resource);
        }

        [HttpPost]
        [Route("designer/api/{org}/resources/importresource/{serviceCode}/{serviceEdition}/{environment}")]
        public async Task<ActionResult> ImportResource(string org, string serviceCode, int serviceEdition, string environment)
        {
            string repository = string.Format("{0}-resources", org);
            ServiceResource resource = await _altinn2MetadataClient.GetServiceResourceFromService(serviceCode, serviceEdition, environment);
            _repository.AddServiceResource(org, resource);
            XacmlPolicy policy = await _altinn2MetadataClient.GetXacmlPolicy(serviceCode, serviceEdition, resource.Identifier, environment);
            await _repository.SavePolicy(org, repository, resource.Identifier, policy);
            return Ok(resource);
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/sectors")]
        public async Task<ActionResult<List<DataTheme>>> GetSectors(CancellationToken cancellationToken)
        {
            string cacheKey = "sectors";
            if (!_memoryCache.TryGetValue(cacheKey, out List<DataTheme> sectors))
            {
                DataThemesContainer dataThemesContainer = await _resourceRegistryOptions.GetSectors(cancellationToken);

                var cacheEntryOptions = new MemoryCacheEntryOptions()
               .SetPriority(CacheItemPriority.High)
               .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));

                sectors = dataThemesContainer.DataThemes;

                _memoryCache.Set(cacheKey, sectors, cacheEntryOptions);
            }

            return sectors;
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/losterms")]
        public async Task<ActionResult<List<LosTerm>>> GetGetLosTerms(CancellationToken cancellationToken)
        {
            string cacheKey = "losterms";
            if (!_memoryCache.TryGetValue(cacheKey, out List<LosTerm> sectors))
            {
                LosTerms losTerms = await _resourceRegistryOptions.GetLosTerms(cancellationToken);

                var cacheEntryOptions = new MemoryCacheEntryOptions()
               .SetPriority(CacheItemPriority.High)
               .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));

                sectors = losTerms.LosNodes;

                _memoryCache.Set(cacheKey, sectors, cacheEntryOptions);
            }

            return sectors;
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/eurovoc")]
        public async Task<ActionResult<List<EuroVocTerm>>> GetEuroVoc(CancellationToken cancellationToken)
        {
            string cacheKey = "eurovocs";
            if (!_memoryCache.TryGetValue(cacheKey, out List<EuroVocTerm> sectors))
            {

                EuroVocTerms euroVocTerms = await _resourceRegistryOptions.GetEuroVocTerms(cancellationToken);

                var cacheEntryOptions = new MemoryCacheEntryOptions()
               .SetPriority(CacheItemPriority.High)
               .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));

                sectors = euroVocTerms.EuroVocs;
                _memoryCache.Set(cacheKey, sectors, cacheEntryOptions);
            }

            return sectors;
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/altinn2linkservices/{environment}")]
        public async Task<ActionResult<List<AvailableService>>> GetAltinn2LinkServices(string org, string environment)
        {
            string cacheKey = "availablelinkservices:" + org + environment;
            if (!_memoryCache.TryGetValue(cacheKey, out List<AvailableService> linkServices))
            {

                List<AvailableService> unfiltered = await _altinn2MetadataClient.AvailableServices(1044, environment);

                var cacheEntryOptions = new MemoryCacheEntryOptions()
               .SetPriority(CacheItemPriority.High)
               .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));

                if (OrgUtil.IsTestEnv(org))
                {
                    linkServices = unfiltered.Where(a => a.ServiceType.Equals(ServiceType.Link) && (a.ServiceOwnerCode.ToLower().Equals(org.ToLower()) || a.ServiceOwnerCode.ToLower().Equals("acn"))).ToList();
                }
                else
                {
                    linkServices = unfiltered.Where(a => a.ServiceType.Equals(ServiceType.Link) && a.ServiceOwnerCode.ToLower().Equals(org.ToLower())).ToList();
                }

                _memoryCache.Set(cacheKey, linkServices, cacheEntryOptions);
            }

            return linkServices;
        }

        private ValidationProblemDetails ValidateResource(ServiceResource resource)
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

            if (resource.Delegable.HasValue && resource.Delegable.Value && !ResourceAdminHelper.ValidDictionaryAttribute(resource.RightDescription))
            {
                ModelState.AddModelError($"{resource.Identifier}.rightDescription", "resourceerror.missingrightdescription");
            }

            if (resource.AvailableForType == null || resource.AvailableForType.Count == 0)
            {
                ModelState.AddModelError($"{resource.Identifier}.availableForType", "resourceerror.missingavailablefortype");
            }

            if (resource.Status == null)
            {
                ModelState.AddModelError($"{resource.Identifier}.status", "resourceerror.missingstatus");
            }

            if (resource.ContactPoints == null || resource.ContactPoints.Count == 0)
            {
                ModelState.AddModelError($"{resource.Identifier}.contactPoint", "resourceerror.missingcontactpoints");
            }
            else
            {
                for (int i = 0; i < resource.ContactPoints.Count; i++)
                {
                    var categoryError = string.IsNullOrWhiteSpace(resource.ContactPoints[i].Category);
                    var emailError = string.IsNullOrWhiteSpace(resource.ContactPoints[i].Email);
                    var telephoneError = string.IsNullOrWhiteSpace(resource.ContactPoints[i].Telephone);
                    var contactPageError = string.IsNullOrWhiteSpace(resource.ContactPoints[i].ContactPage);

                    if (categoryError && emailError && telephoneError && contactPageError)
                    {
                        ModelState.AddModelError($"{resource.Identifier}.contactPoints[{i}]", "resourceerror.missingcontactpoints.");
                    }
                }
            }

            ValidationProblemDetails details = ProblemDetailsFactory.CreateValidationProblemDetails(HttpContext, ModelState);

            return details;
        }

        [HttpPost]
        [Route("designer/api/{org}/resources/publish/{repository}/{id}")]
        public async Task<ActionResult> PublishResource(string org, string repository, string id, string env)
        {
            if (repository == $"{org}-resources")
            {
                string xacmlPolicyPath = _repository.GetPolicyPath(org, repository, id);
                return await _repository.PublishResource(org, repository, id, env, xacmlPolicyPath);
            }
            else
            {
                Console.WriteLine("Invalid repository for resource");
                return new StatusCodeResult(400);
            }
        }

        private async Task<CompetentAuthority> GetCompetentAuthorityFromOrg(string org)
        {
            Org organization = await GetOrg(org);
            if (organization == null)
            {
                return null;
            }
            return new CompetentAuthority() { Name = organization.Name, Organization = organization.Orgnr, Orgcode = org };
        }

        private async Task<Org> GetOrg(string org)
        {
            OrgList orgList = await GetOrgList();

            if (orgList.Orgs.TryGetValue(org, out Org organization))
            {
                return organization;
            }

            return null;
        }

        private async Task<OrgList> GetOrgList()
        {
            string cacheKey = "orglist";
            if (!_memoryCache.TryGetValue(cacheKey, out OrgList orgList))
            {
                orgList = await _orgService.GetOrgList();

                var cacheEntryOptions = new MemoryCacheEntryOptions()
               .SetPriority(CacheItemPriority.High)
               .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.OrgListCacheTimeout, 0));

                _memoryCache.Set(cacheKey, orgList, cacheEntryOptions);
            }

            return orgList;
        }

        private async Task<ServiceResourceStatus> AddEnvironmentResourceStatus(string env, string id, ServiceResourceStatus serviceResourceStatus)
        {
            if (serviceResourceStatus.PublishedVersions == null)
            {
                serviceResourceStatus.PublishedVersions = new List<ResourceVersionInfo>();
            }

            ServiceResource resource = await _resourceRegistry.GetResource(id, env);
            if (resource == null)
            {
                serviceResourceStatus.PublishedVersions.Add(new ResourceVersionInfo() { Environment = env, Version = null });
            }
            else if (string.IsNullOrEmpty(resource.Version))
            {
                serviceResourceStatus.PublishedVersions.Add(new ResourceVersionInfo() { Environment = env, Version = "N/A" });
            }
            else
            {
                serviceResourceStatus.PublishedVersions.Add(new ResourceVersionInfo() { Environment = env, Version = resource.Version });
            }
            return serviceResourceStatus;
        }
    }
}
