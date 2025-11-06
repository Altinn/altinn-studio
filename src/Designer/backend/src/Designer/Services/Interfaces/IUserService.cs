#nullable disable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IUserService
{
    public Task<UserOrgPermission> GetUserOrgPermission(AltinnOrgEditingContext altinnOrgEditingContext);
}
