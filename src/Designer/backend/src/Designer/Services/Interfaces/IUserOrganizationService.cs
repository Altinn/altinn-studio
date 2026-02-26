#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IUserOrganizationService
{
    Task<bool> UserIsMemberOfAnyOrganization();

    Task<bool> UserIsMemberOfOrganization(string org);

    Task<bool> UserIsMemberOfAnyOf(IEnumerable<string> organizations);
}
