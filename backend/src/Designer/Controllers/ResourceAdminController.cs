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
        private readonly ResourceRegistryIntegrationSettings _resourceRegistrySettings;

        public ResourceAdminController(IGitea gitea, IRepository repository, IResourceRegistryOptions resourceRegistryOptions, IMemoryCache memoryCache, IOptions<CacheSettings> cacheSettings, IOrgService orgService, IOptions<ResourceRegistryIntegrationSettings> resourceRegistryEnvironment, IResourceRegistry resourceRegistry)
        {
            _giteaApi = gitea;
            _repository = repository;
            _resourceRegistryOptions = resourceRegistryOptions;
            _memoryCache = memoryCache;
            _cacheSettings = cacheSettings.Value;
            _orgService = orgService;
            _resourceRegistrySettings = resourceRegistryEnvironment.Value;
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
        public async Task<ActionResult<List<ListviewServiceResource>>> GetRepositoryResourceList(string org, [FromQuery] bool includeEnvResources = false)
        {
            string repository = GetRepositoryName(org);
            List<ServiceResource> repositoryResourceList = _repository.GetServiceResources(org, repository);
            List<ListviewServiceResource> listviewServiceResources = new List<ListviewServiceResource>();

            foreach (ServiceResource resource in repositoryResourceList)
            {
                ListviewServiceResource listviewResource = await _giteaApi.MapServiceResourceToListViewResource(org, repository, resource);
                listviewResource.HasPolicy = true;
                listviewResource.Environments = ["gitea"];
                listviewServiceResources.Add(listviewResource);
            }

            if (includeEnvResources)
            {
                foreach (string environment in _resourceRegistrySettings.Keys)
                {
                    string cacheKey = $"resourcelist_${environment}";
                    if (!_memoryCache.TryGetValue(cacheKey, out List<ServiceResource> environmentResources))
                    {
                        environmentResources = await _resourceRegistry.GetResourceList(environment, false);
                        var cacheEntryOptions = new MemoryCacheEntryOptions()
                            .SetPriority(CacheItemPriority.High)
                            .SetAbsoluteExpiration(new TimeSpan(0, _cacheSettings.DataNorgeApiCacheTimeout, 0));
                        _memoryCache.Set(cacheKey, environmentResources, cacheEntryOptions);
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
        public ActionResult<ServiceResource> GetResourceById(string org, string repository, string id)
        {
            ServiceResource resource = _repository.GetServiceResourceById(org, repository, id);
            return resource != null ? resource : StatusCode(404);
        }

        [HttpGet]
        [Route("designer/api/{org}/resources/publishstatus/{repository}/{id}")]
        public async Task<ActionResult<ServiceResourceStatus>> GetPublishStatusById(string org, string repository, string id)
        {
            ServiceResource resource = _repository.GetServiceResourceById(org, repository, id);
            if (resource == null)
            {
                return StatusCode(404);
            }

            ServiceResourceStatus resourceStatus = new()
            {
                ResourceVersion = resource.Version,
                PublishedVersions = []
            };

            foreach (string envir in _resourceRegistrySettings.Keys)
            {
                resourceStatus.PublishedVersions.Add(await AddEnvironmentResourceStatus(envir, id));
            }

            return resourceStatus;
        }

        [Route("designer/api/{org}/resources/validate/{repository}/{id}")]
        public ActionResult GetValidateResource(string org, string repository, string id)
        {
            ServiceResource resourceToValidate = _repository.GetServiceResourceById(org, repository, id);
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
        [Route("designer/api/{org}/resources/accesspackages")]
        public async Task<ActionResult> GetAccessPackages(string org, CancellationToken cancellationToken)
        {
            // 1. GET accesspackages (mocked for now)
            AccessPackageArea skattArea = new()
            {
                Id = "F52ADD40-6748-4E89-875A-63D3E153605D",
                Name = "Skatt, avgift, regnskap og toll",
                Description = "Denne tilgangspakken er relevant for alle virksomheter som betaler eller rapporterer inn informasjon knyttet til skatt, avgift regnskap og toll",
                ShortDescription = "For alle virksomheter som betaler eller rapporterer inn informasjon knyttet til skatt, avgift regnskap og toll",
                IconName = "BankNoteIcon"
            };
            AccessPackageArea personaleArea = new()
            {
                Id = "area_personale",
                Name = "Personale",
                Description = "",
                ShortDescription = "For alle virksomheter som har ansatte",
                IconName = "PersonSuitIcon"
            };
            AccessPackageArea miljoArea = new()
            {
                Id = "area_miljo",
                Name = "Miljø, ulykke og sikkerhet",
                Description = "",
                ShortDescription = "For alle virksomheter som skal utføre tjenester relatert til mlijø, ulykke og sikkerhet",
                IconName = "EarthIcon"
            };
            AccessPackageArea postArea = new()
            {
                Id = "area_post",
                Name = "Post og arkiv",
                Description = "",
                ShortDescription = "For alle virksomheter som mottar post fra det offentlige.",
                IconName = "EnvelopeClosedIcon"
            };
            AccessPackageArea forholdArea = new()
            {
                Id = "area_forhold",
                Name = "Forhold ved virksomheten",
                Description = "",
                ShortDescription = "For alle virksomheter",
                IconName = "Buildings3Icon"
            };
            AccessPackageArea integationArea = new()
            {
                Id = "area_integration",
                Name = "Integrasjoner og API-er",
                Description = "",
                ShortDescription = "For alle virksomheter som har dataintegrasjoner mot og benytter API",
                IconName = "CloudUpIcon"
            };
            AccessPackageArea tilgangerArea = new()
            {
                Id = "area_tilganger",
                Name = "Administrere tilganger",
                Description = "",
                ShortDescription = "For alle virksomheter. Det skal ikke knyttes tjenester til disse gruppene da de er rene administrasjonsgrupper.",
                IconName = "PadlockLockedIcon"
            };
            AccessPackageArea jordbrukArea = new()
            {
                Id = "tag_jordbruk",
                IconName = "PlantIcon",
                ShortDescription = "Tjenester rettet mot virksomheter med aktivitet innen jordbruk, skogbruk, jakt, fiske og akvakultur",
                Name = "Jordbruk, skogbruk, jakt, fiske og akvakultur",
                Description = "Denne tilgangspakken er relevant for tjenester rettet mot virksomheter med aktivitet innen jordbruk, skogbruk, jakt, fiske og akvakultur.",
            };
            AccessPackageArea byggArea = new()
            {
                Id = "area_bygg",
                Name = "Bygg, anlegg og eiendom",
                Description = "",
                ShortDescription = "For tjenester rettet mot virksomheter med aktivitet innen bygg, anlegg og eiendom.",
                IconName = "HardHatIcon"
            };
            AccessPackageArea transportArea = new()
            {
                Id = "589217CF-6070-474F-9989-8C5359C740F4",
                Name = "Transport og lagring",
                Description = "Denne tilgangspakken er relevant for alle tjenester rettet mot virksomheter med aktivitet innen transport og lagring",
                ShortDescription = "Tjenester rettet mot virksomheter med aktivitet innen transport og lagring",
                IconName = "TruckIcon"
            };
            AccessPackageArea helseArea = new()
            {
                Id = "area_helse",
                Name = "Helse, pleie, omsorg og vern",
                Description = "",
                ShortDescription = "For alle tjenester rettet mot virksomheter med aktivitet innen Helse, pleie, omsorg og vern",
                IconName = "FirstAidIcon"
            };
            AccessPackageArea utdanningArea = new()
            {
                Id = "area_utdanning",
                Name = "Oppvekst og utdanning",
                Description = "",
                ShortDescription = "For alle tjenester rettet mot virksomheter med aktivitet innen oppvekst, skole og høyere utdanning",
                IconName = "HatSchoolIcon"
            };
            AccessPackageArea energyArea = new()
            {
                Id = "area_energy",
                Name = "Energi, vann, avløp og avfall",
                Description = "",
                ShortDescription = "For alle virksomheter",
                IconName = "LightningIcon"
            };
            AccessPackageArea industryArea = new()
            {
                Id = "area_industry",
                Name = "Industrier",
                Description = "",
                ShortDescription = "For alle virksomheter",
                IconName = "CogIcon"
            };
            AccessPackageArea cultureArea = new()
            {
                Id = "area_culture",
                Name = "Kultur og frivillighet",
                Description = "",
                ShortDescription = "For alle virksomheter",
                IconName = "PresentationIcon"
            };
            AccessPackageArea handelArea = new()
            {
                Id = "area_handel",
                Name = "Handel, overnatting og servering",
                Description = "",
                ShortDescription = "For alle virksomheter",
                IconName = "WalletIcon"
            };
            AccessPackageArea andreArea = new()
            {
                Id = "area_andre",
                Name = "Andre tjenesteytende næringer",
                Description = "",
                ShortDescription = "For alle virksomheter",
                IconName = "ReceptionIcon"
            };
            AccessPackageArea regnArea = new()
            {
                Id = "area_regn",
                Name = "Regnskapsførere",
                Description = "Tjenester som det er naturlig at en regnskapsfører utfører på vegne av sine kunder",
                ShortDescription = "For alle virksomheter",
                IconName = "AreaChartIcon"
            };
            AccessPackageArea revisorArea = new()
            {
                Id = "tag_regnskapsforer",
                IconName = "ReceiptIcon",
                ShortDescription = "Tjenester som det er naturlig at en revisor utfører på vegne av sine kunder",
                Name = "Revisor",
                Description = "Denne fullmakten gir tilgang til alle tjenester som det er naturlig at en regnskapsfører utfører på vegne av sine kunder",
            };
            AccessPackageArea konkursArea = new()
            {
                Id = "area_konkurs",
                Name = "Konkursbo",
                Description = "",
                ShortDescription = "For alle konkurser, tvangsoppløsninger og tvangsavviklinger som har fått registrert et tilhørende konkursbo i Enhetsregisteret",
                IconName = "TrendDownIcon"
            };

            AccessPackageTag ofteBruktTag = new()
            {
                Id = "oftebrukt",
                Name = "Ofte brukt"
            };
            AccessPackageTag bransjeSpesifikkTag = new()
            {
                Id = "bransjespesifikk",
                Name = "Bransjespesifikke"
            };

            List<AccessPackage> accessPackages =
            [
                new()
                {
                    Id = "urn:altinn:accesspackage:foretaksskatt",
                    Urn = "urn:altinn:accesspackage:foretaksskatt",
                    Name = "Foretaksskatt",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til skatt for foretak.",
                    Tags = [ofteBruktTag],
                    Area = skattArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:skattegrunnlag",
                    Urn = "urn:altinn:accesspackage:skattegrunnlag",
                    Name = "Skattegrunnlag",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til innhenting av skattegrunnlag.",
                    Tags = [ofteBruktTag],
                    Area = skattArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:merverdiavgift",
                    Urn = "urn:altinn:accesspackage:merverdiavgift",
                    Name = "Merverdiavgift",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift.",
                    Tags = [ofteBruktTag],
                    Area = skattArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:personal",
                    Urn = "urn:altinn:accesspackage:personal",
                    Name = "Merverdiavgift",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift.",
                    Tags = [ofteBruktTag],
                    Area = personaleArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:miljo",
                    Urn = "urn:altinn:accesspackage:miljo",
                    Name = "Merverdiavgift",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift.",
                    Tags = [ofteBruktTag],
                    Area = miljoArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:post",
                    Urn = "urn:altinn:accesspackage:post",
                    Name = "Merverdiavgift",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift.",
                    Tags = [ofteBruktTag],
                    Area = postArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:forhold",
                    Urn = "urn:altinn:accesspackage:forhold",
                    Name = "Merverdiavgift",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift.",
                    Tags = [ofteBruktTag],
                    Area = forholdArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:integationArea",
                    Urn = "urn:altinn:accesspackage:integationArea",
                    Name = "Merverdiavgift",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift.",
                    Tags = [ofteBruktTag],
                    Area = integationArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:tilgangerArea",
                    Urn = "urn:altinn:accesspackage:tilgangerArea",
                    Name = "Merverdiavgift",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift.",
                    Tags = [ofteBruktTag],
                    Area = tilgangerArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:jordbruk",
                    Urn = "urn:altinn:accesspackage:jordbruk",
                    Name = "Jordbruk",
                    Description = "Gir tilgang til tjenester knyttet til jordbruk.",
                    Tags = [bransjeSpesifikkTag],
                    Area = jordbrukArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:dyrehold",
                    Urn = "urn:altinn:accesspackage:dyrehold",
                    Name = "Dyrehold",
                    Description = "Gir tilgang til tjenester knyttet til dyrehold. ",
                    Tags = [bransjeSpesifikkTag],
                    Area = jordbrukArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:reindrift",
                    Urn = "urn:altinn:accesspackage:reindrift",
                    Name = "Reindrift",
                    Description = "Denne tilgangspakken gir tilgang til tjenester knyttet til reindrift.",
                    Tags = [bransjeSpesifikkTag],
                    Area = jordbrukArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:jaktogviltstell",
                    Urn = "urn:altinn:accesspackage:jaktogviltstell",
                    Name = "Jakt og viltstell",
                    Description = "Gir fullmakter til tjenester knyttet til jakt og viltstell",
                    Tags = [bransjeSpesifikkTag],
                    Area = jordbrukArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:skogbruk",
                    Urn = "urn:altinn:accesspackage:skogbruk",
                    Name = "Skogbruk",
                    Description = "Gir fullmakter til tjenester knyttet til skogbruk",
                    Tags = [bransjeSpesifikkTag],
                    Area = jordbrukArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:fiske",
                    Urn = "urn:altinn:accesspackage:fiske",
                    Name = "Fiske",
                    Description = "Gir fullmakter til tjenester knyttet til fiske",
                    Tags = [bransjeSpesifikkTag],
                    Area = jordbrukArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:akvakultur",
                    Urn = "urn:altinn:accesspackage:akvakultur",
                    Name = "Akvakultur",
                    Description = "Gir fullmakter til tjenester knyttet til akvakultur og fiskeoppdrett.",
                    Tags = [bransjeSpesifikkTag],
                    Area = jordbrukArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:byggArea",
                    Urn = "urn:altinn:accesspackage:byggArea",
                    Name = "Merverdiavgift",
                    Description = "Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift.",
                    Tags = [bransjeSpesifikkTag],
                    Area = byggArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:sjofart",
                    Urn = "urn:altinn:accesspackage:sjofart",
                    Name = "Sjøfart",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til skipsarbeidstakere og fartøy til sjøs.",
                    Tags = [bransjeSpesifikkTag],
                    Area = transportArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:lufttransport",
                    Urn = "urn:altinn:accesspackage:lufttransport",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = transportArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:helseArea",
                    Urn = "urn:altinn:accesspackage:helseArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = helseArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:utdanningArea",
                    Urn = "urn:altinn:accesspackage:utdanningArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = utdanningArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:energyArea",
                    Urn = "urn:altinn:accesspackage:energyArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = energyArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:industryArea",
                    Urn = "urn:altinn:accesspackage:industryArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = industryArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:cultureArea",
                    Urn = "urn:altinn:accesspackage:cultureArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = cultureArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:handelArea",
                    Urn = "urn:altinn:accesspackage:handelArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = handelArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:andreArea",
                    Urn = "urn:altinn:accesspackage:andreArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = andreArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:regnArea",
                    Urn = "urn:altinn:accesspackage:regnArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = regnArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:regnskapsforermedsigneringsrettighet",
                    Urn = "urn:altinn:accesspackage:regnskapsforermedsigneringsrettighet",
                    Name = "Regnskapsfører med signeringsrettighet",
                    Description = "Denne fullmakten gir tilgang til regnskapfører å kunne signere på vegne av kunden for alle tjenester som krever signeringsrett. Dette er tjenester som man har vurdert det som naturlig at en regnskapsfører utfører på vegne av sin kunde. Fullmakten gis kun til autoriserte regnskapsførere. Fullmakt hos regnskapfører oppstår når kunden registrerer regnskapsfører i Enhetsregisteret. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.",
                    Tags = [bransjeSpesifikkTag],
                    Area = revisorArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:regnskapsforerutensigneringsrettighet",
                    Urn = "urn:altinn:accesspackage:regnskapsforerutensigneringsrettighet",
                    Name = "Regnskapsfører uten signeringsrettighet",
                    Description = "Denne fullmakten gir tilgang til å kunne utføre alle tjenester som ikke krever signeringsrett. Dette er tjenester som man har vurdert det som naturlig at en regnskapsfører utfører på vegne av sin kunde. Fullmakten gis kun til autoriserte regnskapsførere. Fullmakt hos regnskapfører oppstår når kunden registrerer regnskapsfører i Enhetsregisteret. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.",
                    Tags = [bransjeSpesifikkTag],
                    Area = revisorArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:regnskapsforerlonn",
                    Urn = "urn:altinn:accesspackage:regnskapsforerlonn",
                    Name = "Regnskapsfører lønn",
                    Description = "Denne fullmakten gir tilgang til regnskapsfører å rapportere lønn for sin kunde. Dette er tjenester som man har vurdert det som naturlig at en regnskapsfører utfører på vegne av sin kunde. Fullmakten gis kun til autoriserte regnskapsførere. Fullmakt hos regnskapfører oppstår når kunden registrerer regnskapsfører i Enhetsregisteret. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.",
                    Tags = [bransjeSpesifikkTag],
                    Area = revisorArea
                },
                new()
                {
                    Id = "urn:altinn:accesspackage:konkursArea",
                    Urn = "urn:altinn:accesspackage:konkursArea",
                    Name = "Lufttransport",
                    Description = "Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy.",
                    Tags = [bransjeSpesifikkTag],
                    Area = konkursArea
                },
            ];

            string env = "tt02";
            IEnumerable<string> subjects = accessPackages.Select(accessPackage => accessPackage.Urn);

            OrgList orgList = await GetOrgList();

            // 2. POST to get all resources per access package
            List<SubjectResources> subjectResources = await _resourceRegistry.GetSubjectResources(subjects.ToList(), env);
            subjectResources.Add(new SubjectResources()
            {
                Subject = new AttributeMatchV2()
                {
                    Type = "",
                    Value = "",
                    Urn = "urn:altinn:accesspackage:regnskapsforerlonn"
                },
                Resources = new List<AttributeMatchV2>() {
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "brg-maskinportenschemaid-5",
                        Urn = ""
                    },
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "mat-maskinportenschemaid-54",
                        Urn = ""
                    },
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "skd-maskinportenschemaid-32",
                        Urn = ""
                    },
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "slk-maskinportenschemaid-81",
                        Urn = ""
                    },
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "nav-maskinportenschemaid-141",
                        Urn = ""
                    },
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "svv-maskinportenschemaid-249",
                        Urn = ""
                    },
                }
            });
            subjectResources.Add(new SubjectResources()
            {
                Subject = new AttributeMatchV2()
                {
                    Type = "",
                    Value = "",
                    Urn = "urn:altinn:accesspackage:akvakultur"
                },
                Resources = new List<AttributeMatchV2>() {
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "innsyn-i-driftsplaner-for-akvakulturanlegg-i-sj-vann",
                        Urn = ""
                    },
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "ske-innrapportering-omsetning-raafisk",
                        Urn = ""
                    },
                    new AttributeMatchV2() {
                        Type = "",
                        Value = "mat-maskinportenschema-lakselusrapportering",
                        Urn = ""
                    },
                }
            });

            // 3. GET full list of resources
            List<ServiceResource> environmentResources = await _resourceRegistry.GetResourceList(env, false);

            // 4. map resource to access package based on data from step 2.
            accessPackages.ForEach(accessPackage =>
            {
                List<AttributeMatchV2> resources = subjectResources.Find(x => x.Subject.Urn == accessPackage.Urn)?.Resources;

                resources?.ForEach(resourceMatch =>
                {
                    ServiceResource fullResource = environmentResources.Find(x => x.Identifier == resourceMatch.Value);

                    if (fullResource != null)
                    {
                        orgList.Orgs.TryGetValue(fullResource.HasCompetentAuthority.Orgcode.ToLower(), out Org organization);

                        accessPackage.Services.Add(new AccessPackageService()
                        {
                            Identifier = resourceMatch.Value,
                            Title = fullResource?.Title,
                            HasCompetentAuthority = fullResource.HasCompetentAuthority,
                            LogoUrl = organization.Logo
                        });
                    }

                });
            });

            return Ok(accessPackages);
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
                        && resource.ResourceReferences != null && resource.ResourceReferences.Exists(r => r.ReferenceType != null && r.ReferenceType.Equals(ReferenceType.ServiceCode))
                        && resource.ResourceType == ResourceType.Altinn2Service)
                    {
                        AvailableService service = new AvailableService();
                        if (resource.Title.ContainsKey("nb"))
                        {
                            service.ServiceName = resource.Title["nb"];
                        }

                        service.ExternalServiceCode = resource.ResourceReferences.First(r => r.ReferenceType.Equals(ReferenceType.ServiceCode)).Reference;
                        service.ExternalServiceEditionCode = Convert.ToInt32(resource.ResourceReferences.First(r => r.ReferenceType.Equals(ReferenceType.ServiceEditionCode)).Reference);
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
                if (resource.ResourceReferences == null || !resource.ResourceReferences.Any((x) => x.ReferenceType == ReferenceType.MaskinportenScope))
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

        private static bool IsServiceOwner(ServiceResource? resource, string loggedInOrg)
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
    }
}
