using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class FixedStudioOidcUsernameProvider : IStudioOidcUsernameProvider
{
    private const string FixedUsername = "newuser";

    public Task<string> ResolveUsernameAsync(string sub, string pid)
    {
        return Task.FromResult(FixedUsername);
    }
}
