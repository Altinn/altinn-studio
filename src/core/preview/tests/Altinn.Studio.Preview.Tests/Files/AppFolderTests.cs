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
        using AppFolder folder = OpenFolder();

        using Stream? file = folder.OpenRead("App/wwwroot/logo.svg");

        Assert.NotNull(file);
        Assert.False(file.CanWrite);
        using var reader = new StreamReader(file);
        Assert.Equal("<svg/>", reader.ReadToEnd());
    }

    [Fact]
    public void OpenRead_ReturnsNullForAMissingFileOrADirectory()
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");
        using AppFolder folder = OpenFolder();

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
        using AppFolder folder = OpenFolder();

        Assert.Null(folder.OpenRead(path));
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
        using AppFolder folder = OpenFolder();

        Assert.Null(folder.OpenRead(path));
    }

    [Fact]
    public void OpenRead_RefusesALinkedFile()
    {
        string secret = RepositoryRoot.AddFile(_root.Path, "secret.txt", "secret");
        Directory.CreateDirectory(Path.Combine(_workingCopyDirectory, "App", "wwwroot"));
        File.CreateSymbolicLink(Path.Combine(_workingCopyDirectory, "App", "wwwroot", "logo.svg"), secret);
        using AppFolder folder = OpenFolder();

        Assert.Null(folder.OpenRead("App/wwwroot/logo.svg"));
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
        using AppFolder folder = OpenFolder();

        Assert.Null(folder.OpenRead("App/wwwroot/logo.svg"));
    }

    [Fact]
    public void OpenRead_RefusesADirectoryThatBecameALinkAfterTheFolderWasOpened()
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");
        string otherDeveloper = _root.AddWorkingCopy("other-developer", "ttd", "my-app");
        RepositoryRoot.AddFile(otherDeveloper, "App/wwwroot/logo.svg", "<svg id='other'/>");
        using AppFolder folder = OpenFolder();

        string wwwroot = Path.Combine(_workingCopyDirectory, "App", "wwwroot");
        Directory.Delete(wwwroot, recursive: true);
        Directory.CreateSymbolicLink(wwwroot, Path.Combine(otherDeveloper, "App", "wwwroot"));

        Assert.Null(folder.OpenRead("App/wwwroot/logo.svg"));
    }

    [Fact]
    public void OpenRead_ReadsTheWorkingCopyTheFolderOpened_AfterAnotherDirectoryTakesItsPath()
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");
        string otherDeveloper = _root.AddWorkingCopy("other-developer", "ttd", "my-app");
        RepositoryRoot.AddFile(otherDeveloper, "App/wwwroot/logo.svg", "<svg id='other'/>");
        using AppFolder folder = OpenFolder();

        Directory.Move(_workingCopyDirectory, _workingCopyDirectory + "-moved");
        Directory.CreateSymbolicLink(_workingCopyDirectory, otherDeveloper);

        using Stream? file = folder.OpenRead("App/wwwroot/logo.svg");
        Assert.NotNull(file);
        using var reader = new StreamReader(file);
        Assert.Equal("<svg/>", reader.ReadToEnd());
    }

    [Fact]
    public void OpenRead_ReturnsNullForAFileTheServiceMayNotRead()
    {
        Assert.SkipWhen(Environment.IsPrivilegedProcess, "A privileged process reads any file.");
        string file = RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");
        File.SetUnixFileMode(file, UnixFileMode.None);
        using AppFolder folder = OpenFolder();

        Assert.Null(folder.OpenRead("App/wwwroot/logo.svg"));
    }

    [Fact]
    public void FileExists_IsTrueOnlyForAFileTheFolderWouldOpen()
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/layouts/page.json", "{}");
        RepositoryRoot.AddFile(_workingCopyDirectory, ".git/config", "[core]");
        string secret = RepositoryRoot.AddFile(_root.Path, "secret.txt", "secret");
        File.CreateSymbolicLink(Path.Combine(_workingCopyDirectory, "App", "ui", "linked.json"), secret);
        using AppFolder folder = OpenFolder();

        Assert.True(folder.FileExists("App/ui/layouts/page.json"));
        Assert.False(folder.FileExists("App/ui/layouts"));
        Assert.False(folder.FileExists("App/ui/missing.json"));
        Assert.False(folder.FileExists("App/ui/linked.json"));
        Assert.False(folder.FileExists(".git/config"));
        Assert.False(folder.FileExists("../../../secret.txt"));
    }

    [Fact]
    public void ListFiles_ListsTheFilesOfADirectory_WithoutLinksDirectoriesOrGitMetadata()
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/layouts/b.json", "{}");
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/layouts/a.json", "{}");
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/layouts/nested/c.json", "{}");
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/layouts/.git/config", "[core]");
        string secret = RepositoryRoot.AddFile(_root.Path, "secret.txt", "secret");
        File.CreateSymbolicLink(Path.Combine(_workingCopyDirectory, "App", "ui", "layouts", "linked.json"), secret);
        using AppFolder folder = OpenFolder();

        Assert.Equal(["a.json", "b.json"], folder.ListFiles("App/ui/layouts"));
    }

    [Fact]
    public void ListDirectories_ListsTheDirectoriesOfADirectory_WithoutLinksFilesOrGitMetadata()
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/form/layouts/page.json", "{}");
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/summary/layouts/page.json", "{}");
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/settings.json", "{}");
        string otherDeveloper = _root.AddWorkingCopy("other-developer", "ttd", "my-app");
        Directory.CreateSymbolicLink(Path.Combine(_workingCopyDirectory, "App", "ui", "linked"), otherDeveloper);
        RepositoryRoot.AddFile(_workingCopyDirectory, ".git/config", "[core]");
        using AppFolder folder = OpenFolder();

        Assert.Equal(["form", "summary"], folder.ListDirectories("App/ui"));
        Assert.Equal(["App"], folder.ListDirectories(""));
    }

    [Theory]
    [InlineData("App/missing")]
    [InlineData("App/ui/settings.json")]
    [InlineData("App/ui/linked")]
    [InlineData("..")]
    [InlineData("../other-app")]
    [InlineData(".git")]
    public void ListFiles_IsEmptyForAPathThatIsNotADirectoryTheFolderWouldOpen(string path)
    {
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/ui/settings.json", "{}");
        RepositoryRoot.AddFile(_workingCopyDirectory, ".git/config", "[core]");
        string otherApp = _root.AddWorkingCopy("developer", "ttd", "other-app");
        RepositoryRoot.AddFile(otherApp, "settings.json", "{}");
        Directory.CreateSymbolicLink(Path.Combine(_workingCopyDirectory, "App", "ui", "linked"), otherApp);
        using AppFolder folder = OpenFolder();

        Assert.Empty(folder.ListFiles(path));
    }

    [Fact]
    public void Open_ReturnsNullWithoutAWorkingCopy()
    {
        Assert.True(WorkingCopy.TryCreate("developer", "ttd", "no-such-app", out WorkingCopy? workingCopy));

        using AppFolder? folder = AppFolder.Open(_root.Path, workingCopy);
        Assert.Null(folder);
    }

    [Fact]
    public void Open_ReturnsNullForAWorkingCopyThatIsALink()
    {
        string otherDeveloper = _root.AddWorkingCopy("other-developer", "ttd", "linked-app");
        Directory.CreateSymbolicLink(Path.Combine(_root.Path, "developer", "ttd", "linked-app"), otherDeveloper);
        Assert.True(WorkingCopy.TryCreate("developer", "ttd", "linked-app", out WorkingCopy? workingCopy));

        using AppFolder? folder = AppFolder.Open(_root.Path, workingCopy);
        Assert.Null(folder);
    }

    [Fact]
    public void CanOpenRepositoryRoot_IsFalseForAMissingDirectoryOrAFile()
    {
        string file = RepositoryRoot.AddFile(_root.Path, "file.txt", "");

        Assert.True(AppFolder.CanOpenRepositoryRoot(_root.Path));
        Assert.False(AppFolder.CanOpenRepositoryRoot(Path.Combine(_root.Path, "missing")));
        Assert.False(AppFolder.CanOpenRepositoryRoot(file));
    }

    private AppFolder OpenFolder() =>
        AppFolder.Open(_root.Path, _workingCopy) ?? throw new InvalidOperationException("No working copy.");
}
