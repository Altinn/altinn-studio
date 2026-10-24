using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services;

public class AppVersionServiceTests : IDisposable
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private string _testRepoPath;

    [Theory]
    [InlineData("app-with-layoutsets-v9", true)] // Altinn.App.Api 9.0.0
    [InlineData("app-with-layoutsets", false)] // Altinn.App.Api 8.0.0
    [InlineData("empty-app", false)] // No csproj, so no version can be resolved
    public void IsV9App_ReturnsExpected(string repo, bool expected)
    {
        // Arrange
        AppVersionService service = new(
            new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory())
        );
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, repo, Developer);

        // Act
        bool result = service.IsV9App(editingContext);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("8.12.10", false)]
    [InlineData("9.0.0-preview.8", false)]
    [InlineData("9.0.0-preview.9", true)]
    [InlineData("9.0.0-preview.10", true)]
    [InlineData("9.0.0", true)]
    [InlineData("9.1.0", true)]
    [InlineData(null, false)] // No csproj, so no version can be resolved
    public async Task UsesDataTypeTaskIds_ReturnsWhetherTheAppLibVersionReadsTaskIds(string version, bool expected)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, "empty-app", Developer, targetRepository);
        if (version is not null)
        {
            TestDataHelper.WriteAppLibVersion(_testRepoPath, version);
        }
        AppVersionService service = new(
            new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory())
        );
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        // Act
        bool result = service.UsesDataTypeTaskIds(editingContext);

        // Assert
        Assert.Equal(expected, result);
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(_testRepoPath))
        {
            TestDataHelper.DeleteDirectory(_testRepoPath);
        }
    }
}
