using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class PersistGitOpsConfigurationTests : GitRepoGitOpsConfigurationManagerTestsBase<PersistGitOpsConfigurationTests>
{
    [Theory]
    [InlineData("tt02")]
    public async Task WhenCalled_ShouldCommitAndPushChanges(string environment)
    {
        await Given.That
                .RepositoryHasChanges();

        await When
            .PersistGitOpsConfigurationCalled(environment);

        Then
            .ShouldCompleteSuccessfully();
    }

    private async Task PersistGitOpsConfigurationCalled(string environment)
    {
        await GitOpsConfigurationManager.PersistGitOpsConfiguration(OrgEditingContext, AltinnEnvironment.FromName(environment));
    }

    private async Task RepositoryHasChanges()
    {
        await AltinnGitRepository.WriteTextByRelativePathAsync("somefile.txt", "some content");
    }

    private void ShouldCompleteSuccessfully()
    {
        // If we reach this point without exceptions, the test is successful.
        Assert.True(true);
    }
}
