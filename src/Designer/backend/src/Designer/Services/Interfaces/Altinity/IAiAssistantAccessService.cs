using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces.Altinity;

public interface IAiAssistantAccessService
{
    /// <summary>
    /// Resolves the service owner billed for assistant usage on a repository.
    /// </summary>
    /// <param name="org">Owner of the repository being edited. A user name for a fork.</param>
    /// <param name="app">The repository.</param>
    /// <returns>The service owner, or null when the developer has no assistant access here.</returns>
    Task<string?> ResolveServiceOwnerAsync(string org, string app);
}
