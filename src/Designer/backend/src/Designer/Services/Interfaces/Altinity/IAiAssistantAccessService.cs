using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces.Altinity;

public interface IAiAssistantAccessService
{
    /// <summary>
    /// Decides whether the developer may use the assistant on a repository.
    /// </summary>
    /// <param name="org">Owner of the repository being edited.</param>
    Task<bool> HasAccessAsync(string org);
}
