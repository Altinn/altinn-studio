using System.Runtime.Versioning;
using Altinn.Studio.Preview.Files;

namespace Altinn.Studio.Preview.Tests.Files;

public sealed class AppFolderTests : IDisposable
{
    private readonly RepositoryRoot _root = new();
    private readonly string _workingCopyDirectory;
    private readonly WorkingCopy _workingCopy;

    public AppFolderTests()
    {
        _workingCopyDirectory = _root.AddWorkingCopy("developer", "ttd", "my-app");
        Assert.True(WorkingCopy.TryCreate("developer", "ttd", "my-app", out WorkingCopy? workingCopy));
        _workingCopy = workingCopy;
    }

    public void Dispose() => _root.Dispose();

    [Fact]
    public void OpenRead_OpensAFileInTheWorkingCopyForReadingOnly()
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");

        using FileStream? file = FindFolder().OpenRead("App/wwwroot/logo.svg");

        Assert.NotNull(file);
        Assert.False(file.CanWrite);
        using var reader = new StreamReader(file);
        Assert.Equal("<svg/>", reader.ReadToEnd());
    }

    [Fact]
    public void OpenRead_ReturnsNullForAMissingFileOrADirectory()
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");
        AppFolder folder = FindFolder();

        Assert.Null(folder.OpenRead("App/wwwroot/missing.svg"));
        Assert.Null(folder.OpenRead("App/wwwroot"));
    }

    [Theory]
    [InlineData("../other-app/App/wwwroot/logo.svg")]
    [InlineData("App/../../other-app/App/wwwroot/logo.svg")]
    [InlineData("App/wwwroot/../../../../other-developer/ttd/my-app/App/wwwroot/logo.svg")]
    [InlineData("/etc/passwd")]
    [InlineData("App//wwwroot/logo.svg")]
    [InlineData("App/./wwwroot/logo.svg")]
    [InlineData("App\\wwwroot\\logo.svg")]
    [InlineData("")]
    public void OpenRead_RefusesAPathThatIsNotPlainlyInsideTheWorkingCopy(string path)
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");
        string otherApp = _root.AddWorkingCopy("developer", "ttd", "other-app");
        RepositoryRoot.AddFile(otherApp, "App/wwwroot/logo.svg", "<svg/>");
        string otherDeveloper = _root.AddWorkingCopy("other-developer", "ttd", "my-app");
        RepositoryRoot.AddFile(otherDeveloper, "App/wwwroot/logo.svg", "<svg/>");

        Assert.Null(FindFolder().OpenRead(path));
    }

    [Theory]
    [InlineData(".git/config")]
    [InlineData(".GIT/config")]
    [InlineData(".git./config")]
    [InlineData("App/.git/config")]
    [InlineData("git~1/config")]
    public void OpenRead_RefusesGitMetadata(string path)
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, ".git/config", "[core]");
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/.git/config", "[core]");

        Assert.Null(FindFolder().OpenRead(path));
    }

    [Fact]
    public void OpenRead_RefusesALinkedFile()
    {
        string secret = RepositoryRoot.AddFile(_root.Path, "secret.txt", "secret");
        Directory.CreateDirectory(Path.Combine(_workingCopyDirectory, "App", "wwwroot"));
        File.CreateSymbolicLink(Path.Combine(_workingCopyDirectory, "App", "wwwroot", "logo.svg"), secret);

        Assert.Null(FindFolder().OpenRead("App/wwwroot/logo.svg"));
    }

    [Fact]
    public void OpenRead_RefusesAPathThroughALinkedDirectory()
    {
        string otherDeveloper = _root.AddWorkingCopy("other-developer", "ttd", "my-app");
        RepositoryRoot.AddFile(otherDeveloper, "App/wwwroot/logo.svg", "<svg/>");
        Directory.CreateDirectory(Path.Combine(_workingCopyDirectory, "App"));
        Directory.CreateSymbolicLink(
            Path.Combine(_workingCopyDirectory, "App", "wwwroot"),
            Path.Combine(otherDeveloper, "App", "wwwroot")
        );

        Assert.Null(FindFolder().OpenRead("App/wwwroot/logo.svg"));
    }

    [Fact]
    [UnsupportedOSPlatform("windows")]
    public void OpenRead_ReturnsNullForAFileTheServiceMayNotRead()
    {
        Assert.SkipWhen(Environment.IsPrivilegedProcess, "A privileged process reads any file.");
        string file = RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");
        File.SetUnixFileMode(file, UnixFileMode.None);

        Assert.Null(FindFolder().OpenRead("App/wwwroot/logo.svg"));
    }

    [Fact]
    public void Find_ReturnsNullWithoutAWorkingCopy()
    {
        Assert.True(WorkingCopy.TryCreate("developer", "ttd", "no-such-app", out WorkingCopy? workingCopy));

        Assert.Null(AppFolder.Find(_root.Path, workingCopy));
    }

    [Fact]
    public void Find_ReturnsNullForAWorkingCopyThatIsALink()
    {
        string otherDeveloper = _root.AddWorkingCopy("other-developer", "ttd", "linked-app");
        Directory.CreateSymbolicLink(Path.Combine(_root.Path, "developer", "ttd", "linked-app"), otherDeveloper);
        Assert.True(WorkingCopy.TryCreate("developer", "ttd", "linked-app", out WorkingCopy? workingCopy));

        Assert.Null(AppFolder.Find(_root.Path, workingCopy));
    }

    private AppFolder FindFolder() =>
        AppFolder.Find(_root.Path, _workingCopy) ?? throw new InvalidOperationException("No working copy.");
}
