using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IUserOrganizationService
{
    Task<bool> UserIsMemberOfAnyOrganization();
}
