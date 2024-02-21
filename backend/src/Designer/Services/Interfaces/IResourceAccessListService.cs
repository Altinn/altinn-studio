using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IResourceAccessListService
    {
        Task<AccessList> CreateAccessList(string org, string env, AccessList AccessList);

        Task<AccessList> GetAccessList(string org, string identifier, string env);

        Task<PagedAccessListResponse> GetAccessLists(string org, string env, int page);

        Task<PagedAccessListResponse> GetResourceAccessLists(string org, string resourceId, string env, int page);

        Task<bool> DeleteAccessList(string org, string identifier, string env);

        Task<AccessList> UpdateAccessList(string org, string identifier, string env, IEnumerable<AccessListPatch> AccessList);

        Task<bool> AddAccessListMember(string org, string identifier, string memberOrgnr, string env);

        Task<bool> RemoveAccessListMember(string org, string identifier, string memberOrgnr, string env);

        Task<bool> AddResourceAccessList(string org, string resourceId, string listId, string env);

        Task<bool> RemoveResourceAccessList(string org, string resourceId, string listId, string env);
    }
}
