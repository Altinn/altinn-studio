using System;
using System.IO;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using NuGet.Versioning;
using Xunit;

namespace Designer.Tests.Services;

public sealed class AppVersionServiceTests : IDisposable
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string Repo = "version-app";

    private readonly string _repositoriesRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
    private readonly AltinnRepoEditingContext _editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
        Org,
        Repo,
        Developer
    );

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

    [Fact]
    public void GetAppLibVersion_WithAppProject_SkipsOtherProjects()
    {
        // A project file elsewhere in the repository that cannot be parsed is not read.
        AppVersionService service = CreateRepository(
            ("App/App.csproj", Project(AppLibReference("9.0.0-preview.4"))),
            ("Broken.csproj", "<Project>")
        );

        Assert.Equal(SemanticVersion.Parse("9.0.0-preview.4"), service.GetAppLibVersion(_editingContext));
        Assert.True(service.IsV9App(_editingContext));
    }

    [Fact]
    public void GetAppLibVersion_WithoutAppProject_SearchesOtherProjects()
    {
        AppVersionService service = CreateRepository(("src/App/App.csproj", Project(AppLibReference("9.1.0"))));

        Assert.Equal(SemanticVersion.Parse("9.1.0"), service.GetAppLibVersion(_editingContext));
        Assert.True(service.IsV9App(_editingContext));
    }

    [Fact]
    public void GetAppLibVersion_WithoutAppPackageReference_SearchesOtherProjects()
    {
        AppVersionService service = CreateRepository(
            ("App/App.csproj", Project("""<ProjectReference Include="../lib/Altinn.App.Api.csproj" />""")),
            ("test/App.Tests.csproj", Project(AppLibReference("8.0.0")))
        );

        Assert.Equal(SemanticVersion.Parse("8.0.0"), service.GetAppLibVersion(_editingContext));
        Assert.False(service.IsV9App(_editingContext));
    }

    private AppVersionService CreateRepository(params (string RelativePath, string Content)[] files)
    {
        var repositoryFactory = new AltinnGitRepositoryFactory(_repositoriesRoot);
        string repositoryPath = repositoryFactory.GetRepositoryPath(Org, Repo, Developer);
        Directory.CreateDirectory(repositoryPath);
        foreach ((string relativePath, string content) in files)
        {
            string path = Path.Combine(repositoryPath, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, content);
        }
        return new AppVersionService(repositoryFactory);
    }

    private static string Project(string items) =>
        $"""<Project Sdk="Microsoft.NET.Sdk"><ItemGroup>{items}</ItemGroup></Project>""";

    private static string AppLibReference(string version) =>
        $"""<PackageReference Include="Altinn.App.Api" Version="{version}" />""";

    public void Dispose()
    {
        if (Directory.Exists(_repositoriesRoot))
        {
            Directory.Delete(_repositoriesRoot, recursive: true);
        }
    }
}
