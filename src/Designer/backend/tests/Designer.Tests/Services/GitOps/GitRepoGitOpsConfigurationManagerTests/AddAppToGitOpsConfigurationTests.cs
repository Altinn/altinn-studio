using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.GitOps;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class AddAppToGitOpsConfigurationTests : GitRepoGitOpsConfigurationManagerTestsBase<AddAppToGitOpsConfigurationTests>
{
    [Theory]
    [InlineData("new-app", "tt02", "existing-app1", "existing-app2")]
    [InlineData("test-app", "production", "app1", "app2", "app3")]
    public async Task WhenAppDirectoryDoesNotExist_ShouldCreateAppManifests_AndAddToEnvironment(string app, string environment, params string[] existingAppsInEnvironment)
    {
        Given.That
            .AppDirectoryDoesNotExists(app);

        await And
            .EnvironmentManifestsExistsWithResourceApps(environment, existingAppsInEnvironment);

        await And
            .When
            .AddAppToGitOpsConfigurationCalled(app, environment);

        await Then
            .AppDirectoryShouldExist(app)
            .And
            .EnvironmentKustomizationManifestShouldContainApp(environment, app);

        await
            And
                .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("existing-app", "tt02", "existing-app", "other-app")]
    [InlineData("test-app", "production", "another-app", "test-app")]
    public async Task WhenAppDirectoryExists_ShouldNotRecreateManifests_ButShouldAddToEnvironment(string app, string environment, params string[] existingAppsInEnvironment)
    {
        await Given.That
            .AppDirectoryExists(app);

        await And
            .EnvironmentManifestsExistsWithResourceApps(environment, existingAppsInEnvironment);

        await And
            .When
            .AddAppToGitOpsConfigurationCalled(app, environment);

       await Then
            .AppDirectoryShouldExist(app)
            .And
            .EnvironmentKustomizationManifestShouldContainApp(environment, app);

       await
           And
               .EnvironmentKustomizationManifestShouldContainBaseResource(environment);
    }

    [Theory]
    [InlineData("new-app", "tt02")]
    [InlineData("test-app", "production")]
    public async Task WhenEnvironmentHasNoApps_ShouldCreateAppManifests_AndCreateEnvironmentWithSingleApp(string app, string environment)
    {
        Given.That
            .AppDirectoryDoesNotExists(app);

        await And
            .EnvironmentManifestsExistsWithResourceApps(environment, []);

        await And
            .When
            .AddAppToGitOpsConfigurationCalled(app, environment);

        await Then
            .AppDirectoryShouldExist(app)
            .And
            .EnvironmentKustomizationManifestShouldContainApps(environment, app);
    }

    [Theory]
    [InlineData("duplicate-app", "tt02", "duplicate-app")]
    [InlineData("test-app", "production", "other-app", "test-app")]
    public async Task WhenAppAlreadyExistsInEnvironment_ShouldNotDuplicateApp(string app, string environment, params string[] existingAppsInEnvironment)
    {
        await Given.That
            .AppDirectoryExists(app);

        await And
            .EnvironmentManifestsExistsWithResourceApps(environment, existingAppsInEnvironment);

        await And
            .When
            .AddAppToGitOpsConfigurationCalled(app, environment);

        await Then
            .AppDirectoryShouldExist(app)
            .And
            .EnvironmentKustomizationManifestShouldContainApp(environment, app);

        await But
            .EnvironmentShouldNotContainDuplicateApp(environment, app);
    }

    private async Task AddAppToGitOpsConfigurationCalled(string app, string environment)
    {
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgEditingContext.Org, app, OrgEditingContext.Developer);
        await GitOpsConfigurationManager.AddAppToGitOpsConfiguration(context, AltinnEnvironment.FromName(environment));
    }


    private async Task EnvironmentShouldNotContainDuplicateApp(string environment, string app)
    {
        string envManifest =
            await AltinnGitRepository.ReadTextByRelativePathAsync(
                ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment));

        string appResource = Regex.Escape(ManifestsPathHelper.EnvironmentManifests.KustomizationAppResource(app));
        int occurrences = Regex.Matches(envManifest, appResource).Count;

        Assert.True(occurrences == 1,
            $"{ManifestsPathHelper.EnvironmentManifests.KustomizationPath(environment)} should contain app resource exactly once, but found {occurrences} occurrences.");
    }

}
