using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.GitOps;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class EnsureGitOpsConfigurationExistsTests
    : GitRepoGitOpsConfigurationManagerTestsBase<EnsureGitOpsConfigurationExistsTests>
{
    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenRepositoryDoesNotExist_ShouldCreateBaseAndEnvironmentManifests(string environment)
    {
        await Given.That.LocalRepositoryDoesNotExist().And.When.EnsureGitOpsConfigurationExistsCalled(environment);

        await Then.BaseManifestsShouldExist()
            .And.EnvironmentManifestsShouldExist(environment)
            .And.EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenBaseManifestsExist_ShouldNotRecreateBaseManifests_ButEnsureEnvironmentManifests(
        string environment
    )
    {
        await Given.That.BaseManifestsExist();

        await And.When.EnsureGitOpsConfigurationExistsCalled(environment);

        await Then.BaseManifestsShouldExist()
            .And.EnvironmentManifestsShouldExist(environment)
            .And.EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenEnvironmentManifestsExist_ShouldNotRecreateEnvironmentManifests_ButEnsureBaseManifests(
        string environment
    )
    {
        await Given.That.EnvironmentManifestsExistsWithResourceApps(environment, []);

        await And.When.EnsureGitOpsConfigurationExistsCalled(environment);

        await Then.BaseManifestsShouldExist()
            .And.EnvironmentManifestsShouldExist(environment)
            .And.EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenBothBaseAndEnvironmentManifestsExist_ShouldNotRecreateAnyManifests(string environment)
    {
        await Given.That.BaseManifestsExist();

        await And.EnvironmentManifestsExistsWithResourceApps(environment, []);

        await And.When.EnsureGitOpsConfigurationExistsCalled(environment);

        await Then.BaseManifestsShouldExist()
            .And.EnvironmentManifestsShouldExist(environment)
            .And.EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenLocalRepositoryCannotBeUpdated_ShouldCloneItAgain_AndRecreateManifests(string environment)
    {
        await Given.That.RemoteRepositoryDoesNotExist().And.When.EnsureGitOpsConfigurationExistsCalled(environment);

        await Then.BaseManifestsShouldExist()
            .And.EnvironmentManifestsShouldExist(environment)
            .And.EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenLocalRepositoryExists_ShouldResetItToTheRemoteInPlace_AndCreateManifests(string environment)
    {
        await Given
            .That.RemoteRepositoryExists()
            .And.RemoteRepositoryContainsFile(RemoteOnlyFile)
            .And.LocalRepositoryContainsFile(LocalOnlyFile)
            .And.LocalCloneHasMarker()
            .And.When.EnsureGitOpsConfigurationExistsCalled(environment);

        await Then.BaseManifestsShouldExist()
            .And.EnvironmentManifestsShouldExist(environment)
            .And.LocalRepositoryShouldContainFile(RemoteOnlyFile)
            .And.LocalRepositoryShouldNotContainFile(LocalOnlyFile)
            .And.LocalCloneShouldBeKept()
            .And.EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenRemoteRepositoryExists_ShouldNotCreateRemoteRepository_AndCreateManifests(string environment)
    {
        await Given
            .That.RemoteRepositoryExists()
            .And.LocalRepositoryDoesNotExist()
            .And.When.EnsureGitOpsConfigurationExistsCalled(environment);

        await Then.BaseManifestsShouldExist()
            .And.EnvironmentManifestsShouldExist(environment)
            .And.EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenRemoteRepositoryDoesNotExist_ShouldCreateRemoteRepository_AndCreateManifests(
        string environment
    )
    {
        await Given
            .That.RemoteRepositoryDoesNotExist()
            .And.LocalRepositoryDoesNotExist()
            .And.When.EnsureGitOpsConfigurationExistsCalled(environment);

        await Then.BaseManifestsShouldExist()
            .And.EnvironmentManifestsShouldExist(environment)
            .And.EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Fact]
    public async Task WhenLocalRepositoryHasTooManyPackFiles_ShouldCloneItAgain()
    {
        await Given
            .That.RemoteRepositoryExists()
            .And.LocalCloneHasMarker()
            .And.LocalCloneHasPackFiles(51)
            .And.When.EnsureGitOpsConfigurationExistsCalled("tt02");

        Then.LocalCloneShouldNotBeKept();
    }

    private async Task EnsureGitOpsConfigurationExistsCalled(string environment)
    {
        await GitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(
            OrgEditingContext,
            AltinnEnvironment.FromName(environment)
        );
    }

    private const string RemoteOnlyFile = "remote-only.txt";
    private const string LocalOnlyFile = "local-only.txt";

    private EnsureGitOpsConfigurationExistsTests RemoteRepositoryContainsFile(string fileName)
    {
        File.WriteAllText(Path.Join(GetRemoteRepositoryPath(), fileName), fileName);
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests LocalRepositoryContainsFile(string fileName)
    {
        File.WriteAllText(Path.Join(AltinnGitRepository.RepositoryDirectory, fileName), fileName);
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests LocalRepositoryShouldContainFile(string fileName)
    {
        Assert.True(AltinnGitRepository.FileExistsByRelativePath(fileName), $"{fileName} should exist");
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests LocalRepositoryShouldNotContainFile(string fileName)
    {
        Assert.False(AltinnGitRepository.FileExistsByRelativePath(fileName), $"{fileName} should not exist");
        return this;
    }

    private string CloneMarkerPath => Path.Join(AltinnGitRepository.RepositoryDirectory, ".git", "clone-marker");

    private EnsureGitOpsConfigurationExistsTests LocalCloneHasMarker()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(CloneMarkerPath)!);
        File.WriteAllText(CloneMarkerPath, string.Empty);
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests LocalCloneHasPackFiles(int count)
    {
        string packDirectory = Path.Join(AltinnGitRepository.RepositoryDirectory, ".git", "objects", "pack");
        Directory.CreateDirectory(packDirectory);
        for (int i = 0; i < count; i++)
        {
            File.WriteAllText(Path.Join(packDirectory, $"pack-{i}.pack"), string.Empty);
        }
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests LocalCloneShouldNotBeKept()
    {
        Assert.False(File.Exists(CloneMarkerPath), "The local clone should be cloned again");
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests LocalCloneShouldBeKept()
    {
        Assert.True(File.Exists(CloneMarkerPath), "The local clone should be reused, not cloned again");
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests LocalRepositoryDoesNotExist()
    {
        if (Directory.Exists(AltinnGitRepository.RepositoryDirectory))
        {
            Directory.Delete(AltinnGitRepository.RepositoryDirectory, true);
        }
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests BaseManifestsShouldExist()
    {
        bool baseKustomizationExists = AltinnGitRepository.FileExistsByRelativePath(
            ManifestsPathHelper.BaseManifests.KustomizationPath
        );
        Assert.True(
            baseKustomizationExists,
            $"Base kustomization should exist at {ManifestsPathHelper.BaseManifests.KustomizationPath}"
        );
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests EnvironmentManifestsShouldExist(string environment)
    {
        bool environmentKustomizationExists = AltinnGitRepository.FileExistsByRelativePath(
            ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment)
        );
        Assert.True(
            environmentKustomizationExists,
            $"Environment kustomization should exist at {ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment)}"
        );
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests RemoteRepositoryExists()
    {
        string remoteRepoPath = GetRemoteRepositoryPath();
        if (!Directory.Exists(remoteRepoPath))
        {
            Directory.CreateDirectory(remoteRepoPath);
        }
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests RemoteRepositoryDoesNotExist()
    {
        string remoteRepoPath = GetRemoteRepositoryPath();
        if (Directory.Exists(remoteRepoPath))
        {
            Directory.Delete(remoteRepoPath, true);
        }
        return this;
    }

    private string GetRemoteRepositoryPath()
    {
        return TestDataHelper.GetTestDataRemoteRepository(OrgEditingContext.Org, TestRepoName);
    }

    public override async Task DisposeAsync()
    {
        RemoteRepositoryDoesNotExist();
        await base.DisposeAsync();
    }
}
