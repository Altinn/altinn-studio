using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IUserService
{
    public Task<UserOrgPermission> GetUserOrgPermission(string org);
}
