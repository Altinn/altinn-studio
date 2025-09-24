using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.GitOps;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class EnsureGitOpsConfigurationExistsTests : GitRepoGitOpsConfigurationManagerTestsBase<EnsureGitOpsConfigurationExistsTests>
{
    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenRepositoryDoesNotExist_ShouldCreateBaseAndEnvironmentManifests(string environment)
    {
        await Given.That
            .LocalRepositoryDoesNotExist()
            .And
            .When
            .EnsureGitOpsConfigurationExistsCalled(environment);

        await Then
            .BaseManifestsShouldExist()
            .And
            .EnvironmentManifestsShouldExist(environment)
            .And
            .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenBaseManifestsExist_ShouldNotRecreateBaseManifests_ButEnsureEnvironmentManifests(string environment)
    {
        await Given.That
            .BaseManifestsExist();

        await And
            .When
            .EnsureGitOpsConfigurationExistsCalled(environment);

        await Then
            .BaseManifestsShouldExist()
            .And
            .EnvironmentManifestsShouldExist(environment)
            .And
            .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenEnvironmentManifestsExist_ShouldNotRecreateEnvironmentManifests_ButEnsureBaseManifests(string environment)
    {
        await Given.That
            .EnvironmentManifestsExistsWithResourceApps(environment, []);

        await And
            .When
            .EnsureGitOpsConfigurationExistsCalled(environment);

        await Then
            .BaseManifestsShouldExist()
            .And
            .EnvironmentManifestsShouldExist(environment)
            .And
            .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenBothBaseAndEnvironmentManifestsExist_ShouldNotRecreateAnyManifests(string environment)
    {
        await Given.That
            .BaseManifestsExist();

        await And
            .EnvironmentManifestsExistsWithResourceApps(environment, []);

        await And
            .When
            .EnsureGitOpsConfigurationExistsCalled(environment);

        await Then
            .BaseManifestsShouldExist()
            .And
            .EnvironmentManifestsShouldExist(environment)
            .And
            .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("prod")]
    [InlineData("at22")]
    public async Task WhenLocalRepositoryExists_ShouldDeleteLocalRepository_AndRecreateManifests(string environment)
    {
        Given.That
            .LocalRepositoryExists();

        await And
            .When
            .EnsureGitOpsConfigurationExistsCalled(environment);

        await Then
            .BaseManifestsShouldExist()
            .And
            .EnvironmentManifestsShouldExist(environment)
            .And
            .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    private async Task EnsureGitOpsConfigurationExistsCalled(string environment)
    {
        await GitOpsConfigurationManager.EnsureGitOpsConfigurationExists(OrgEditingContext, AltinnEnvironment.FromName(environment));
    }

    private EnsureGitOpsConfigurationExistsTests LocalRepositoryDoesNotExist()
    {
        if (Directory.Exists(AltinnGitRepository.RepositoryDirectory))
        {
            Directory.Delete(AltinnGitRepository.RepositoryDirectory, true);
        }
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests LocalRepositoryExists()
    {
        if (!Directory.Exists(AltinnGitRepository.RepositoryDirectory))
        {
            Directory.CreateDirectory(AltinnGitRepository.RepositoryDirectory);
        }
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests BaseManifestsShouldExist()
    {
        bool baseKustomizationExists = AltinnGitRepository.FileExistsByRelativePath(ManifestsPathHelper.BaseManifests.KustomizationPath);
        Assert.True(baseKustomizationExists, $"Base kustomization should exist at {ManifestsPathHelper.BaseManifests.KustomizationPath}");
        return this;
    }

    private EnsureGitOpsConfigurationExistsTests EnvironmentManifestsShouldExist(string environment)
    {
        bool environmentKustomizationExists = AltinnGitRepository.FileExistsByRelativePath(ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment));
        Assert.True(environmentKustomizationExists, $"Environment kustomization should exist at {ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment)}");
        return this;
    }
}
