using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.GitOps;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.Extensions.Time.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class GitRepoGitOpsConfigurationManagerTestsBase<T> : FluentTestsBase<T>, IAsyncLifetime where T : GitRepoGitOpsConfigurationManagerTestsBase<T>
{
    protected IAltinnGitRepositoryFactory AltinnGitRepositoryFactory { get; private set; }
    protected AltinnGitRepository AltinnGitRepository => AltinnGitRepositoryFactory.GetAltinnGitRepository(OrgEditingContext.Org, TestRepoName, OrgEditingContext.Developer);
    protected GitRepoGitOpsConfigurationManager GitOpsConfigurationManager { get; private set; }
    protected ScribanGitOpsManifestsRenderer ScribanGitOpsManifestsRenderer { get; private set; }
    protected string TestRepoName { get; private set; }
    protected AltinnOrgEditingContext OrgEditingContext { get; }

    public GitRepoGitOpsConfigurationManagerTestsBase()
    {
        // test data are configured for ttd org and testUser.
        OrgEditingContext = AltinnOrgEditingContext.FromOrgDeveloper("ttd", "testUser");
    }
    public async Task InitializeAsync()
    {
        string testRepoPath = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        TestRepoName = TestDataHelper.GenerateTestRepoName($"-{OrgEditingContext.Org}");
        await TestDataHelper.CopyRepositoryForTest(OrgEditingContext.Org, "ttd-gitops", OrgEditingContext.Developer, TestRepoName);
        AltinnGitRepositoryFactory = new AltinnGitRepositoryFactory(testRepoPath);
        ScribanGitOpsManifestsRenderer = new ScribanGitOpsManifestsRenderer();
        GitOpsConfigurationManager = new GitRepoGitOpsConfigurationManager(
            new IGiteaMock(),
            ScribanGitOpsManifestsRenderer,
            new ISourceControlMock(),
            AltinnGitRepositoryFactory,
            new FakeTimeProvider(),
            new GitOpsSettings
            {
                GitOpsOrg = OrgEditingContext.Org,
                GitOpsRepoNameFormat = TestRepoName.Replace($"-{OrgEditingContext.Org}", "-{0}")
            },
            new ServiceRepositorySettings
            {
                RepositoryLocation = testRepoPath
            });

    }

    protected async Task AppDirectoryExists(string app)
    {
        var appManifests =
            ScribanGitOpsManifestsRenderer.GetAppManifests(AltinnRepoContext.FromOrgRepo(OrgEditingContext.Org, app));
        await WriteManifestsToRepository(appManifests);
    }

    protected T AppDirectoryDoesNotExists(string app)
    {
        if (AltinnGitRepository.DirectoryExistsByRelativePath($"apps/{app}"))
        {
            string appFolderPath = Path.Join(AltinnGitRepository.RepositoryDirectory, $"apps/{app}");
            Directory.Delete(appFolderPath, true);
        }
        return this as T;
    }

    protected async Task EnvironmentManifestsExistsWithResourceApps(string environment, params string[] apps)
    {
        var appsSet = apps.Select(AltinnRepoName.FromName).ToHashSet();
        var manifests =
            ScribanGitOpsManifestsRenderer.GetEnvironmentOverlayManifests(AltinnEnvironment.FromName(environment),
                appsSet);
        await WriteManifestsToRepository(manifests);
    }

    protected async Task BaseManifestsExist()
    {
        var baseManifests = ScribanGitOpsManifestsRenderer.GetBaseManifests();
        await WriteManifestsToRepository(baseManifests);
    }

    protected async Task WriteManifestsToRepository(Dictionary<string, string> manifests)
    {
        foreach ((string filePath, string content) in manifests)
        {
            await AltinnGitRepository.WriteTextByRelativePathAsync(filePath, content, true);
        }
    }

    protected T AppDirectoryShouldExist(string app)
    {
        bool appExists = AltinnGitRepository.DirectoryExistsByRelativePath($"apps/{app}");
        Assert.True(appExists, $"App directory for '{app}' should exist");
        return this as T;
    }

    protected async Task EnvironmentKustomizationManifestShouldContainApp(string environment, string app)
    {
        string envManifest =
            await AltinnGitRepository.ReadTextByRelativePathAsync(
                ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment));

        AssertTextContainsTerm(envManifest, ManifestsPathHelper.EnvironmentManifests.KustomizationAppResource(app));
    }
    protected async Task EnvironmentKustomizationManifestShouldContainApps(string environment, params string[] apps)
    {
        string envManifest =
            await AltinnGitRepository.ReadTextByRelativePathAsync(
                ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment));
        // Consequence is that we're
        foreach (string app in apps)
        {
            AssertTextContainsTerm(envManifest, ManifestsPathHelper.EnvironmentManifests.KustomizationAppResource(app));
        }
    }

    protected async Task EnvironmentKustomizationManifestShouldContainBaseResource(string environment)
    {
        string envManifest =
            await AltinnGitRepository.ReadTextByRelativePathAsync(
                ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment));

        AssertTextContainsTerm(envManifest, "../base");
    }

    private void AssertTextContainsTerm(string text, string term)
    {
        bool containsApp = text.Contains(term, StringComparison.InvariantCulture);
        Assert.True(containsApp, $"Provided text doesn't contain term {term}");
    }

    public Task DisposeAsync()
    {
        TestDataHelper.DeleteAppRepository(OrgEditingContext.Org, TestRepoName, OrgEditingContext.Developer);
        return Task.CompletedTask;
    }
}

