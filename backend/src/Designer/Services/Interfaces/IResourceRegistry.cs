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
        Task<List<ServiceResource>> GetResourceList(string env);

        /// <summary>
        /// Get Resource from Altinn 2 service
        /// </summary>
        Task<ServiceResource> GetServiceResourceFromService(string serviceCode, int serviceEditionCode, string environment);

        /// <summary>
        /// Get Policy from Altinn 2 Service
        /// </summary>
        Task<XacmlPolicy> GetXacmlPolicy(string serviceCode, int serviceEditionCode, string identifier, string environment);

        Task<AccessList> CreateAccessList(string org, string env, AccessList AccessList);

        Task<AccessList> GetAccessList(string org, string identifier, string env);

        Task<PagedAccessListResponse> GetAccessLists(string org, string env, int page);

        Task<PagedAccessListResponse> GetResourceAccessLists(string org, string resourceId, string env, int page);

        Task<HttpStatusCode> DeleteAccessList(string org, string identifier, string env);

        Task<AccessList> UpdateAccessList(string org, string identifier, string env, AccessList accessList);

        Task<HttpStatusCode> AddAccessListMember(string org, string identifier, string memberOrgnr, string env);

        Task<HttpStatusCode> RemoveAccessListMember(string org, string identifier, string memberOrgnr, string env);

        Task<HttpStatusCode> AddResourceAccessList(string org, string resourceId, string listId, string env);

        Task<HttpStatusCode> RemoveResourceAccessList(string org, string resourceId, string listId, string env);
    }
}
