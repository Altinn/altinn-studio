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
    GitOpsSettings gitOpsSettings) : IGitOpsConfigurationManager
{

    private string RepoName(string org) => string.Format(gitOpsSettings.GitOpsRepoNameFormat, org);

    public async Task EnsureGitOpsConfigurationExists(AltinnOrgEditingContext context, AltinnEnvironment environment)
    {
        DeleteLocalRepositoryIfExists(context);
        await EnsureRemoteRepositoryExists(context);

        await sourceControl.CloneRemoteRepository(gitOpsSettings.GitOpsOrg,  RepoName(context.Org));

        await EnsureBaseManifests(context);
        await EnsureEnvironmentManifests(context, environment);
    }

    private async Task EnsureRemoteRepositoryExists(AltinnOrgEditingContext context)
    {
        // Check if repo exists
        var repoExists = await giteaApi.GetRepository(gitOpsSettings.GitOpsOrg, RepoName(context.Org));
        if (repoExists is null)
        {
            // Create repo with template
            var createOptions = new CreateRepoOption(
                name: RepoName(context.Org),
                description: $"GitOps configuration for {context.Org}",
                autoInit: true,
                makePrivate: false
            );

            await giteaApi.CreateRepository(gitOpsSettings.GitOpsOrg, createOptions);
        }
    }

    private async Task EnsureBaseManifests(AltinnOrgEditingContext context)
    {
        var repository =
            gitRepositoryFactory.GetAltinnGitRepository(context.Org, RepoName(context.Org), context.Developer);

        if (!repository.FileExistsByRelativePath("base/kustomization.yaml"))
        {
            var baseManifests = gitOpsManifestsRenderer.GetBaseManifests();
            await WriteManifestsToFiles(context, baseManifests);
        }
    }

    private async Task EnsureEnvironmentManifests(AltinnOrgEditingContext context, AltinnEnvironment environment)
    {
        var repository =
            gitRepositoryFactory.GetAltinnGitRepository(context.Org, RepoName(context.Org), context.Developer);

        if (!repository.FileExistsByRelativePath($"{environment.Name}/kustomization.yaml"))
        {
            var envManifests = gitOpsManifestsRenderer.GetEnvironmentOverlayManifests(environment, new HashSet<AltinnRepoName>());
            await WriteManifestsToFiles(context, envManifests);
        }
    }

    private void DeleteLocalRepositoryIfExists(AltinnOrgEditingContext context)
    {
        // Fast rename instead of deletion
        var repository = gitRepositoryFactory.GetAltinnGitRepository(context.Org, RepoName(context.Org), context.Developer);
        string localPath = repository.RepositoryDirectory;
        if (!Directory.Exists(localPath))
        {
            return;
        }

        string renamedPath = $"{localPath}-{timeProvider.GetUtcNow():yyyyMMddHHmmss}";
        Directory.Move(localPath, renamedPath);

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

    public async Task<bool> AppExistsInGitOpsConfiguration(AltinnOrgEditingContext context, AltinnRepoName app, AltinnEnvironment environment)
    {
        string repoName = RepoName(context.Org);
        var repository = gitRepositoryFactory.GetAltinnGitRepository(context.Org, repoName, context.Developer);

        if (!repository.DirectoryExistsByRelativePath($"apps/{app.Name}") ||
            !repository.FileExistsByRelativePath($"apps/{app.Name}/kustomization.yaml") ||
            !repository.FileExistsByRelativePath($"{environment.Name}/kustomization.yaml"))
        {
            return false;
        }

        return await AppIsReferencedInEnvironment(repository, app.Name, environment);
    }

    private static bool AppManifestExists(AltinnGitRepository repository, string repoName)
    {
        return repository.FileExistsByRelativePath($"apps/{repoName}/kustomization.yaml");
    }

    private static bool EnvironmentKustomizationExists(AltinnGitRepository repository, AltinnEnvironment environment)
    {
        return repository.FileExistsByRelativePath($"{environment.Name}/kustomization.yaml");
    }

    private static async Task<bool> AppIsReferencedInEnvironment(
        AltinnGitRepository repository,
        string repoName,
        AltinnEnvironment environment)
    {
        string kustomizationPath = $"{environment.Name}/kustomization.yaml";
        string content = await repository.ReadTextByRelativePathAsync(kustomizationPath);

        string expectedResourcePath = ManifestsPathHelper.EnvironmentManifests.KustomizationAppResource(repoName);
        return content.Contains(expectedResourcePath, StringComparison.OrdinalIgnoreCase);
    }

    public async Task AddAppToGitOpsConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment)
    {
        var repository = gitRepositoryFactory.GetAltinnGitRepository(context.Org, RepoName(context.Org), context.Developer);

        if (!repository.DirectoryExistsByRelativePath($"apps/{context.Repo}") ||
            !AppManifestExists(repository, context.Repo))
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
        string envKustomizationPath = $"{environment.Name}/kustomization.yaml";
        return repository.FileExistsByRelativePath(envKustomizationPath)
            ? await GetExistingAppsFromKustomization(repository, envKustomizationPath)
            : [];
    }

    public async Task RemoveAppFromGitOpsEnvironmentConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment)
    {
        var repository = gitRepositoryFactory.GetAltinnGitRepository(context.Org, RepoName(context.Org), context.Developer);

        var existingApps = await GetExistingAppsFromEnvironmentKustomization(repository, environment);

        var appToRemove = AltinnRepoName.FromName(context.Repo);
        existingApps.Remove(appToRemove);

        var envManifests = gitOpsManifestsRenderer.GetEnvironmentOverlayManifests(environment, existingApps);
        await WriteManifestsToFiles(AltinnOrgEditingContext.FromOrgDeveloper(context.Org, context.Developer), envManifests);
    }

    public async Task<bool> PersistGitOpsConfiguration(AltinnOrgEditingContext context, AltinnEnvironment environment)
    {
        // Should be pushed with bot user. Commit details might be ok with regular
        await Task.CompletedTask;
        return true;
    }
    private async Task WriteManifestsToFiles(AltinnOrgEditingContext context, Dictionary<string, string> manifests)
    {
        var repository =
            gitRepositoryFactory.GetAltinnGitRepository(context.Org, RepoName(context.Org), context.Developer);

        foreach ((string manifestPath, string content) in manifests)
        {
            await repository.WriteTextByRelativePathAsync(manifestPath, content, true);
        }
    }

    private static async Task<HashSet<AltinnRepoName>> GetExistingAppsFromKustomization(
        AltinnGitRepository repository, string kustomizationPath)
    {
        try
        {
            string yamlContent = await repository.ReadTextByRelativePathAsync(kustomizationPath);
            var deserializer = new DeserializerBuilder().Build();

            using var reader = new StringReader(yamlContent);
            var kustomization = deserializer.Deserialize<Dictionary<object, object>>(reader);

            if (kustomization?["resources"] is List<object> resources)
            {
                const string Prefix = "../apps/";

                return resources
                    .Select(r => r?.ToString())
                    .Where(p => !string.IsNullOrWhiteSpace(p) && p.StartsWith(Prefix))
                    .Select(p => AltinnRepoName.FromName(p[Prefix.Length..]))
                    .ToHashSet();
            }
        }
        catch
        {
            // I might add logging here.
        }

        return [];
    }

}
