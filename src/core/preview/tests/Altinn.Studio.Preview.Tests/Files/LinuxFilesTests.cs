using Altinn.Studio.Preview.Files;
using Microsoft.Win32.SafeHandles;

namespace Altinn.Studio.Preview.Tests.Files;

/// <summary>
/// What the kernel refuses by itself. <see cref="AppFolder"/> refuses these paths before it asks the kernel, so these
/// tests ask the kernel directly.
/// </summary>
public sealed class LinuxFilesTests : IDisposable
{
    private readonly RepositoryRoot _root = new();
    private readonly string _workingCopyDirectory;

    public LinuxFilesTests()
    {
        _workingCopyDirectory = _root.AddWorkingCopy("developer", "ttd", "my-app");
        RepositoryRoot.AddFile(_workingCopyDirectory, "App/wwwroot/logo.svg", "<svg/>");
        RepositoryRoot.AddFile(_root.Path, "secret.txt", "secret");
    }

    public void Dispose() => _root.Dispose();

    [Theory]
    [InlineData("../../../secret.txt")]
    [InlineData("App/../../../../secret.txt")]
    [InlineData("/etc/hostname")]
    public void OpenBeneath_RefusesAPathThatLeavesTheDirectory(string path)
    {
        using SafeFileHandle directory = OpenWorkingCopy();

        using SafeFileHandle? file = LinuxFiles.OpenBeneath(directory, path, FileKind.File);

        Assert.Null(file);
    }

    [Fact]
    public void OpenBeneath_AllowsDotDotThatStaysInsideTheDirectory()
    {
        using SafeFileHandle directory = OpenWorkingCopy();

        using SafeFileHandle? file = LinuxFiles.OpenBeneath(directory, "App/../App/wwwroot/logo.svg", FileKind.File);

        Assert.NotNull(file);
    }

    [Fact]
    public void OpenBeneath_RefusesALinkInsideTheDirectory()
    {
        File.CreateSymbolicLink(Path.Combine(_workingCopyDirectory, "App", "same-logo.svg"), "wwwroot/logo.svg");
        using SafeFileHandle directory = OpenWorkingCopy();

        using SafeFileHandle? file = LinuxFiles.OpenBeneath(directory, "App/same-logo.svg", FileKind.File);

        Assert.Null(file);
    }

    [Fact]
    public void OpenBeneath_RefusesWhatIsNotOfTheKindAskedFor()
    {
        using SafeFileHandle directory = OpenWorkingCopy();

        using SafeFileHandle? notADirectory = LinuxFiles.OpenBeneath(
            directory,
            "App/wwwroot/logo.svg",
            FileKind.Directory
        );
        using SafeFileHandle? notAFile = LinuxFiles.OpenBeneath(directory, "App/wwwroot", FileKind.File);

        Assert.Null(notADirectory);
        Assert.Null(notAFile);
    }

    private SafeFileHandle OpenWorkingCopy() =>
        LinuxFiles.OpenTrustedDirectory(_workingCopyDirectory)
        ?? throw new InvalidOperationException("No working copy.");
}
