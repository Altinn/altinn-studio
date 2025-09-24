using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class AppExistsInGitOpsConfigurationTests : GitRepoGitOpsConfigurationManagerTestsBase<AppExistsInGitOpsConfigurationTests>
{
    private bool AppExistCallResult { get; set; }

    [Theory]
    [InlineData("test-app", "tt02",false, "dummy-app1", "dummy-app2" )]
    [InlineData("test-app", "tt02",true, "test-app", "dummy-app2" )]
    public async Task WhenAppDirectory_DoesExists_ShouldReturn_BasedOnEnvironmentManifest(string app, string environment, bool expectedShouldExist, params string[] appsInEnvironment)
    {
        await Given.That
            .AppDirectoryExists(app);

        await And
            .EnvironmentManifestsContainApps(environment, appsInEnvironment);

        await Then
            .When
            .AppExistsInGitOpsConfigurationCalled(app, environment);

        AppExistCallResultShouldBe(expectedShouldExist);
    }

    [Theory]
    [InlineData("test-app", "tt02", "dummy-app1", "dummy-app2" )]
    [InlineData("test-app", "tt02", "test-app", "dummy-app2" )]
    public async Task WhenAppDirectory_DoesNotExists_ShouldReturnFalse(string app, string environment, params string[] appsInEnvironment)
    {
        Given.That
            .AppDirectoryDoesNotExists(app);

        await And
            .EnvironmentManifestsContainApps(environment, appsInEnvironment);

        await Then
            .When
            .AppExistsInGitOpsConfigurationCalled(app, environment);

        AppExistCallResultShouldBe(false);
    }

    private async Task AppExistsInGitOpsConfigurationCalled(string app, string environment)
    {
        AppExistCallResult = await GitOpsConfigurationManager.AppExistsInGitOpsConfiguration(OrgEditingContext, AltinnRepoName.FromName(app), AltinnEnvironment.FromName(environment));
    }

    private void AppExistCallResultShouldBe(bool expected)
    {
        Assert.Equal(AppExistCallResult, expected);
    }
}
