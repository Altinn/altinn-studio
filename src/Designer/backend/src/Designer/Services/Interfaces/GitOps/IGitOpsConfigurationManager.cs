using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.GitOps;

/// <summary>
/// Manages the GitOps configuration for Altinn organizations.
/// </summary>
public interface IGitOpsConfigurationManager
{
    public Task EnsureGitOpsConfigurationExists(AltinnOrgEditingContext context);
    public Task<bool> AppExistsInGitOpsConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment);
    public Task AddAppToGitOpsConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment);
    public Task RemoveAppFromGitOpsConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment);
    public Task<bool> PersistGitOpsConfiguration(AltinnOrgEditingContext context, AltinnEnvironment environment);
}
