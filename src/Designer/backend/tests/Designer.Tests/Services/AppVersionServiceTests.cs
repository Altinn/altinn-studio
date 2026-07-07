using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services;

public class AppVersionServiceTests
{
    private const string Org = "ttd";
    private const string Developer = "testUser";

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
}
