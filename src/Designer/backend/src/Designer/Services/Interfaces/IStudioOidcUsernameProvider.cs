using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IStudioOidcUsernameProvider
{
    Task<string> ResolveUsernameAsync(string sub, PidHash pidHash, string? givenName, string? familyName);
}
