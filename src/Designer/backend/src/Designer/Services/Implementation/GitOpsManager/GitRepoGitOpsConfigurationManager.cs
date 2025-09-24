using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Services.Implementation.GitOpsManager;

/// <summary>
/// GitOps configuration manager that uses git repositories to manage the configuration.
/// </summary>
public class GitRepoGitOpsConfigurationManager([FromKeyedServices("as-auth")] IGitea giteaApi) : IGitOpsConfigurationManager
{
    public async Task EnsureGitOpsConfigurationExists(AltinnOrgEditingContext context)
    {
        // remove local clone if exists

        // check if repo exists
        var repoExists = await giteaApi.GetRepository("als", $"{context.Org}-gitops");
        if (repoExists is null)
        {
            // create repo with template
        }

        // clone repo

        // if there are already contents, return

        // add init contents
    }

    public async Task<bool> AppExistsInGitOpsConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment)
    {
        await Task.CompletedTask;

        // check if there is a folder for the app in apps folder
        // if not, return false

        // check if app is in kustomization.yaml for environment
        // if not, return false

        return true;
    }

    public async Task AddAppToGitOpsConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment)
    {
        await Task.CompletedTask;
        // check if folder of an app exists in apps folder
        // if not, create folder with templates

        // check if app exists in kustomization.yaml for environment
        // if not, add app to kustomization.yaml
    }

    public async Task RemoveAppFromGitOpsConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment)
    {
        await Task.CompletedTask;
        // check if app exists in kustomization.yaml for environment
        // if yes, remove app from kustomization.yaml
    }

    public async Task<bool> PersistGitOpsConfiguration(AltinnOrgEditingContext context, AltinnEnvironment environment)
    {
        await Task.CompletedTask;
        // commit and push changes

        return true;
    }
}
