using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.GitOps;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class RemoveAppFromGitOpsEnvironmentConfigurationTests : GitRepoGitOpsConfigurationManagerTestsBase<RemoveAppFromGitOpsEnvironmentConfigurationTests>
{
    [Theory]
    [InlineData("app-to-remove", "tt02", "app-to-remove", "other-app1", "other-app2")]
    [InlineData("test-app", "production", "another-app", "test-app", "third-app")]
    public async Task WhenAppExistsInEnvironment_ShouldRemoveAppFromEnvironment(string app, string environment, params string[] existingAppsInEnvironment)
    {
        await Given.That
            .AppDirectoryExists(app);

        await And
            .EnvironmentManifestsContainApps(environment, existingAppsInEnvironment);

        await And
            .When
            .RemoveAppFromGitOpsEnvironmentConfigurationCalled(app, environment);

        await Then
            .AppDirectoryShouldExist(app)
            .And
            .EnvironmentKustomizationManifestShouldNotContainApp(environment, app);

        await But
            .EnvironmentKustomizationManifestShouldContainBaseResource(environment);

    }

    [Theory]
    [InlineData("non-existent-app", "tt02", "other-app1", "other-app2")]
    [InlineData("missing-app", "production", "app1", "app2", "app3")]
    public async Task WhenAppDoesNotExistInEnvironment_ShouldNotAffectOtherApps(string app, string environment, params string[] existingAppsInEnvironment)
    {
        await Given.That
            .AppDirectoryExists(app);

        await And
            .EnvironmentManifestsContainApps(environment, existingAppsInEnvironment);

        await And
            .When
            .RemoveAppFromGitOpsEnvironmentConfigurationCalled(app, environment);

        await Then
            .AppDirectoryShouldExist(app)
            .And
            .EnvironmentKustomizationManifestShouldContainApps(environment, existingAppsInEnvironment);

        await But
            .EnvironmentKustomizationManifestShouldNotContainApp(environment, app);

        await And
            .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("only-app", "tt02", "only-app")]
    [InlineData("single-app", "production", "single-app")]
    public async Task WhenRemovingLastAppFromEnvironment_ShouldCreateEmptyEnvironment(string app, string environment, params string[] existingAppsInEnvironment)
    {
        await Given.That
            .AppDirectoryExists(app);

        await And
            .EnvironmentManifestsContainApps(environment, existingAppsInEnvironment);

        await And
            .When
            .RemoveAppFromGitOpsEnvironmentConfigurationCalled(app, environment);

        await Then
            .AppDirectoryShouldExist(app)
            .And
            .EnvironmentKustomizationManifestShouldNotContainApp(environment, app);

        await And
            .EnvironmentKustomizationShouldNotContainAnyApp(environment);

        await And
            .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("app-to-remove", "tt02")]
    [InlineData("test-app", "production")]
    public async Task WhenEnvironmentIsEmpty_ShouldNotFail(string app, string environment)
    {
        await Given.That
            .AppDirectoryExists(app);

        await And
            .EnvironmentManifestsContainApps(environment);

        await And
            .When
            .RemoveAppFromGitOpsEnvironmentConfigurationCalled(app, environment);

        Then
            .AppDirectoryShouldExist(app);

        await And
            .EnvironmentKustomizationShouldNotContainAnyApp(environment);

        await But
                .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    private async Task RemoveAppFromGitOpsEnvironmentConfigurationCalled(string app, string environment)
    {
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgEditingContext.Org, app, OrgEditingContext.Developer);
        await GitOpsConfigurationManager.RemoveAppFromGitOpsEnvironmentConfiguration(context, AltinnEnvironment.FromName(environment));
    }

    private async Task EnvironmentKustomizationManifestShouldNotContainApp(string environment, string app)
    {
        string envManifest =
            await AltinnGitRepository.ReadTextByRelativePathAsync(
                ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment));

        bool containsApp = envManifest.Contains(ManifestsPathHelper.EnvironmentManifests.KustomizationAppResource(app), StringComparison.InvariantCulture);
        Assert.False(containsApp, $"{ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment)} should not contain app resource for '{app}'");
    }

    private async Task EnvironmentKustomizationShouldNotContainAnyApp(string environment)
    {
        string envManifest =
            await AltinnGitRepository.ReadTextByRelativePathAsync(
                ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment));

        bool hasAppResources = envManifest.Contains(ManifestsPathHelper.EnvironmentManifests.KustomizationResourcesSection, StringComparison.InvariantCulture) &&
                           envManifest.Contains(ManifestsPathHelper.EnvironmentManifests.AppResourcePrefix, StringComparison.InvariantCulture);
        Assert.False(hasAppResources, $"{ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment)} should not contain any app resources");
    }
}
