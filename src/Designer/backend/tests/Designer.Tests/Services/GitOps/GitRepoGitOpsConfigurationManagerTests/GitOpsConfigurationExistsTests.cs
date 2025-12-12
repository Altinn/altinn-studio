using System.IO;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class GitOpsConfigurationExistsTests : GitRepoGitOpsConfigurationManagerTestsBase<GitOpsConfigurationExistsTests>
{
    [Fact]
    public async Task WhenRemoteRepositoryExists_ShouldReturnTrue()
    {
        Given.That
             .RemoteRepositoryExists();

        await When
            .GitOpsConfigurationExistsAsyncCalled();

        Then
            .ResultShouldBe(true);
    }

    [Fact]
    public async Task WhenRemoteRepositoryDoesNotExist_ShouldReturnFalse()
    {
        Given.That
            .RemoteRepositoryDoesNotExist();

        await When
            .GitOpsConfigurationExistsAsyncCalled();

        Then
            .ResultShouldBe(false);
    }

    private bool Result { get; set; }

    private async Task GitOpsConfigurationExistsAsyncCalled()
    {
        Result = await GitOpsConfigurationManager.GitOpsConfigurationExistsAsync(OrgEditingContext);
    }

    private void ResultShouldBe(bool expected)
    {
        Assert.Equal(expected, Result);
    }

    private void RemoteRepositoryExists()
    {
        string remoteRepoPath = GetRemoteRepositoryPath();
        if (!Directory.Exists(remoteRepoPath))
        {
            Directory.CreateDirectory(remoteRepoPath);
        }
    }

    private void RemoteRepositoryDoesNotExist()
    {
        string remoteRepoPath = GetRemoteRepositoryPath();
        if (Directory.Exists(remoteRepoPath))
        {
            Directory.Delete(remoteRepoPath, true);
        }
    }

    private string GetRemoteRepositoryPath()
    {
        return TestDataHelper.GetTestDataRemoteRepository(OrgEditingContext.Org, TestRepoName);
    }
}
