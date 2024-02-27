using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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

        // Test data until register is available from Altinn 3
        private static readonly Dictionary<string, List<ListMember>> _listMembers = new Dictionary<string, List<ListMember>>();

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
                tokenResponse = await _maskinPortenService.ExchangeToAltinnToken(tokenResponse, env);
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
                MultipartFormDataContent content = new MultipartFormDataContent();

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
                string responseContent = await getResourceResponse.Content.ReadAsStringAsync();
                ServiceResource res = JsonSerializer.Deserialize<ServiceResource>(responseContent, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                return res;
            }

            return null;
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
                string responseContent = await getResourceResponse.Content.ReadAsStringAsync();
                List<ServiceResource> res = JsonSerializer.Deserialize<List<ServiceResource>>(responseContent, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                return res;
            }

            return null;
        }

        /// <summary>
        ///     Get resource list
        /// </summary>
        /// <returns>List of all resources</returns>
        public async Task<List<ServiceResource>> GetResourceList(string env)
        {

            string endpointUrl;

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                endpointUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/resourcelist/";
            }
            else
            {
                endpointUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/resourcelist/";
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

            string contentString = await response.Content.ReadAsStringAsync();
            ServiceResource serviceResource = JsonSerializer.Deserialize<ServiceResource>(contentString, _serializerOptions);
            return serviceResource;
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

        // RRR
        public async Task<AccessList> GetAccessList(
            string org,
            string identifier,
            string env
        )
        {
            string listUrl = $"/{org}/{identifier}?include=members";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Get, listUrl);

            HttpResponseMessage getAccessListsResponse = await _httpClient.SendAsync(request);
            getAccessListsResponse.EnsureSuccessStatusCode();
            string responseContent = await getAccessListsResponse.Content.ReadAsStringAsync();
            AccessList accessList = JsonSerializer.Deserialize<AccessList>(responseContent, _serializerOptions);

            _listMembers.TryGetValue(identifier, out List<ListMember> list);

            IEnumerable<string> partyIds = (list ?? new List<ListMember>()).Select(x => x.Identifiers.OrganizationNumber);

            // lookup party names
            if (partyIds.Any())
            {
                string brregUrl = "https://data.brreg.no/enhetsregisteret/api/{0}?organisasjonsnummer={1}&size=10000";
                string partyIdsString = string.Join(",", partyIds);
                List<BrregParty>[] parties = await Task.WhenAll(
                    GetBrregParties(string.Format(brregUrl, "enheter", partyIdsString)),
                    GetBrregParties(string.Format(brregUrl, "underenheter", partyIdsString))
                );

                accessList.Members = partyIds.Select(orgnr =>
                {
                    string enhetOrgName = parties[0].Find(enhet => enhet.Organisasjonsnummer.Equals(orgnr))?.Navn;
                    string underenhetOrgName = parties[1].Find(enhet => enhet.Organisasjonsnummer.Equals(orgnr))?.Navn;
                    AccessListMember member = new()
                    {
                        OrgNr = orgnr,
                        OrgName = enhetOrgName ?? underenhetOrgName ?? "",
                        IsSubParty = enhetOrgName == null
                    };
                    return member;
                });
            }
            return accessList;
        }

        public async Task<PagedAccessListResponse> GetAccessLists(string org,
            string env, int? page
        )
        {
            string listUrl = $"/{org}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Get, listUrl);

            HttpResponseMessage getAccessListsResponse = await _httpClient.SendAsync(request);
            getAccessListsResponse.EnsureSuccessStatusCode();
            string responseContent = await getAccessListsResponse.Content.ReadAsStringAsync();
            AccessListInfoDtoPaginated res = JsonSerializer.Deserialize<AccessListInfoDtoPaginated>(responseContent, _serializerOptions);
            return new PagedAccessListResponse()
            {
                Data = res.Data,
                NextPage = GetNextPage(res)
            };

        }

        public async Task<PagedAccessListResponse> GetResourceAccessLists(string org,
            string resourceId,
            string env,
            int? page
        )
        {
            string listUrl = $"/{org}?include=resources&resource={resourceId}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Get, listUrl);

            HttpResponseMessage getAccessListsResponse = await _httpClient.SendAsync(request);
            getAccessListsResponse.EnsureSuccessStatusCode();
            string responseContent = await getAccessListsResponse.Content.ReadAsStringAsync();
            AccessListInfoDtoPaginated res = JsonSerializer.Deserialize<AccessListInfoDtoPaginated>(responseContent, _serializerOptions);
            return new PagedAccessListResponse()
            {
                Data = res.Data,
                NextPage = GetNextPage(res)
            };
        }

        // RRR write
        public async Task<AccessList> CreateAccessList(string org, string env, AccessList accessList)
        {
            CreateAccessListModel payload = new CreateAccessListModel()
            {
                Name = accessList.Name,
                Description = accessList.Description
            };
            string serviceResourceString = JsonSerializer.Serialize(payload, _serializerOptions);
            string createUrl = $"/{org}/{accessList.Identifier}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Put, createUrl, serviceResourceString);

            HttpResponseMessage response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            string responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AccessList>(responseContent, _serializerOptions);
        }

        public async Task<HttpStatusCode> DeleteAccessList(string org, string identifier, string env)
        {
            string listUrl = $"/{org}/{identifier}";
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Delete, listUrl);

            HttpResponseMessage deleteAccessListResponse = await _httpClient.SendAsync(request);
            deleteAccessListResponse.EnsureSuccessStatusCode();
            return deleteAccessListResponse.StatusCode;
        }

        public async Task<AccessList> UpdateAccessList(
            string org,
            string identifier,
            string env,
            AccessList accessList
        )
        {
            string listUrl = $"/{org}/{identifier}";
            string serviceResourceString = JsonSerializer.Serialize(accessList, _serializerOptions);
            HttpRequestMessage request = await CreateAccessListRequest(env, HttpMethod.Put, listUrl, serviceResourceString);

            HttpResponseMessage response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            string responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AccessList>(responseContent, _serializerOptions);
        }

        public async Task<HttpStatusCode> AddAccessListMember(string org,
            string identifier,
            string memberOrgnr,
            string env
        )
        {
            List<ListMember> list;
            ListMember newMember = new ListMember()
            {
                Id = new Guid().ToString(),
                Identifiers = new() { OrganizationNumber = memberOrgnr }
            };
            if (_listMembers.TryGetValue(identifier, out list))
            {
                list.Add(newMember);
            }
            else
            {
                _listMembers.Add(identifier, new List<ListMember>() { newMember });
            }

            return HttpStatusCode.OK;
        }

        public async Task<HttpStatusCode> RemoveAccessListMember(
            string org,
            string identifier,
            string memberOrgnr,
            string env
        )
        {
            List<ListMember> list;
            if (_listMembers.TryGetValue(identifier, out list))
            {
                list.RemoveAll(item => item.Identifiers.OrganizationNumber == memberOrgnr);
            }

            return HttpStatusCode.OK;
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

        private int? GetNextPage(AccessListInfoDtoPaginated dto)
        {
            if (dto == null || dto.Links.Next == null)
            {
                return null;
            }

            string pattern = @"page=(\d+)";
            Regex regex = new Regex(pattern);
            Match matches = regex.Match(dto.Links.Next);
            return int.Parse(matches.Groups[1].Value);
        }

        private async Task<HttpRequestMessage> CreateAccessListRequest(string env, HttpMethod verb, string relativeUrl, string serializedContent = null)
        {
            _maskinportenClientDefinition.ClientSettings = GetMaskinportenIntegrationSettings(env);
            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();
            string baseUrl;

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                baseUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryAccessListUrl}";
            }
            else
            {
                baseUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryAccessListUrl}";
            }

            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}{relativeUrl}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);
            request.Method = verb;
            if (serializedContent != null)
            {
                request.Content = new StringContent(serializedContent, Encoding.UTF8, "application/json"); ;
            }

            return request;
        }

        private class ListMemberIdentifier
        {
            public string OrganizationNumber { get; set; }
        }

        private class ListMember
        {
            public string Id { get; set; }
            public string Since { get; set; }
            public ListMemberIdentifier Identifiers { get; set; }
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
