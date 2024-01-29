using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

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

    public class ApiListResponse
    {
        public string Identifier { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public IEnumerable<ListMember> Data { get; set; }
    }

    public class ResourceAccessListService : IResourceAccessListService
    {
        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };
        private static List<ApiListResponse> _accessListMockData = new()
        {
            new() {
                Identifier = "godkjente-banker",
                Name = "Godkjente banker",
                Data = new List<ListMember>()
                {
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
                    }
                }
            },
            new()
            {
                Identifier = "sentral-godkjenning",
                Name = "Sentral godkjenning",
                Data = new List<ListMember>()
                {
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
                }
            },
            new()
            {
                Identifier = "salgsmelding",
                Name = "Salgsmelding",
                Data = new List<ListMember>()
                {
                    new()
                    {
                        Id = "urn:altinn:Access:72439f71-2280-499c-bbf4-d00140053e08",
                        Identifiers = new() { OrganizationNumber = "991825827" }
                    },
                    new()
                    {
                        Id = "urn:altinn:Access:81ba70dc-d6be-4e21-af41-a878283ac2a7",
                        Identifiers = new() { OrganizationNumber = "891611862" }
                    }
                }
            }
        };

        public ResourceAccessListService() { }

        public ResourceAccessListService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<ActionResult<AccessList>> CreateAccessList(
            string org,
            string env,
            AccessList accessList
        )
        {
            _accessListMockData.Add(new()
            {
                Name = accessList.Name,
                Description = accessList.Description,
                Identifier = accessList.Identifier,
                Data = new List<ListMember>(),
            });
            return accessList;
        }

        public async Task<ActionResult<AccessList>> GetAccessList(
            string org,
            string identifier,
            string env
        )
        {
            ApiListResponse mockDataResponse = _accessListMockData.Find(x => x.Identifier == identifier);
            if (mockDataResponse == null)
            {
                return new ObjectResult("List identifier not found") { StatusCode = 404 };
            }
            AccessList accessList = new()
            {
                Name = mockDataResponse.Name,
                Description = mockDataResponse.Description,
                Identifier = mockDataResponse.Identifier,
            };

            IEnumerable<string> orgnrs = mockDataResponse
                .Data
                .Select(x => x.Identifiers.OrganizationNumber);

            if (orgnrs.Any())
            {
                string brregUrl = "https://data.brreg.no/enhetsregisteret/api/{0}?organisasjonsnummer={1}&size=10000";
                string orgNrsString = string.Join(",", orgnrs);
                BrregOrganizationResultSet[] result = await Task.WhenAll(
                    GetBrregEnheter(string.Format(brregUrl, "enheter", orgNrsString)),
                    GetBrregEnheter(string.Format(brregUrl, "underenheter", orgNrsString))
                );

                accessList.Members = orgnrs.Select(orgnr =>
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

        private async Task<BrregOrganizationResultSet> GetBrregEnheter(string url)
        {
            HttpResponseMessage enheterResponse = await _httpClient.GetAsync(url);
            string responseContent = await enheterResponse.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<BrregOrganizationResultSet>(
                responseContent,
                _serializerOptions
            );
        }

        public async Task<ActionResult<IEnumerable<AccessList>>> GetAccessLists(
            string org,
            string env
        )
        {
            IEnumerable <AccessList> lists = _accessListMockData.Select(list => new AccessList()
            {
                Name = list.Name,
                Description = list.Description,
                Identifier = list.Identifier,
            });
            return lists.ToList();
        }

        public async Task<ActionResult<IEnumerable<ResourceAccessList>>> GetResourceAccessLists(
            string org,
            string resourceId,
            string env
        )
        {
            ResourceAccessList listConnection1 = new ResourceAccessList
            {
                AccessListName = _accessListMockData.ElementAt(0).Name,
                AccessListIdentifier = _accessListMockData.ElementAt(0).Identifier,
                ResourceIdentifier = resourceId,
                Actions = new string[] { "read", "write" }
            };

            ResourceAccessList listConnection2 = new ResourceAccessList
            {
                AccessListName = _accessListMockData.ElementAt(1).Name,
                AccessListIdentifier = _accessListMockData.ElementAt(1).Identifier,
                ResourceIdentifier = resourceId,
                Actions = new string[] { "sign" }
            };

            return new List<ResourceAccessList> { listConnection1, listConnection2 };
        }

        public async Task<ActionResult> DeleteAccessList(string org, string identifier, string env)
        {
            return new StatusCodeResult(204);
        }

        public async Task<ActionResult> UpdateAccessList(
            string org,
            string identifier,
            string env,
            AccessListPatch AccessListPatch
        )
        {
            // valid operations: replace name and description, remove description
            bool isValidNameOperation = AccessListPatch.Op == "replace" && AccessListPatch.Path == "/name";
            bool isValidDescriptionOperation = AccessListPatch.Path == "/description" && (AccessListPatch.Op is "replace" or "remove");
            bool isValidOperation = isValidNameOperation || isValidDescriptionOperation;

            return isValidOperation ? new StatusCodeResult(200) : new ObjectResult("Invalid patch") { StatusCode = 400 };
        }

        public async Task<ActionResult> AddAccessListMember(
            string org,
            string identifier,
            string memberOrgnr,
            string env
        )
        {
            return new StatusCodeResult(201);
        }

        public async Task<ActionResult> RemoveAccessListMember(
            string org,
            string identifier,
            string memberOrgnr,
            string env
        )
        {
            return new StatusCodeResult(204);
        }

        public async Task<ActionResult> AddResourceAccessList(
            string org,
            string resourceId,
            string listId,
            string env
        )
        {
            return new StatusCodeResult(201);
        }

        public async Task<ActionResult> RemoveResourceAccessList(
            string org,
            string resourceId,
            string listId,
            string env
        )
        {
            return new StatusCodeResult(204);
        }
    }
}
