using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.ResourceRegistry.Core.Models.Altinn2;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
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
        private readonly IOrgService _orgService;
        private readonly IResourceRegistry _resourceRegistry;

        public ResourceAdminController(IGitea gitea, IRepository repository, IResourceRegistryOptions resourceRegistryOptions, IMemoryCache memoryCache, IOptions<CacheSettings> cacheSettings, IOrgService orgService, IResourceRegistry resourceRegistry, IEnvironmentsService environmentsService)
        {
            _giteaApi = gitea;
            _repository = repository;
            _resourceRegistryOptions = resourceRegistryOptions;
            _memoryCache = memoryCache;
            _cacheSettings = cacheSettings.Value;
            _orgService = orgService;
            _resourceRegistry = resourceRegistry;
        }

        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/accesslist/")]
        public async Task<ActionResult<AccessList>> CreateAccessList(string env, string org, [FromBody] AccessList accessList)
        {
            return await _resourceRegistry.CreateAccessList(org, env, accessList);
        }

        [HttpGet]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/accesslist/")]
        public async Task<ActionResult<PagedAccessListResponse>> GetAccessLists(string env, string org, [FromQuery] string page)
        {
            return await _resourceRegistry.GetAccessLists(org, env, page);
        }

        [HttpGet]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/accesslist/{identifier}")]
        public async Task<ActionResult<AccessList>> GetAccessList(string env, string org, string identifier)
        {
            return await _resourceRegistry.GetAccessList(org, identifier, env);
        }

        [HttpGet]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/accesslist/{identifier}/members")]
        public async Task<ActionResult<PagedAccessListMembersResponse>> GetAccessListMembers(string env, string org, string identifier, [FromQuery] string page)
        {
            return await _resourceRegistry.GetAccessListMembers(org, identifier, env, page);
        }

        [HttpDelete]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/accesslist/{identifier}")]
        public async Task<ActionResult> DeleteAccessList(string env, string org, string identifier, string etag)
        {
            return await _resourceRegistry.DeleteAccessList(org, identifier, env, etag);
        }

        [HttpPut]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/accesslist/{identifier}")]
        public async Task<ActionResult<AccessList>> UpdateAccessList(string env, string org, string identifier, [FromBody] AccessList accessList)
        {
            return await _resourceRegistry.UpdateAccessList(org, identifier, env, accessList);
        }

        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/accesslist/{identifier}/members/")]
        public async Task<ActionResult> AddAccessListMembers(string env, string org, string identifier, [FromBody] AccessListOrganizationNumbers members)
        {
            ActionResult result = await _resourceRegistry.AddAccessListMembers(org, identifier, members, env);
            return result;
        }

        [HttpDelete]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/accesslist/{identifier}/members/")]
        public async Task<ActionResult> RemoveAccessListMember(string env, string org, string identifier, [FromBody] AccessListOrganizationNumbers members)
        {
            ActionResult result = await _resourceRegistry.RemoveAccessListMembers(org, identifier, members, env);
            return result;
        }

        [HttpGet]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/{id}/accesslists/")]
        public async Task<ActionResult<PagedAccessListResponse>> GetResourceAccessLists(string env, string org, string id, [FromQuery] string page)
        {
            return await _resourceRegistry.GetResourceAccessLists(org, id, env, page);
        }

        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/{id}/accesslists/{listId}")]
        public async Task<ActionResult<ResourceAccessList>> AddResourceAccessList(string env, string org, string id, string listId)
        {
            HttpStatusCode statusCode = await _resourceRegistry.AddResourceAccessList(org, id, listId, env);
            return new StatusCodeResult(((int)statusCode));
        }

        [HttpDelete]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaResourceAccessListPermission)]
        [Route("designer/api/{env}/{org}/resources/{id}/accesslists/{listId}")]
        public async Task<ActionResult> RemoveResourceAccessList(string env, string org, string id, string listId)
        {
            HttpStatusCode statusCode = await _resourceRegistry.RemoveResourceAccessList(org, id, listId, env);
            return new StatusCodeResult(((int)statusCode));
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/allaccesslists")]
        public async Task<ActionResult> GetAllAccessLists(string org)
        {
            // check that the user is member of at least one Resources-Publish-XXXX team in the given organization to 
            // call this service. We use the Resources-Publish team instead of the AccessLists team, so users 
            // publishing resource can also set accesslists in policy (but might not have access to change acceslists)
            bool hasPublishResourcePermission = await HasPublishResourcePermissionInAnyEnv(org);
            if (!hasPublishResourcePermission)
            {
                return StatusCode(403);
            }

            List<string> envs = GetEnvironmentsForOrg(org);
            List<AccessList> allAccessLists = [];
            foreach (string environment in envs)
            {
                List<AccessList> envAccessLists = await GetAllAccessListsForEnv(environment, org);
                allAccessLists.AddRange(envAccessLists.Where(envAccessList =>
                {
                    bool isAlreadyInList = allAccessLists.Any(accessList => accessList.Identifier == envAccessList.Identifier);
                    return !isAlreadyInList;
                }));
            }

            return Ok(allAccessLists);
        }

        private async Task<bool> HasPublishResourcePermissionInAnyEnv(string org)
        {
            List<Team> teams = await _giteaApi.GetTeams();
            List<string> envs = GetEnvironmentsForOrg(org);

            bool isTeamMember = teams.Any(team =>
                team.Organization.Username.Equals(org, StringComparison.OrdinalIgnoreCase) &&
                envs.Any(env => team.Name.Equals($"Resources-Publish-{env}", StringComparison.OrdinalIgnoreCase))
            );
            return isTeamMember;
        }

        private async Task<List<AccessList>> GetAllAccessListsForEnv(string env, string org)
        {
            List<AccessList> accessLists = [];
            try
            {
                PagedAccessListResponse pagedListResponse = await _resourceRegistry.GetAccessLists(org, env, "");
                accessLists.AddRange(pagedListResponse.Data);
                string nextPage = pagedListResponse.NextPage;

                while (!string.IsNullOrWhiteSpace(nextPage))
                {
                    PagedAccessListResponse nextPagedListResponse = await _resourceRegistry.GetAccessLists(org, env, nextPage);
                    accessLists.AddRange(nextPagedListResponse.Data);
                    nextPage = nextPagedListResponse.NextPage;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching access lists for org {org} in env {env}: {ex.Message}");
            }

            return accessLists;
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
        public async Task<ActionResult<List<ListviewServiceResource>>> GetRepositoryResourceList(string org, [FromQuery] bool includeEnvResources = false, [FromQuery] bool skipGiteaFields = false, CancellationToken cancellationToken = default)
        {
            string repository = GetRepositoryName(org);
            List<ServiceResource> repositoryResourceList = await _repository.GetServiceResources(org, repository, "", cancellationToken);
            List<ListviewServiceResource> listviewServiceResources = new List<ListviewServiceResource>();

            IEnumerable<ListviewServiceResource> resources;
            if (skipGiteaFields)
            {
                resources = repositoryResourceList.Select(resource => new ListviewServiceResource
                {
                    Identifier = resource.Identifier,
                    Title = resource.Title,
                });
            }
            else
            {
                using SemaphoreSlim semaphore = new(25); // Limit to 25 concurrent requests 

                async Task<ListviewServiceResource> ProcessResourceAsync(ServiceResource resource)
                {
                    await semaphore.WaitAsync(cancellationToken);
                    try
                    {
                        return await _giteaApi.MapServiceResourceToListViewResource(org, repository, resource, cancellationToken);
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                }
                IEnumerable<Task<ListviewServiceResource>> tasks = repositoryResourceList.Select(resource => ProcessResourceAsync(resource));
                resources = await Task.WhenAll(tasks);
            }

            foreach (ListviewServiceResource listviewResource in resources)
            {
                listviewResource.HasPolicy = true;
                listviewResource.Environments = ["gitea"];
                listviewServiceResources.Add(listviewResource);
            }

            if (includeEnvResources)
            {
                IEnumerable<string> environments = GetEnvironmentsForOrg(org);
                foreach (string environment in environments)
                {
                    string cacheKey = $"resourcelist_${environment}";
                    if (!_memoryCache.TryGetValue(cacheKey, out List<ServiceResource> environmentResources))
                    {
                        try
                        {
                            environmentResources = await _resourceRegistry.GetResourceList(environment, false);
                            var cacheEntryOptions = new MemoryCacheEntryOptions()
                                .SetPriority(CacheItemPriority.High)
                                .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));
                            _memoryCache.Set(cacheKey, environmentResources, cacheEntryOptions);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error fetching resource list for env {environment}: {ex.Message}");
                            environmentResources = [];
                        }
                    }

                    IEnumerable<ServiceResource> environmentResourcesForOrg = environmentResources.Where(x =>
                        x.HasCompetentAuthority?.Orgcode != null &&
                        x.HasCompetentAuthority.Orgcode.Equals(org, StringComparison.OrdinalIgnoreCase)
                    );

                    foreach (ServiceResource resource in environmentResourcesForOrg)
                    {
                        ListviewServiceResource listResource = listviewServiceResources.FirstOrDefault(x => x.Identifier == resource.Identifier);
                        if (listResource == null)
                        {
                            listResource = new ListviewServiceResource
                            {
                                Identifier = resource.Identifier,
                                Title = resource.Title,
                                CreatedBy = "",
                                LastChanged = null,
                                Environments = []
                            };
                            listviewServiceResources.Add(listResource);
                        }
                        listResource.Environments.Add(environment);
                    }
                }
            }

            return listviewServiceResources;
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/{repository}/{id}")]
        public async Task<ActionResult<ServiceResource>> GetResourceById(string org, string repository, string id, CancellationToken cancellationToken)
        {
            ServiceResource resource = await _repository.GetServiceResourceById(org, repository, id, cancellationToken);
            return resource != null ? resource : StatusCode(404);
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/publishstatus/{repository}/{id}")]
        public async Task<ActionResult<ServiceResourceStatus>> GetPublishStatusById(string org, string repository, string id, CancellationToken cancellationToken)
        {
            ServiceResource resource = await _repository.GetServiceResourceById(org, repository, id, cancellationToken);
            if (resource == null)
            {
                return StatusCode(404);
            }

            ServiceResourceStatus resourceStatus = new()
            {
                ResourceVersion = resource.Version,
                PublishedVersions = []
            };

            IEnumerable<string> environments = GetEnvironmentsForOrg(org);
            foreach (string envir in environments)
            {
                resourceStatus.PublishedVersions.Add(await AddEnvironmentResourceStatus(envir, id));
            }

            return resourceStatus;
        }

        [Route("designer/api/{org}/resources/validate/{repository}/{id}")]
        public async Task<ActionResult> GetValidateResource(string org, string repository, string id)
        {
            ServiceResource resourceToValidate = await _repository.GetServiceResourceById(org, repository, id);
            if (resourceToValidate != null)
            {
                ValidationProblemDetails validationProblemDetails = ValidateResource(resourceToValidate);
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
        public async Task<ActionResult> UpdateResource(string org, string id, [FromBody] ServiceResource resource, CancellationToken cancellationToken = default)
        {
            resource.HasCompetentAuthority = await GetCompetentAuthorityFromOrg(org);
            return _repository.UpdateServiceResource(org, id, resource);
        }

        [HttpPost]
        [Route("designer/api/{org}/resources/addexistingresource/{resourceId}/{env}")]
        public async Task<ActionResult> AddExistingResource(string org, string resourceId, string env)
        {
            string repository = GetRepositoryName(org);
            ServiceResource resource = await _resourceRegistry.GetResource(resourceId, env);
            if (resource == null)
            {
                return new StatusCodeResult(404);
            }
            resource.HasCompetentAuthority = await GetCompetentAuthorityFromOrg(org);
            StatusCodeResult statusCodeResult = _repository.AddServiceResource(org, resource);
            if (statusCodeResult.StatusCode != (int)HttpStatusCode.Created)
            {
                return statusCodeResult;
            }

            XacmlPolicy policy = await _resourceRegistry.GetResourcePolicy(resourceId, env);
            await _repository.SavePolicy(org, repository, resource.Identifier, policy);
            return Ok(resource);
        }

        [HttpPost]
        [Route("designer/api/{org}/resources/addresource")]
        public async Task<StatusCodeResult> AddResource(string org, [FromBody] ServiceResource resource)
        {
            resource.HasCompetentAuthority = await GetCompetentAuthorityFromOrg(org);
            return _repository.AddServiceResource(org, resource);
        }

        [HttpPost]
        [Route("designer/api/{org}/resources/importresource/{serviceCode}/{serviceEdition}/{env}")]
        public async Task<ActionResult> ImportResource(string org, string serviceCode, int serviceEdition, string env, [FromBody] string resourceId)
        {
            if (!Regex.IsMatch(resourceId, "^[a-z0-9_-]{4,}$"))
            {
                return new StatusCodeResult(400);
            }
            string repository = GetRepositoryName(org);
            ServiceResource resource = await _resourceRegistry.GetServiceResourceFromService(serviceCode, serviceEdition, env.ToLower());
            resource.Identifier = resourceId;
            StatusCodeResult statusCodeResult = _repository.AddServiceResource(org, resource);
            if (statusCodeResult.StatusCode != (int)HttpStatusCode.Created)
            {
                return statusCodeResult;
            }
            XacmlPolicy policy = await _resourceRegistry.GetXacmlPolicy(serviceCode, serviceEdition, resource.Identifier, env.ToLower());
            await _repository.SavePolicy(org, repository, resource.Identifier, policy);
            return Ok(resource);
        }

        [HttpGet]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaPublishResourcePermission)]
        [Route("designer/api/{org}/resources/altinn2/delegationcount/{serviceCode}/{serviceEdition}/{env}")]
        public async Task<ActionResult> GetDelegationCount(string org, string serviceCode, int serviceEdition, string env)
        {
            List<ServiceResource> allResources = await _resourceRegistry.GetResourceList(env.ToLower(), true);
            bool serviceExists = allResources.Any(x => x.Identifier.Equals($"se_{serviceCode}_{serviceEdition}"));
            if (!serviceExists)
            {
                return new NotFoundResult();
            }

            ServiceResource resource = await _resourceRegistry.GetServiceResourceFromService(serviceCode, serviceEdition, env.ToLower());
            if (!IsServiceOwner(resource, org))
            {
                return new UnauthorizedResult();
            }

            DelegationCountOverview overview = await _resourceRegistry.GetDelegationCount(serviceCode, serviceEdition, env);
            return Ok(overview);
        }

        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaPublishResourcePermission)]
        [Route("designer/api/{org}/resources/altinn2/delegationmigration/{env}")]
        public async Task<ActionResult> MigrateDelegations([FromBody] ExportDelegationsRequestBE delegationRequest, string org, string env)
        {
            ServiceResource resource = await _resourceRegistry.GetServiceResourceFromService(delegationRequest.ServiceCode, delegationRequest.ServiceEditionCode, env.ToLower());
            if (!IsServiceOwner(resource, org))
            {
                return new UnauthorizedResult();
            }

            return await _resourceRegistry.StartMigrateDelegations(delegationRequest, env);
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
        [Route("designer/api/accesspackageservices/{accesspackage}/{env}")]
        public async Task<ActionResult<List<AccessPackageService>>> GetServicesForAccessPackage(string org, string accesspackage, string env)
        {
            // POST to get all resources per access package
            List<SubjectResources> subjectResources = await _resourceRegistry.GetSubjectResources([accesspackage], env);

            // GET full list of resources (with apps) in environment
            string cacheKey = $"resourcelist_with_apps${env}";
            if (!_memoryCache.TryGetValue(cacheKey, out List<ServiceResource> environmentResources))
            {
                environmentResources = await _resourceRegistry.GetResourceList(env, false, true);

                MemoryCacheEntryOptions cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetPriority(CacheItemPriority.High)
                    .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));
                _memoryCache.Set(cacheKey, environmentResources, cacheEntryOptions);
            }

            List<AttributeMatchV2> resources = subjectResources.Find(x => x.Subject.Urn == accesspackage)?.Resources;

            OrgList orgList = await GetOrgList();
            List<AccessPackageService> result = [];

            // return resources for all subjectResources
            resources?.ForEach(resourceMatch =>
            {
                ServiceResource fullResource = environmentResources.Find(x => x.Identifier == resourceMatch.Value);

                if (fullResource != null)
                {
                    orgList.Orgs.TryGetValue(fullResource.HasCompetentAuthority.Orgcode.ToLower(), out Org organization);

                    result.Add(new AccessPackageService()
                    {
                        Identifier = resourceMatch.Value,
                        Title = fullResource?.Title,
                        HasCompetentAuthority = fullResource.HasCompetentAuthority,
                        LogoUrl = organization.Logo
                    });
                }
            });

            return result
                .OrderBy(x => x.Title?["nb"] == null)
                .ThenBy(x => x.Title?["nb"], StringComparer.CurrentCultureIgnoreCase).ToList();
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/altinn2linkservices/{env}")]
        public async Task<ActionResult<List<AvailableService>>> GetAltinn2LinkServices(string org, string env)
        {
            string cacheKey = "availablelinkservices:" + org + env;
            if (!_memoryCache.TryGetValue(cacheKey, out List<AvailableService> linkServices))
            {

                List<AvailableService> unfiltered = new List<AvailableService>();
                List<ServiceResource> allResources = await _resourceRegistry.GetResourceList(env.ToLower(), true);

                foreach (ServiceResource resource in allResources)
                {
                    if (resource?.HasCompetentAuthority.Orgcode != null
                        && resource.ResourceReferences != null && resource.ResourceReferences.Exists(r => r.ReferenceType != null && r.ReferenceType.Equals(ResourceReferenceType.ServiceCode))
                        && resource.ResourceType == ResourceType.Altinn2Service)
                    {
                        AvailableService service = new AvailableService();
                        if (resource.Title.ContainsKey("nb"))
                        {
                            service.ServiceName = resource.Title["nb"];
                        }

                        service.ExternalServiceCode = resource.ResourceReferences.First(r => r.ReferenceType.Equals(ResourceReferenceType.ServiceCode)).Reference;
                        service.ExternalServiceEditionCode = Convert.ToInt32(resource.ResourceReferences.First(r => r.ReferenceType.Equals(ResourceReferenceType.ServiceEditionCode)).Reference);
                        service.ServiceOwnerCode = resource.HasCompetentAuthority.Orgcode;
                        unfiltered.Add(service);
                    }
                }

                var cacheEntryOptions = new MemoryCacheEntryOptions()
                   .SetPriority(CacheItemPriority.High)
                   .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));

                if (OrgUtil.IsTestEnv(org))
                {
                    linkServices = unfiltered.Where(a => a.ServiceOwnerCode.ToLower().Equals(org.ToLower()) || a.ServiceOwnerCode.ToLower().Equals("acn")).ToList();
                }
                else
                {
                    linkServices = unfiltered.Where(a => a.ServiceOwnerCode.ToLower().Equals(org.ToLower())).ToList();
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

            if (resource.ResourceType != ResourceType.MaskinportenSchema && (resource.AvailableForType == null || resource.AvailableForType.Count == 0))
            {
                ModelState.AddModelError($"{resource.Identifier}.availableForType", "resourceerror.missingavailablefortype");
            }

            if (resource.ResourceType == ResourceType.MaskinportenSchema)
            {
                if (resource.ResourceReferences == null || !resource.ResourceReferences.Any((x) => x.ReferenceType == ResourceReferenceType.MaskinportenScope))
                {
                    ModelState.AddModelError($"{resource.Identifier}.resourceReferences", "resourceerror.missingmaskinportenscope");
                }
                for (int i = 0; i < resource.ResourceReferences?.Count; i++)
                {
                    bool referenceError = string.IsNullOrEmpty(resource.ResourceReferences[i].Reference);
                    bool referenceSourceError = resource.ResourceReferences[i].ReferenceSource == null;
                    bool referenceTypeError = resource.ResourceReferences[i].ReferenceType == null;

                    if (referenceError || referenceSourceError || referenceTypeError)
                    {
                        ModelState.AddModelError($"{resource.Identifier}.resourceReferences[{i}]", "resourceerror.missingresourcereferences.");
                    }
                }
            }

            if (resource.ResourceType == ResourceType.Consent)
            {
                if (string.IsNullOrWhiteSpace(resource.ConsentTemplate))
                {
                    ModelState.AddModelError($"{resource.Identifier}.consentTemplate", "resourceerror.missingconsenttemplate");
                }
                if (!ResourceAdminHelper.ValidDictionaryAttribute(resource.ConsentText))
                {
                    ModelState.AddModelError($"{resource.Identifier}.consentText", "resourceerror.missingconsenttext");
                }
            }

            if (resource.Status == null)
            {
                ModelState.AddModelError($"{resource.Identifier}.status", "resourceerror.missingstatus");
            }

            if (resource.ContactPoints == null || resource.ContactPoints.Count == 0)
            {
                ModelState.AddModelError($"{resource.Identifier}.contactPoints", "resourceerror.missingcontactpoints");
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
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaPublishResourcePermission)]
        [Route("designer/api/{org}/resources/publish/{repository}/{id}/{env}")]
        public async Task<ActionResult> PublishResource(string org, string repository, string id, string env)
        {
            if (repository == $"{org}-resources")
            {
                string xacmlPolicyPath = _repository.GetPolicyPath(org, repository, id);
                ActionResult publishResult = await _repository.PublishResource(org, repository, id, env, xacmlPolicyPath);
                _memoryCache.Remove($"resourcelist_${env}");
                return publishResult;
            }
            else
            {
                Console.WriteLine("Invalid repository for resource");
                return new StatusCodeResult(400);
            }
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/consenttemplates")]
        public async Task<List<ConsentTemplate>> GetConsentTemplates(string org)
        {
            string cacheKey = $"consentTemplates${org}";
            if (!_memoryCache.TryGetValue(cacheKey, out List<ConsentTemplate> consentTemplates))
            {
                consentTemplates = await _resourceRegistry.GetConsentTemplates(org);

                var cacheEntryOptions = new MemoryCacheEntryOptions()
                   .SetPriority(CacheItemPriority.High)
                   .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));

                _memoryCache.Set(cacheKey, consentTemplates, cacheEntryOptions);
            }

            return consentTemplates;
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

        private static bool IsServiceOwner(ServiceResource resource, string loggedInOrg)
        {
            if (resource?.HasCompetentAuthority == null)
            {
                return false;
            }

            bool isOwnedByOrg = resource.HasCompetentAuthority.Orgcode.Equals(loggedInOrg, StringComparison.InvariantCultureIgnoreCase);

            if (OrgUtil.IsTestEnv(loggedInOrg))
            {
                return isOwnedByOrg || resource.HasCompetentAuthority.Orgcode.Equals("acn", StringComparison.InvariantCultureIgnoreCase);
            }

            return isOwnedByOrg;

        }

        private async Task<ResourceVersionInfo> AddEnvironmentResourceStatus(string env, string id)
        {
            ServiceResource resource = await _resourceRegistry.GetResource(id, env);
            string version;
            if (resource == null)
            {
                version = null;
            }
            else if (string.IsNullOrEmpty(resource.Version))
            {
                version = "N/A";
            }
            else
            {
                version = resource.Version;
            }
            return new ResourceVersionInfo() { Environment = env, Version = version };
        }

        private string GetRepositoryName(string org)
        {
            return string.Format("{0}-resources", org);
        }

        private static List<string> GetEnvironmentsForOrg(string org)
        {
            List<string> defaultOrgs = ["prod", "tt02"];
            return org.ToUpper() switch
            {
                "TTD" => [.. defaultOrgs, "at22", "at23", "at24", "yt01"],
                "DIGDIR" => [.. defaultOrgs, "at22", "at23", "at24", "yt01"],
                "SKD" => [.. defaultOrgs, "yt01"],
                _ => defaultOrgs,
            };
        }
    }
}
