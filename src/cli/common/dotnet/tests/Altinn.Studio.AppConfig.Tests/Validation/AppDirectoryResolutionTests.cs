namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class AppDirectoryResolutionTests : IDisposable
{
    private readonly string _repository;

    public AppDirectoryResolutionTests()
    {
        _repository = Path.Combine(Path.GetTempPath(), "appconfig-resolve-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(_repository, "App", "config"));
    }

    public void Dispose()
    {
        Directory.Delete(_repository, recursive: true);
    }

    [Theory]
    [InlineData("")]
    [InlineData("App")]
    public void TryResolveDirectory_RepositoryOrAppDirectory_RootsAtRepository(string relative)
    {
        var root = Path.Combine(_repository, relative);

        Assert.Equal(_repository, AppConfigEngine.TryResolveDirectory(root)?.Root);
        Assert.Equal(_repository, AppConfigEngine.TryResolveDirectory(root + Path.DirectorySeparatorChar)?.Root);
    }

    [Fact]
    public void TryResolveDirectory_RepositoryWithTopLevelConfig_RootsAtRepository()
    {
        Directory.CreateDirectory(Path.Combine(_repository, "config"));

        Assert.Equal(_repository, AppConfigEngine.TryResolveDirectory(_repository)?.Root);
    }

    [Fact]
    public void TryResolveDirectory_DirectoryThatIsNeitherRepositoryNorApp_IsNull()
    {
        Directory.CreateDirectory(Path.Combine(_repository, "docs", "config"));

        Assert.Null(AppConfigEngine.TryResolveDirectory(Path.Combine(_repository, "docs")));
        Assert.Null(AppConfigEngine.TryResolveDirectory(Path.Combine(_repository, "App", "config")));
    }

    [Fact]
    public void Open_DirectoryThatIsNeitherRepositoryNorApp_Throws()
    {
        var root = Path.Combine(_repository, "App", "config");

        var ex = Assert.Throws<InvalidOperationException>(() => AppConfigEngine.Open(root));

        Assert.Contains("not an altinn app directory", ex.Message, StringComparison.Ordinal);
    }
}
