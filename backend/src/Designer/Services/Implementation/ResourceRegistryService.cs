using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Exceptions;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class ResourceRegistryService : IResourceRegistry
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMaskinportenService _maskinPortenService;
        private readonly IClientDefinition _maskinportenClientDefinition;
        private readonly PlatformSettings _platformSettings;
        private readonly ResourceRegistryIntegrationSettings _resourceRegistrySettings;
        private readonly ResourceRegistryMaskinportenIntegrationSettings _maskinportenIntegrationSettings;
        private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase, WriteIndented = true };

        public ResourceRegistryService()
        {

        }

        public ResourceRegistryService(HttpClient httpClient, IHttpClientFactory httpClientFactory, IMaskinportenService maskinportenService, IClientDefinition maskinPortenClientDefinition, PlatformSettings platformSettings, IOptions<ResourceRegistryIntegrationSettings> resourceRegistryEnvironment, IOptions<ResourceRegistryMaskinportenIntegrationSettings> maskinportenIntegrationSettings)
        {
            _httpClient = httpClient;
            _httpClientFactory = httpClientFactory;
            _maskinPortenService = maskinportenService;
            _maskinportenClientDefinition = maskinPortenClientDefinition;
            _platformSettings = platformSettings;
            _resourceRegistrySettings = resourceRegistryEnvironment.Value;
            _maskinportenIntegrationSettings = maskinportenIntegrationSettings.Value;
        }

        public async Task<ActionResult> PublishServiceResource(ServiceResource serviceResource, string env, string policyPath = null)
        {
            _maskinportenClientDefinition.ClientSettings = GetMaskinportenIntegrationSettings(env);
            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();
            string publishResourceToResourceRegistryUrl;
            string getResourceRegistryUrl;
            string fullWritePolicyToResourceRegistryUrl;


            if (string.IsNullOrEmpty(env))
            {
                return new StatusCodeResult(400);
            }

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                publishResourceToResourceRegistryUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}";
                getResourceRegistryUrl = $"{publishResourceToResourceRegistryUrl}/{serviceResource.Identifier}";
                fullWritePolicyToResourceRegistryUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/{serviceResource.Identifier}/policy";
            }
            else
            {
                publishResourceToResourceRegistryUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}";
                getResourceRegistryUrl = $"{string.Format(_platformSettings.ResourceRegistryDefaultBaseUrl, env)}/{serviceResource.Identifier}";
                fullWritePolicyToResourceRegistryUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/{serviceResource.Identifier}/policy";
            }

            string serviceResourceString = System.Text.Json.JsonSerializer.Serialize(serviceResource, _serializerOptions);
            _httpClientFactory.CreateClient("myHttpClient");
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);

            HttpResponseMessage getResourceResponse = await _httpClient.GetAsync(getResourceRegistryUrl);

            HttpResponseMessage response;

            if (getResourceResponse.IsSuccessStatusCode && getResourceResponse.StatusCode.Equals(HttpStatusCode.OK))
            {
                string putRequest = $"{publishResourceToResourceRegistryUrl}/{serviceResource.Identifier}";
                using (StringContent putContent = new StringContent(serviceResourceString, Encoding.UTF8, "application/json"))
                {
                    response = await _httpClient.PutAsync(putRequest, putContent);
                }
            }
            else
            {
                using (StringContent postContent = new StringContent(serviceResourceString, Encoding.UTF8, "application/json"))
                {
                    response = await _httpClient.PostAsync(publishResourceToResourceRegistryUrl, postContent);
                }
            }

            if (!response.IsSuccessStatusCode)
            {
                return await GetPublishResponse(response);
            }

            if (policyPath != null)
            {
                using MultipartFormDataContent content = new MultipartFormDataContent();

                if (ResourceAdminHelper.ValidFilePath(policyPath))
                {
                    byte[] policyFileContentBytes;

                    try
                    {
                        string canonicalPolicyPath = Path.GetFullPath(policyPath);

                        if (canonicalPolicyPath.EndsWith(".xml"))
                        {
                            policyFileContentBytes = File.ReadAllBytes(policyPath);
                        }
                        else
                        {
                            return new StatusCodeResult(400);
                        }
                    }
                    catch (Exception)
                    {
                        Console.WriteLine($"Error while reading policy from path {policyPath}");
                        return new StatusCodeResult(400);
                    }

                    ByteArrayContent fileContent = new ByteArrayContent(policyFileContentBytes);
                    content.Add(fileContent, "policyFile", "policy.xml");
                    HttpResponseMessage writePolicyResponse = await _httpClient.PostAsync(fullWritePolicyToResourceRegistryUrl, content);

                    if (writePolicyResponse.IsSuccessStatusCode)
                    {
                        Console.WriteLine("Policy written successfully!");
                    }
                    else
                    {
                        Console.WriteLine($"Error writing policy. Status code: {writePolicyResponse.StatusCode}");
                        string responseContent = await writePolicyResponse.Content.ReadAsStringAsync();
                        Console.WriteLine($"Response content: {responseContent}");
                        return new StatusCodeResult(400);
                    }
                }
                else
                {
                    Console.WriteLine($"Invalid filepath for policyfile. Path: {policyPath}");
                    return new StatusCodeResult(400);
                }
            }

            return await GetPublishResponse(response);
        }

        public async Task<ServiceResource> GetResource(string id, string env)
        {
            string resourceUrl;

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                resourceUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/{id}";
            }
            else
            {
                resourceUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/{id}/policy";
            }

            HttpResponseMessage getResourceResponse = await _httpClient.GetAsync(resourceUrl);
            if (getResourceResponse.StatusCode.Equals(HttpStatusCode.OK))
            {
                return await getResourceResponse.Content.ReadAsAsync<ServiceResource>();
            }

            return null;
        }

        public async Task<XacmlPolicy> GetResourcePolicy(string id, string env)
        {
            string policyUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/{id}/policy";

            HttpResponseMessage response = await _httpClient.GetAsync(policyUrl);
            response.EnsureSuccessStatusCode();

            string contentString = await response.Content.ReadAsStringAsync();
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(contentString)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        public async Task<List<ServiceResource>> GetResources(string env)
        {
            string resourceUrl;

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                resourceUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/search/";
            }
            else
            {
                resourceUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/search/";
            }

            HttpResponseMessage getResourceResponse = await _httpClient.GetAsync(resourceUrl);
            if (getResourceResponse.StatusCode.Equals(HttpStatusCode.OK))
            {
                return await getResourceResponse.Content.ReadAsAsync<List<ServiceResource>>();
            }

            return null;
        }

        /// <summary>
        ///     Get resource list
        /// </summary>
        /// <returns>List of all resources</returns>
        public async Task<List<ServiceResource>> GetResourceList(string env, bool includeAltinn2, bool includeApps = false)
        {

            string endpointUrl;

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                endpointUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/resourcelist/?includeApps={includeApps}&includeAltinn2={includeAltinn2}";
            }
            else
            {
                endpointUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/resourcelist/?includeApps={includeApps}&includeAltinn2={includeAltinn2}";
            }

            JsonSerializerOptions options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            };
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(endpointUrl);
                string content = await response.Content.ReadAsStringAsync();

                if (response.StatusCode == HttpStatusCode.OK)
                {
                    return JsonSerializer.Deserialize<List<ServiceResource>>(content, options);
                }

                HttpStatusException error = JsonSerializer.Deserialize<HttpStatusException>(content, options);
                throw error;
            }
            catch (Exception ex) when (ex is not HttpStatusException)
            {
                throw;
            }
        }

        public async Task<ServiceResource> GetServiceResourceFromService(string serviceCode, int serviceEditionCode, string environment)
        {
            string resourceRegisterUrl = GetResourceRegistryBaseUrl(environment);
            string url = $"{resourceRegisterUrl}/resourceregistry/api/v1/altinn2export/resource/?serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}";

            HttpResponseMessage response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsAsync<ServiceResource>();
        }

        public async Task<XacmlPolicy> GetXacmlPolicy(string serviceCode, int serviceEditionCode, string identifier, string environment)
        {
            string resourceRegisterUrl = GetResourceRegistryBaseUrl(environment);
            string url = $"{resourceRegisterUrl}/resourceregistry/api/v1/altinn2export/policy/?serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}&resourceIdentifier={identifier}";

            HttpResponseMessage response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string contentString = await response.Content.ReadAsStringAsync();
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(contentString)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        public async Task<DelegationCountOverview> GetDelegationCount(string serviceCode, int serviceEditionCode, string environment)
        {
            _maskinportenClientDefinition.ClientSettings = GetMaskinportenIntegrationSettings(environment);
            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();

            string resourceRegisterUrl = GetResourceRegistryBaseUrl(environment);
            string url = $"{resourceRegisterUrl}/resourceregistry/api/v1/altinn2export/delegationcount/?serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}";

            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);

            using HttpResponseMessage response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsAsync<DelegationCountOverview>();
        }

        public async Task<ActionResult> StartMigrateDelegations(ExportDelegationsRequestBE delegationRequest, string environment)
        {
            _maskinportenClientDefinition.ClientSettings = GetMaskinportenIntegrationSettings(environment);
            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();

            string resourceRegisterUrl = GetResourceRegistryBaseUrl(environment);

            // set service expired
            string setServiceEditionExpiredUrl = $"{resourceRegisterUrl}/resourceregistry/api/v1/altinn2export/setserviceeditionexpired?externalServiceCode={delegationRequest.ServiceCode}&externalServiceEditionCode={delegationRequest.ServiceEditionCode}";

            using HttpRequestMessage setServiceEditionExpiredRequest = new HttpRequestMessage(HttpMethod.Get, setServiceEditionExpiredUrl);
            setServiceEditionExpiredRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);

            using HttpResponseMessage setServiceEditionExpiredResponse = await _httpClient.SendAsync(setServiceEditionExpiredRequest);
            setServiceEditionExpiredResponse.EnsureSuccessStatusCode();

            // set batch start time
            string migrateDelegationsUrl = $"{resourceRegisterUrl}/resourceregistry/api/v1/altinn2export/exportdelegations";
            delegationRequest.DateTimeForExport = DateTimeOffset.UtcNow.AddMinutes(10); // set batch start time 10 minutes from now
            string serializedContent = JsonSerializer.Serialize(delegationRequest, _serializerOptions);
            using HttpRequestMessage migrateDelegationsRequest = new HttpRequestMessage()
            {
                RequestUri = new Uri(migrateDelegationsUrl),
                Method = HttpMethod.Post,
                Content = new StringContent(serializedContent, Encoding.UTF8, "application/json"),
            };
            migrateDelegationsRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);

            using HttpResponseMessage migrateDelegationsResponse = await _httpClient.SendAsync(migrateDelegationsRequest);
            migrateDelegationsResponse.EnsureSuccessStatusCode();

            return new StatusCodeResult(202);
        }

        // RRR
        public async Task<AccessList> GetAccessList(
            string org,
            string identifier,
            string env
        )
        {
            // get access list
            string listUrl = $"/{org}/{identifier}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Get, listUrl);

            HttpResponseMessage getAccessListsResponse = await _httpClient.SendAsync(request);
            getAccessListsResponse.EnsureSuccessStatusCode();
            AccessList responseList = await getAccessListsResponse.Content.ReadAsAsync<AccessList>();
            responseList.Etag = getAccessListsResponse.Headers.ETag?.ToString();
            return responseList;
        }

        public async Task<PagedAccessListMembersResponse> GetAccessListMembers(
            string org,
            string identifier,
            string env,
            string page
        )
        {
            string listMembersUrl = string.IsNullOrEmpty(page) ? $"/{org}/{identifier}/members" : $"/{GetAccessListPageUrlSuffix(page, env)}";
            HttpRequestMessage membersRequest = await CreateAccessListRequest(env, HttpMethod.Get, listMembersUrl);

            HttpResponseMessage geMembersResponse = await _httpClient.SendAsync(membersRequest);
            geMembersResponse.EnsureSuccessStatusCode();

            string membersResponseContent = await geMembersResponse.Content.ReadAsStringAsync();
            AccessListMembersDto membersDto = JsonSerializer.Deserialize<AccessListMembersDto>(
                membersResponseContent,
                _serializerOptions
            );

            IEnumerable<string> partyIds = membersDto.Data.Select(x => x.Identifiers.OrganizationNumber);
            List<AccessListMember> members = new List<AccessListMember>();

            const int BATCH_LOOKUP_SIZE = 190; // url cannot exceed 2048 characters, if there are many members, lookup names from brreg in batches
            // lookup party names
            if (partyIds.Any())
            {
                for (int i = 0; i < partyIds.Count(); i += BATCH_LOOKUP_SIZE)
                {
                    IEnumerable<string> batchPartyIds = partyIds.Where((x, index) => index >= i && index < (i + BATCH_LOOKUP_SIZE));
                    string brregUrl = "https://data.brreg.no/enhetsregisteret/api/{0}?organisasjonsnummer={1}&size=10000";
                    string partyIdsString = string.Join(",", batchPartyIds);
                    List<BrregParty>[] parties = await Task.WhenAll(
                        GetBrregParties(string.Format(brregUrl, "enheter", partyIdsString)),
                        GetBrregParties(string.Format(brregUrl, "underenheter", partyIdsString))
                    );

                    members.AddRange(batchPartyIds.Select(orgnr =>
                    {
                        string enhetOrgName = parties[0].Find(enhet => enhet.Organisasjonsnummer.Equals(orgnr))?.Navn;
                        string underenhetOrgName = parties[1].Find(enhet => enhet.Organisasjonsnummer.Equals(orgnr))?.Navn;
                        AccessListMember member = new()
                        {
                            OrgNr = orgnr,
                            OrgName = enhetOrgName ?? underenhetOrgName ?? "",
                            IsSubParty = underenhetOrgName != null
                        };
                        return member;
                    }));
                }
            }

            return new PagedAccessListMembersResponse()
            {
                Data = members,
                NextPage = membersDto.Links?.Next,
                Etag = geMembersResponse.Headers.ETag?.ToString()
            };
        }

        public async Task<PagedAccessListResponse> GetAccessLists(
            string org,
            string env,
            string page
        )
        {
            string listUrl = string.IsNullOrEmpty(page) ? $"/{org}" : $"/{GetAccessListPageUrlSuffix(page, env)}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Get, listUrl);

            HttpResponseMessage getAccessListsResponse = await _httpClient.SendAsync(request);
            getAccessListsResponse.EnsureSuccessStatusCode();
            AccessListInfoDtoPaginated res = await getAccessListsResponse.Content.ReadAsAsync<AccessListInfoDtoPaginated>();
            return new PagedAccessListResponse()
            {
                Data = res.Data,
                NextPage = res.Links?.Next
            };

        }

        public async Task<PagedAccessListResponse> GetResourceAccessLists(
            string org,
            string resourceId,
            string env,
            string page
        )
        {
            string listUrl = $"/{org}?include=resources&resource={resourceId}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Get, listUrl);

            HttpResponseMessage getAccessListsResponse = await _httpClient.SendAsync(request);
            getAccessListsResponse.EnsureSuccessStatusCode();
            AccessListInfoDtoPaginated res = await getAccessListsResponse.Content.ReadAsAsync<AccessListInfoDtoPaginated>();

            return new PagedAccessListResponse()
            {
                Data = res.Data,
                NextPage = res.Links?.Next
            };
        }

        // RRR write
        public async Task<ActionResult<AccessList>> CreateAccessList(string org, string env, AccessList accessList)
        {
            CreateAccessListModel payload = new()
            {
                Name = accessList.Name,
                Description = accessList.Description
            };
            string serviceResourceString = JsonSerializer.Serialize(payload, _serializerOptions);
            string createUrl = $"/{org}/{accessList.Identifier}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Put, createUrl, serviceResourceString);
            request.Headers.IfNoneMatch.ParseAdd("*");

            HttpResponseMessage response = await _httpClient.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.PreconditionFailed)
            {
                return new StatusCodeResult(412);
            }
            response.EnsureSuccessStatusCode();
            AccessList createdList = await response.Content.ReadAsAsync<AccessList>();
            createdList.Etag = response.Headers.ETag?.ToString();
            return createdList;
        }

        public async Task<ActionResult> DeleteAccessList(string org, string identifier, string env, string etag)
        {
            string listUrl = $"/{org}/{identifier}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Delete, listUrl, "", etag);
            HttpResponseMessage deleteAccessListResponse = await _httpClient.SendAsync(request);
            if (deleteAccessListResponse.StatusCode == HttpStatusCode.PreconditionFailed)
            {
                return new StatusCodeResult(412);
            }
            deleteAccessListResponse.EnsureSuccessStatusCode();
            return new StatusCodeResult((int)deleteAccessListResponse.StatusCode);
        }

        public async Task<ActionResult<AccessList>> UpdateAccessList(
            string org,
            string identifier,
            string env,
            AccessList accessList
        )
        {
            string listUrl = $"/{org}/{identifier}";
            string serviceResourceString = JsonSerializer.Serialize(accessList, _serializerOptions);
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Put, listUrl, serviceResourceString, accessList.Etag);

            HttpResponseMessage response = await _httpClient.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.PreconditionFailed)
            {
                return new StatusCodeResult(412);
            }
            response.EnsureSuccessStatusCode();
            AccessList resonseContent = await response.Content.ReadAsAsync<AccessList>();
            resonseContent.Etag = response.Headers.ETag?.ToString();
            return resonseContent;
        }

        public async Task<ActionResult> AddAccessListMembers(
            string org,
            string identifier,
            AccessListOrganizationNumbers members,
            string env
        )
        {
            UpdateAccessListMemberDto newListMembers = PrefixAccessListMembersData(members);
            string listUrl = $"/{org}/{identifier}/members";
            string addMemberPayloadString = JsonSerializer.Serialize(newListMembers, _serializerOptions);
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Post, listUrl, addMemberPayloadString, members.Etag);

            HttpResponseMessage response = await _httpClient.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.BadRequest)
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                try
                {
                    AltinnProblemDetails problems = JsonSerializer.Deserialize<AltinnProblemDetails>(responseContent);
                    string content = JsonSerializer.Serialize(problems, _serializerOptions);
                    return new ObjectResult(content) { StatusCode = (int)response.StatusCode };
                }
                catch (Exception)
                {
                    Console.WriteLine("error");
                    return new ContentResult() { Content = responseContent, StatusCode = (int)response.StatusCode };
                }
            }
            else if (response.StatusCode == HttpStatusCode.PreconditionFailed)
            {
                return new StatusCodeResult(412);
            }
            response.EnsureSuccessStatusCode();
            return new ObjectResult(new HeaderEtag() { Etag = response.Headers.ETag?.ToString() }) { StatusCode = (int)response.StatusCode };
        }

        public async Task<ActionResult> RemoveAccessListMembers(
            string org,
            string identifier,
            AccessListOrganizationNumbers members,
            string env
        )
        {
            UpdateAccessListMemberDto deleteListMembers = PrefixAccessListMembersData(members);
            string listUrl = $"/{org}/{identifier}/members";
            string removeMemberPayloadString = JsonSerializer.Serialize(deleteListMembers, _serializerOptions);
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Delete, listUrl, removeMemberPayloadString, members.Etag);

            HttpResponseMessage response = await _httpClient.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.BadRequest)
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                try
                {
                    AltinnProblemDetails problems = JsonSerializer.Deserialize<AltinnProblemDetails>(responseContent);
                    string content = JsonSerializer.Serialize(problems, _serializerOptions);
                    return new ObjectResult(content) { StatusCode = (int)response.StatusCode };
                }
                catch (Exception)
                {
                    return new ContentResult() { Content = responseContent, StatusCode = (int)response.StatusCode };
                }
            }
            else if (response.StatusCode == HttpStatusCode.PreconditionFailed)
            {
                return new StatusCodeResult(412);
            }
            response.EnsureSuccessStatusCode();
            return new ObjectResult(new HeaderEtag() { Etag = response.Headers.ETag?.ToString() }) { StatusCode = (int)response.StatusCode };
        }

        public async Task<HttpStatusCode> AddResourceAccessList(
            string org,
            string resourceId,
            string listId,
            string env
        )
        {
            UpsertAccessListResourceConnectionDto data = new UpsertAccessListResourceConnectionDto();
            data.Actions = new List<string>(); // actions are not used yet
            string actionsContent = JsonSerializer.Serialize(data, _serializerOptions);
            string addUrl = $"/{org}/{listId}/resource-connections/{resourceId}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Put, addUrl, actionsContent);

            HttpResponseMessage response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return response.StatusCode;
        }

        public async Task<HttpStatusCode> RemoveResourceAccessList(
            string org,
            string resourceId,
            string listId,
            string env
        )
        {
            string removeUrl = $"/{org}/{listId}/resource-connections/{resourceId}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Delete, removeUrl);

            HttpResponseMessage removeResourceAccessListResponse = await _httpClient.SendAsync(request);
            removeResourceAccessListResponse.EnsureSuccessStatusCode();
            return removeResourceAccessListResponse.StatusCode;
        }

        public async Task<List<SubjectResources>> GetSubjectResources(List<string> subjects, string env)
        {
            string resourceRegisterUrl = GetResourceRegistryBaseUrl(env);
            string url = $"{resourceRegisterUrl}/resourceregistry/api/v1/resource/bysubjects";

            string serializedContent = JsonSerializer.Serialize(subjects, _serializerOptions);
            using HttpRequestMessage getSubjectResourcesRequest = new HttpRequestMessage()
            {
                RequestUri = new Uri(url),
                Method = HttpMethod.Post,
                Content = new StringContent(serializedContent, Encoding.UTF8, "application/json"),
            };
            using HttpResponseMessage response = await _httpClient.SendAsync(getSubjectResourcesRequest);
            response.EnsureSuccessStatusCode();

            SubjectResourcesDto responseContent = await response.Content.ReadAsAsync<SubjectResourcesDto>();
            return responseContent.Data;
        }

        public async Task<List<ConsentTemplate>> GetConsentTemplates(string org)
        {
            // Temp location. Will be moved to CDN
            string url = "https://raw.githubusercontent.com/Altinn/altinn-studio-docs/master/content/authorization/architecture/resourceregistry/consent_templates.json";

            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();
                string consentTemplatesString = await response.Content.ReadAsStringAsync();
                List<ConsentTemplate> consentTemplates = JsonSerializer.Deserialize<List<ConsentTemplate>>(consentTemplatesString, _serializerOptions);
                // Filter out templates not permitted for this service owner
                consentTemplates = [.. consentTemplates
                    .Where(t =>
                        t.RestrictedToServiceOwners == null
                        || t.RestrictedToServiceOwners.Count == 0
                        || t.RestrictedToServiceOwners.Contains(org, StringComparer.OrdinalIgnoreCase))];
                return consentTemplates;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving consent templates", ex);
            }
        }

        private async Task<List<BrregParty>> GetBrregParties(string url)
        {
            HttpResponseMessage enheterResponse = await _httpClient.GetAsync(url);
            enheterResponse.EnsureSuccessStatusCode();
            string responseContent = await enheterResponse.Content.ReadAsStringAsync();
            BrregPartyResultSet results = JsonSerializer.Deserialize<BrregPartyResultSet>(
                responseContent,
                _serializerOptions
            );

            return results.Embedded != null ? results.Embedded.Parties ?? results.Embedded.SubParties : new List<BrregParty>();
        }

        private string GetAccessListPageUrlSuffix(string pageUrl, string env)
        {
            string accessListBaseUrl = !env.ToLower().Equals("dev")
                ? $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryAccessListUrl}"
                : $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryAccessListUrl}";

            if (!pageUrl.StartsWith(accessListBaseUrl))
            {
                throw new Exception("Cannot load page data from another origin");
            }

            return pageUrl.Replace(accessListBaseUrl, "");
        }

        private async Task<HttpRequestMessage> CreateAccessListRequest(string env, HttpMethod verb, string relativeUrl, string serializedContent = null, string eTag = null)
        {
            _maskinportenClientDefinition.ClientSettings = GetMaskinportenIntegrationSettings(env);
            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();
            //Checks if not tested locally by passing dev as env parameter
            string baseUrl = !env.ToLower().Equals("dev")
                ? $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryAccessListUrl}"
                : $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryAccessListUrl}";

            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}{relativeUrl}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);
            if (!string.IsNullOrEmpty(eTag))
            {
                request.Headers.IfMatch.ParseAdd(eTag);
            }
            request.Method = verb;
            if (serializedContent != null)
            {
                request.Content = new StringContent(serializedContent, Encoding.UTF8, "application/json");
            }

            return request;
        }

        private static UpdateAccessListMemberDto PrefixAccessListMembersData(AccessListOrganizationNumbers members)
        {
            return new UpdateAccessListMemberDto()
            {
                Data = members.Data.Select(orgnr => $"urn:altinn:organization:identifier-no:{orgnr}").ToList()
            };
        }
        // RRR end


        private async Task<TokenResponse> GetBearerTokenFromMaskinporten()
        {
            return await _maskinPortenService.GetToken(_maskinportenClientDefinition.ClientSettings.EncodedJwk, _maskinportenClientDefinition.ClientSettings.Environment, _maskinportenClientDefinition.ClientSettings.ClientId, _maskinportenClientDefinition.ClientSettings.Scope, _maskinportenClientDefinition.ClientSettings.Resource, _maskinportenClientDefinition.ClientSettings.ConsumerOrgNo);
        }

        private async Task<ActionResult> GetPublishResponse(HttpResponseMessage response)
        {
            if (response.StatusCode == HttpStatusCode.Created)
            {
                return new StatusCodeResult(201);
            }
            else if (response.StatusCode == HttpStatusCode.Conflict)
            {
                return new StatusCodeResult(409);
            }
            else if (response.StatusCode == HttpStatusCode.BadRequest)
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                try
                {
                    ValidationProblemDetails problems = JsonSerializer.Deserialize<ValidationProblemDetails>(responseContent);
                    return new ObjectResult(problems) { StatusCode = (int)response.StatusCode };
                }
                catch (Exception)
                {
                    return new ContentResult() { Content = responseContent, StatusCode = (int)response.StatusCode };
                }
            }
            else if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                return new ContentResult() { Content = responseContent, StatusCode = (int)HttpStatusCode.Forbidden };
            }
            else
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                try
                {
                    ProblemDetails problems = JsonSerializer.Deserialize<ProblemDetails>(responseContent);
                    return new ObjectResult(problems) { StatusCode = (int)response.StatusCode };
                }
                catch (Exception)
                {
                    return new ContentResult() { Content = responseContent, StatusCode = (int)response.StatusCode };
                }
            }
        }

        private string GetResourceRegistryBaseUrl(string env)
        {
            if (!_resourceRegistrySettings.TryGetValue(env, out ResourceRegistryEnvironmentSettings envSettings))
            {
                throw new ArgumentException($"Invalid environment. Missing environment config for {env}");
            }

            return envSettings.ResourceRegistryEnvBaseUrl;
        }

        private MaskinportenClientSettings GetMaskinportenIntegrationSettings(string env)
        {
            string maskinportenEnvironment = env == "prod" ? "prod" : "test";
            if (!_maskinportenIntegrationSettings.TryGetValue(maskinportenEnvironment, out MaskinportenClientSettings maskinportenClientSettings))
            {
                throw new ArgumentException($"Invalid environment. Missing Maskinporten config for {env}");
            }

            return maskinportenClientSettings;
        }
    }
}
