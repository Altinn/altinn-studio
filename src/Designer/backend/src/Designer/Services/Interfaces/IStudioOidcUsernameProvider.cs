using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IStudioOidcUsernameProvider
{
    Task<string> ResolveUsernameAsync(string sub, string pid, string? givenName);
}
