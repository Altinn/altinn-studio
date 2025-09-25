using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Microsoft.Extensions.DependencyInjection;
using YamlDotNet.Serialization;

namespace Altinn.Studio.Designer.Services.Implementation.GitOps;

/// <summary>
/// GitOps configuration manager that uses git repositories to manage the configuration.
/// </summary>
public class GitRepoGitOpsConfigurationManager(
    [FromKeyedServices("bot-auth")] IGitea giteaApi,
    IGitOpsManifestsRenderer gitOpsManifestsRenderer,
    ISourceControl sourceControl,
    IAltinnGitRepositoryFactory gitRepositoryFactory,
    TimeProvider timeProvider,
    GitOpsSettings gitOpsSettings,
    ServiceRepositorySettings serviceRepositorySettings) : IGitOpsConfigurationManager
{

    private string GitOpsRepoName(string org) => string.Format(gitOpsSettings.GitOpsRepoNameFormat, org);

    public async Task EnsureGitOpsConfigurationExistsAsync(AltinnOrgEditingContext context, AltinnEnvironment environment)
    {
        DeleteLocalRepositoryIfExists(context);
        await EnsureRemoteRepositoryExists(context);

        await sourceControl.CloneRemoteRepository(gitOpsSettings.GitOpsOrg,  GitOpsRepoName(context.Org));

        await EnsureBaseManifests(context);
        await EnsureEnvironmentManifests(context, environment);
    }

    private async Task EnsureRemoteRepositoryExists(AltinnOrgEditingContext context)
    {
        // Check if remote repo exists
        var repo = await giteaApi.GetRepository(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org));
        if (repo is not null)
        {
            return;
        }

        // Create repo with template
        var createOptions = new CreateRepoOption(
            name: GitOpsRepoName(context.Org),
            description: $"GitOps configuration for {context.Org}",
            autoInit: true,
            makePrivate: false
        );

        await giteaApi.CreateRepository(gitOpsSettings.GitOpsOrg, createOptions);
    }

    private async Task EnsureBaseManifests(AltinnOrgEditingContext context)
    {
        var repository =
            gitRepositoryFactory.GetAltinnGitRepository(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org), context.Developer);

        if (!repository.FileExistsByRelativePath(ManifestsPathHelper.BaseManifests.KustomizationPath))
        {
            var baseManifests = gitOpsManifestsRenderer.GetBaseManifests();
            await WriteManifestsToFiles(context, baseManifests);
        }
    }

    private async Task EnsureEnvironmentManifests(AltinnOrgEditingContext context, AltinnEnvironment environment)
    {
        var repository =
            gitRepositoryFactory.GetAltinnGitRepository(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org), context.Developer);

        if (!repository.FileExistsByRelativePath(ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment.Name)))
        {
            var envManifests = gitOpsManifestsRenderer.GetEnvironmentOverlayManifests(environment, new HashSet<AltinnRepoName>());
            await WriteManifestsToFiles(context, envManifests);
        }
    }

    private void DeleteLocalRepositoryIfExists(AltinnOrgEditingContext context)
    {
        // Fast rename instead of deletion
        // Should check if repo actually exists. GetAltinnGitRepository fails if do not exists
        string repoPath = serviceRepositorySettings.GetServicePath(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org), context.Developer);
        if (!Directory.Exists(repoPath))
        {
            return;
        }

        string renamedPath = $"{repoPath}-{timeProvider.GetUtcNow():yyyyMMddHHmmss}";
        Directory.Move(repoPath, renamedPath);

        // Fire and forget deletion task
        _ = Task.Run(() =>
        {
            try
            {
                Directory.Delete(renamedPath, true);
            }
            catch
            {
                // Ignore deletion errors
            }
        });
    }

    public async Task<bool> AppExistsInGitOpsConfigurationAsync(AltinnOrgEditingContext context, AltinnRepoName app, AltinnEnvironment environment)
    {
        string gitopsRepoName = GitOpsRepoName(context.Org);
        var repository = gitRepositoryFactory.GetAltinnGitRepository(gitOpsSettings.GitOpsOrg, gitopsRepoName, context.Developer);

        if (!repository.DirectoryExistsByRelativePath(ManifestsPathHelper.AppManifests.AppDirectoryPath(app.Name)) ||
            !repository.FileExistsByRelativePath(ManifestsPathHelper.AppManifests.KustomizationPath(app.Name)) ||
            !repository.FileExistsByRelativePath(ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment.Name)))
        {
            return false;
        }

        return await AppIsReferencedInEnvironment(repository, app.Name, environment);
    }

    private static async Task<bool> AppIsReferencedInEnvironment(
        AltinnGitRepository repository,
        string repoName,
        AltinnEnvironment environment)
    {
        string envKusomizationContent = await repository.ReadTextByRelativePathAsync(ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment.Name));

        string expectedResourcePath = ManifestsPathHelper.EnvironmentManifests.KustomizationAppResource(repoName);
        return envKusomizationContent.Contains(expectedResourcePath, StringComparison.InvariantCulture);
    }

    public async Task AddAppToGitOpsConfigurationAsync(AltinnRepoEditingContext context, AltinnEnvironment environment)
    {
        var repository = gitRepositoryFactory.GetAltinnGitRepository(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org), context.Developer);

        if (!repository.DirectoryExistsByRelativePath(ManifestsPathHelper.AppManifests.AppDirectoryPath(context.Repo)) ||
            !repository.FileExistsByRelativePath(ManifestsPathHelper.AppManifests.KustomizationPath(context.Repo)))
        {
            var appManifests = gitOpsManifestsRenderer.GetAppManifests(context);
            await WriteManifestsToFiles(AltinnOrgEditingContext.FromOrgDeveloper(context.Org, context.Developer), appManifests);
        }

        var existingApps = await GetExistingAppsFromEnvironmentKustomization(repository, environment);

        var newApp = AltinnRepoName.FromName(context.Repo);
        existingApps.Add(newApp);
        var envManifests = gitOpsManifestsRenderer.GetEnvironmentOverlayManifests(environment, existingApps);
        await WriteManifestsToFiles(AltinnOrgEditingContext.FromOrgDeveloper(context.Org, context.Developer), envManifests);
    }

    private static async Task<HashSet<AltinnRepoName>> GetExistingAppsFromEnvironmentKustomization(AltinnGitRepository repository, AltinnEnvironment environment)
    {
        string envKustomizationPath = ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment.Name);
        return repository.FileExistsByRelativePath(envKustomizationPath)
            ? await GetExistingAppsFromKustomization(repository, envKustomizationPath)
            : [];
    }

    public async Task RemoveAppFromGitOpsEnvironmentConfigurationAsync(AltinnRepoEditingContext context, AltinnEnvironment environment)
    {
        var repository = gitRepositoryFactory.GetAltinnGitRepository(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org), context.Developer);

        var existingApps = await GetExistingAppsFromEnvironmentKustomization(repository, environment);

        var appToRemove = AltinnRepoName.FromName(context.Repo);
        existingApps.Remove(appToRemove);

        var envManifests = gitOpsManifestsRenderer.GetEnvironmentOverlayManifests(environment, existingApps);
        await WriteManifestsToFiles(AltinnOrgEditingContext.FromOrgDeveloper(context.Org, context.Developer), envManifests);
    }

    public async Task PersistGitOpsConfigurationAsync(AltinnOrgEditingContext context, AltinnEnvironment environment)
    {
        var repository = gitRepositoryFactory.GetAltinnGitRepository(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org), context.Developer);

        await sourceControl.CommitAndPushChanges(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org), "master", repository.RepositoryDirectory, $"Update GitOps configuration for environment {environment}", gitOpsSettings.BotPersonalAccessToken);
    }
    private async Task WriteManifestsToFiles(AltinnOrgEditingContext context, Dictionary<string, string> manifests)
    {
        var repository =
            gitRepositoryFactory.GetAltinnGitRepository(gitOpsSettings.GitOpsOrg, GitOpsRepoName(context.Org), context.Developer);

        foreach ((string manifestPath, string content) in manifests)
        {
            await repository.WriteTextByRelativePathAsync(manifestPath, content, true);
        }
    }

    private static async Task<HashSet<AltinnRepoName>> GetExistingAppsFromKustomization(
        AltinnGitRepository repository, string kustomizationPath)
    {
        string yamlContent = await repository.ReadTextByRelativePathAsync(kustomizationPath);
        var deserializer = new DeserializerBuilder().Build();

        using var reader = new StringReader(yamlContent);
        var kustomization = deserializer.Deserialize<Dictionary<object, object>>(reader);

        if (kustomization?[ManifestsPathHelper.EnvironmentManifests.KustomizationResourcesSection] is List<object> resources)
        {
            string prefix = ManifestsPathHelper.EnvironmentManifests.AppResourcePrefix;

            return resources
                .Select(r => r?.ToString())
                .Where(p => !string.IsNullOrWhiteSpace(p) && p.StartsWith(prefix))
                .Select(p => AltinnRepoName.FromName(p[prefix.Length..]))
                .ToHashSet();
        }
        return [];
    }

}
