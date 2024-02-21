using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class ListMemberIdentifier
    {
        public string OrganizationNumber { get; set; }
    }

    public class ListMember
    {
        public string Id { get; set; }
        public string Since { get; set; }
        public ListMemberIdentifier Identifiers { get; set; }
    }

    public class ResourceAccessListService : IResourceAccessListService
    {
        private string _accessListUrl = "/resourceregistry/api/v1/access-lists/";
        private readonly HttpClient _httpClient;

        private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };

        private readonly static List<ListMember> _listMembers = new List<ListMember>() {
            new()
            {
                Id = "urn:altinn:Access:72439f71-2280-499c-bbf4-d00140053e08",
                Identifiers = new() { OrganizationNumber = "991825827" }
            },
            new()
            {
                Id = "urn:altinn:Access:db8942da-6367-487c-af6b-44af672081d9",
                Identifiers = new() { OrganizationNumber = "997532422" }
            },
            new()
            {
                Id = "urn:altinn:Access:81ba70dc-d6be-4e21-af41-a878283ac2a7",
                Identifiers = new() { OrganizationNumber = "891611862" }
            },
            new()
            {
                Id = "urn:altinn:Access:fb6984b1-182c-4764-b9ed-d3e6ea63a40a",
                Identifiers = new() { OrganizationNumber = "111611111" }
            }
        };


        public ResourceAccessListService() { }

        public ResourceAccessListService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            string token = "<insert>";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        public async Task<AccessList> CreateAccessList(string org, string env, AccessList accessList)
        {
            string createUrl = $"{GetResourceRegistryBaseUrl(env)}{_accessListUrl}/{org}/{accessList.Identifier}";
            CreateAccessListModel payload = new CreateAccessListModel()
            {
                Name = accessList.Name,
                Description = accessList.Description
            };
            string serviceResourceString = JsonSerializer.Serialize(payload, _serializerOptions);
            HttpResponseMessage response = await _httpClient.PutAsync(createUrl, new StringContent(serviceResourceString, Encoding.UTF8, "application/json"));
            response.EnsureSuccessStatusCode();
            string responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AccessList>(responseContent, _serializerOptions);
        }

        public async Task<AccessList> GetAccessList(
            string org,
            string identifier,
            string env
        )
        {
            string listUrl = $"{GetResourceRegistryBaseUrl(env)}{_accessListUrl}/{org}/{identifier}?include=members";
            HttpResponseMessage getAccessListsResponse = await _httpClient.GetAsync(listUrl);
            getAccessListsResponse.EnsureSuccessStatusCode();

            string responseContent = await getAccessListsResponse.Content.ReadAsStringAsync();
            AccessList accessList = JsonSerializer.Deserialize<AccessList>(responseContent, _serializerOptions);
            IEnumerable<string> partyIds = _listMembers.Select(x => x.Identifiers.OrganizationNumber);

            // lookup party names
            if (partyIds.Any())
            {
                string brregUrl = "https://data.brreg.no/enhetsregisteret/api/{0}?organisasjonsnummer={1}&size=10000";
                string partyIdsString = string.Join(",", partyIds);
                BrregOrganizationResultSet[] result = await Task.WhenAll(
                    GetBrregParties(string.Format(brregUrl, "enheter", partyIdsString)),
                    GetBrregParties(string.Format(brregUrl, "underenheter", partyIdsString))
                );

                // TODO: handle error from brreg
                accessList.Members = partyIds.Select(orgnr =>
                {
                    string enhetOrgName = result[0]
                        .Embedded
                        .Enheter
                        ?.Find(enhet => enhet.Organisasjonsnummer.Equals(orgnr))
                        ?.Navn;
                    string underenhetOrgName = result[1]
                        .Embedded
                        .Underenheter
                        ?.Find(enhet => enhet.Organisasjonsnummer.Equals(orgnr))
                        ?.Navn;
                    AccessListMember member = new()
                    {
                        OrgNr = orgnr,
                        OrgName = enhetOrgName ?? underenhetOrgName,
                        IsSubParty = enhetOrgName == null
                    };
                    return member;
                });
            }
            return accessList;
        }

        private async Task<BrregOrganizationResultSet> GetBrregParties(string url)
        {
            HttpResponseMessage enheterResponse = await _httpClient.GetAsync(url);
            string responseContent = await enheterResponse.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<BrregOrganizationResultSet>(
                responseContent,
                _serializerOptions
            );
        }

        private string GetResourceRegistryBaseUrl(string env)
        {
            return "https://platform.at22.altinn.cloud";
            /*
            if (!_resourceRegistrySettings.TryGetValue(env, out ResourceRegistryEnvironmentSettings envSettings))
            {
                throw new ArgumentException($"Invalid environment. Missing environment config for {env}");
            }

            return envSettings.ResourceRegistryEnvBaseUrl;*/
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

        public async Task<PagedAccessListResponse> GetAccessLists(string org,
            string env, int page
        )
        {
            string listUrl = $"{GetResourceRegistryBaseUrl(env)}{_accessListUrl}/{org}";
            HttpResponseMessage getAccessListsResponse = await _httpClient.GetAsync(listUrl);
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
            int page
        )
        {
            string listUrl = $"{GetResourceRegistryBaseUrl(env)}{_accessListUrl}/{org}?include=resources&resource={resourceId}";
            HttpResponseMessage getAccessListsResponse = await _httpClient.GetAsync(listUrl);
            getAccessListsResponse.EnsureSuccessStatusCode();
            string responseContent = await getAccessListsResponse.Content.ReadAsStringAsync();
            AccessListInfoDtoPaginated res = JsonSerializer.Deserialize<AccessListInfoDtoPaginated>(responseContent, _serializerOptions);
            return new PagedAccessListResponse()
            {
                Data = res.Data,
                NextPage = GetNextPage(res)
            };
        }

        public async Task<bool> DeleteAccessList(string org, string identifier, string env)
        {
            string listUrl = $"{GetResourceRegistryBaseUrl(env)}{_accessListUrl}{org}/{identifier}";
            HttpResponseMessage deleteAccessListResponse = await _httpClient.DeleteAsync(listUrl);
            return deleteAccessListResponse.IsSuccessStatusCode;
        }

        public async Task<AccessList> UpdateAccessList(
            string org,
            string identifier,
            string env,
            IEnumerable<AccessListPatch> accessListPatch
        )
        {
            string createUrl = $"{GetResourceRegistryBaseUrl(env)}{_accessListUrl}/{org}/{identifier}";
            AccessList data = new AccessList()
            {
                Identifier = identifier,
                Name = accessListPatch.First().Value
            };
            string serviceResourceString = JsonSerializer.Serialize(data, _serializerOptions);

            // TODO: send kun name og description som payload
            HttpResponseMessage response = await _httpClient.PutAsync(createUrl, new StringContent(serviceResourceString, Encoding.UTF8, "application/json"));
            response.EnsureSuccessStatusCode();
            string responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AccessList>(responseContent, _serializerOptions);
            /*
            // valid operations: replace name and description, remove description
            bool isValidNameOperation = accessListPatch.First().Op == "replace" && accessListPatch.First().Path == "/name";
            bool isValidDescriptionOperation = accessListPatch.First().Path == "/description" && (accessListPatch.First().Op is "replace" or "remove");
            bool isValidOperation = isValidNameOperation || isValidDescriptionOperation;

            return isValidOperation ? new StatusCodeResult(200) : new ObjectResult("Invalid patch") { StatusCode = 400 };
            */
        }

        public async Task<bool> AddAccessListMember(string org,
            string identifier,
            string memberOrgnr,
            string env
        )
        {
            // TODO
            return true;
        }

        public async Task<bool> RemoveAccessListMember(
            string org,
            string identifier,
            string memberOrgnr,
            string env
        )
        {
            // TODO
            return true;
        }

        public async Task<bool> AddResourceAccessList(
            string org,
            string resourceId,
            string listId,
            string env
        )
        {
            UpsertAccessListResourceConnectionDto data = new UpsertAccessListResourceConnectionDto();
            data.Actions = new List<string>(); // actions are not used yet
            string addUrl = $"{GetResourceRegistryBaseUrl(env)}{_accessListUrl}{org}/{listId}/resource-connections/{resourceId}";
            string actionsContent = JsonSerializer.Serialize(data, _serializerOptions);
            HttpResponseMessage response = await _httpClient.PutAsync(addUrl, new StringContent(actionsContent, Encoding.UTF8, "application/json"));
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> RemoveResourceAccessList(
            string org,
            string resourceId,
            string listId,
            string env
        )
        {
            string removeUrl = $"{GetResourceRegistryBaseUrl(env)}{_accessListUrl}{org}/{listId}/resource-connections/{resourceId}";
            HttpResponseMessage removeResourceAccessListResponse = await _httpClient.DeleteAsync(removeUrl);
            return removeResourceAccessListResponse.IsSuccessStatusCode;
        }
    }
}
