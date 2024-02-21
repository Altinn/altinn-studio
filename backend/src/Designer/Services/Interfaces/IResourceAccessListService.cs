using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IResourceAccessListService
    {
        Task<ActionResult> CreateAccessList(string org, string env, AccessList AccessList);

        Task<ActionResult<AccessList>> GetAccessList(string org, string identifier, string env);

        Task<ActionResult<PagedAccessListResponse>> GetAccessLists(string org, string env, int page);

        Task<ActionResult<PagedAccessListResponse>> GetResourceAccessLists(string org, string resourceId, string env, int page);

        Task<ActionResult> DeleteAccessList(string org, string identifier, string env);

        Task<ActionResult> UpdateAccessList(string org, string identifier, string env, IEnumerable<AccessListPatch> AccessList);

        Task<ActionResult> AddAccessListMember(string org, string identifier, string memberOrgnr, string env);

        Task<ActionResult> RemoveAccessListMember(string org, string identifier, string memberOrgnr, string env);

        Task<ActionResult> AddResourceAccessList(string org, string resourceId, string listId, string env);

        Task<ActionResult> RemoveResourceAccessList(string org, string resourceId, string listId, string env);
    }
}
