using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IResourceRegistry
    {
        /// <summary>
        /// Pushing ServiceResource to the ResourceRegistry
        /// </summary>
        /// <param name="serviceResource">The ServiceResource that should be added to the ResourceRegistry</param>
        /// <param name="env">The environment the resource should be published to</param>
        /// <param name="policyPath">The policy that goes with the resource</param>
        /// <returns></returns>
        Task<ActionResult> PublishServiceResource(ServiceResource serviceResource, string env, string policyPath = null);

        /// <summary>
        /// 
        /// </summary>
        /// <param name="id"></param>
        /// <param name="env"></param>
        /// <returns></returns>
        Task<ServiceResource> GetResource(string id, string env);

        /// <summary>
        /// Get all resources exposed by resource registry. It includeds apps and Altinn 2 servces
        /// </summary>
        /// <returns></returns>
        Task<List<ServiceResource>> GetResources(string env);

        /// <summary>
        /// Integration point for retrieving the full list of resources
        /// </summary>
        /// <returns>The resource full list of all resources if exists</returns>
        Task<List<ServiceResource>> GetResourceList(string env, bool includeAltinn2, bool includeApps = false);

        /// <summary>
        /// Get Resource from Altinn 2 service
        /// </summary>
        Task<ServiceResource> GetServiceResourceFromService(string serviceCode, int serviceEditionCode, string environment);

        /// <summary>
        /// Get the number of delegations of Altinn 2 service
        /// </summary>
        Task<DelegationCountOverview> GetDelegationCount(string serviceCode, int serviceEditionCode, string environment);

        /// <summary>
        /// Start migration batch of Altinn 2 delegations to Altinn 3
        /// </summary>
        Task<ActionResult> StartMigrateDelegations(ExportDelegationsRequestBE delegationRequest, string environment);

        /// <summary>
        /// Get Policy from Altinn 2 Service
        /// </summary>
        Task<XacmlPolicy> GetXacmlPolicy(string serviceCode, int serviceEditionCode, string identifier, string environment);

        /// <summary>
        /// Get Policy from Altinn 3 resource
        /// </summary>
        Task<XacmlPolicy> GetResourcePolicy(string resourceId, string environment);

        /// <summary>
        /// Create a new access list for an organization in a given environment
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="env">Chosen environment</param>
        /// <param name="accessList">Data for new access list. Identifier, name and description are valid properties. Members cannot be set directly on creation</param>
        /// <returns>The created access list</returns>
        Task<ActionResult<AccessList>> CreateAccessList(string org, string env, AccessList accessList);

        /// <summary>
        /// Get an access list for an organization in a given environment
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="identifier">Access list identifier</param>
        /// <param name="env">Chosen environment</param>
        /// <returns>The access list, if it exists in the given environment for the given organization. Access list members are returned</returns>
        Task<AccessList> GetAccessList(string org, string identifier, string env);

        /// <summary>
        /// Get members of an access list for an organization in a given environment
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="identifier">Access list identifier</param>
        /// <param name="env">Chosen environment</param>
        /// <param name="page">Full page url, if requesting any other page than the first page</param>
        /// <returns>The access list, if it exists in the given environment for the given organization. Access list members are returned</returns>
        Task<PagedAccessListMembersResponse> GetAccessListMembers(string org, string identifier, string env, string page);

        /// <summary>
        /// Gets all access lists for an organization in a given environment
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="env">Chosen environment</param>
        /// <param name="page">Full page url, if requesting any other page than the first page</param>
        /// <returns>A paginated response of access lists in the given environment for the given organization. Members of access lists are not returned</returns>
        Task<PagedAccessListResponse> GetAccessLists(string org, string env, string page);

        /// <summary>
        /// Gets all access lists connected to a given resource for an organization in a given environment
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="resourceId">Chosen resource</param>
        /// <param name="env">Chosen environment</param>
        /// <param name="page">Full page url, if requesting any other page than the first page</param>
        /// <returns>A paginated response of access lists the given resource in the given environment for the given organization is connected to. Members of access lists are not returned</returns>
        Task<PagedAccessListResponse> GetResourceAccessLists(string org, string resourceId, string env, string page);

        /// <summary>
        /// Delete an access list for an organization in a given environment
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="identifier">Access list identifier</param>
        /// <param name="env">Chosen environment</param>
        /// <param name="etag">ETag for the list (if any)</param>
        /// <returns>HTTP status code for the operation. 200 OK if delete was successful</returns>
        Task<ActionResult> DeleteAccessList(string org, string identifier, string env, string etag);

        /// <summary>
        /// Updates an access list for an organization in a given environment. Will only update name and description, not list members
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="identifier">Access list identifier</param>
        /// <param name="env">Chosen environment</param>
        /// <param name="accessList">New data with name and description of access list</param>
        /// <returns>The updated access list</returns>
        Task<ActionResult<AccessList>> UpdateAccessList(string org, string identifier, string env, AccessList accessList);

        /// <summary>
        /// Add a new party as access list member
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="identifier">Access list identifier</param>
        /// <param name="members">Object with list of 9-digit organization number of party to add to list</param>
        /// <param name="env">Chosen environment</param>
        /// <returns>HTTP status code of the operation. 200 OK if add was successful</returns>
        Task<ActionResult> AddAccessListMembers(string org, string identifier, AccessListOrganizationNumbers members, string env);

        /// <summary>
        /// Remove a party as access list member
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="identifier">Access list identifier</param>
        /// <param name="members">Object with list of 9-digit organization number of party to remove from the list</param>
        /// <param name="env">Chosen environment</param>
        /// <returns>HTTP status code of the operation. 204 No content if remove was successful</returns>
        Task<ActionResult> RemoveAccessListMembers(string org, string identifier, AccessListOrganizationNumbers members, string env);

        /// <summary>
        /// Connect a resource to a given access list
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="resourceId">Resource identifier</param>
        /// <param name="listId">Access list identifier</param>
        /// <param name="env">Chosen environment</param>
        /// <returns>HTTP status code of the operation. 200 OK if add was successful</returns>
        Task<HttpStatusCode> AddResourceAccessList(string org, string resourceId, string listId, string env);

        /// <summary>
        /// Remove connection between a given resource and a given access list
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <param name="resourceId">Resource identifier</param>
        /// <param name="listId">Access list identifier</param>
        /// <param name="env">Chosen environment</param>
        /// <returns>HTTP status code of the operation. 204 No content if remove was successful</returns>
        Task<HttpStatusCode> RemoveResourceAccessList(string org, string resourceId, string listId, string env);

        Task<List<SubjectResources>> GetSubjectResources(List<string> subjects, string env);

        /// <summary>
        /// Get consent templates which can be used by this organisation
        /// </summary>
        /// <param name="org">Current organization</param>
        /// <returns>List of consent templates</returns>
        Task<List<ConsentTemplate>> GetConsentTemplates(string org);
    }
}
