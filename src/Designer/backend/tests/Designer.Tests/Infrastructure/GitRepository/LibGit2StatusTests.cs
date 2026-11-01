using System;
using System.IO;
using System.Runtime.InteropServices;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Designer.Tests.TestAttributes;
using LibGit2Sharp;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository;

/// <summary>
/// LibGit2Status passes LibGit2Sharp's repository pointers to libgit2, so it must call the copy of libgit2 that
/// LibGit2Sharp loaded and initialized. Another copy has its own global state.
/// </summary>
public class LibGit2StatusTests
{
    [Fact]
    public void CheckLibrary_TheCopyLibGit2SharpLoaded_CanBeUsed()
    {
        // The same file as LibGit2Sharp's, so the loader returns the module LibGit2Sharp has.
        nint library = NativeLibrary.Load(BundledLibGit2Path());

        Assert.Null(LibGit2Status.CheckLibrary(library));
    }

    // Linux loads a copy of a library from another path as a module of its own. Other platforms may hand back the
    // module that's already loaded.
    [SkipOnOsPlatformsFact(OsPlatformConsts.Windows, OsPlatformConsts.OSX)]
    public void CheckLibrary_AnotherCopyOfTheSameLibGit2_IsRefused()
    {
        string bundled = BundledLibGit2Path();
        string copy = Path.Combine(Directory.CreateTempSubdirectory().FullName, Path.GetFileName(bundled));
        File.Copy(bundled, copy);
        // Left loaded, as LibGit2Sharp leaves its own.
        nint library = NativeLibrary.Load(copy);

        string failure = LibGit2Status.CheckLibrary(library);

        Assert.NotNull(failure);
        Assert.Contains("not the copy LibGit2Sharp initialized", failure);
    }

    // The library LibGit2Sharp loads for this platform, from the build output, once LibGit2Sharp has loaded it.
    private static string BundledLibGit2Path()
    {
        Repository.IsValid(Path.GetTempPath());
        string name = $"git2-{GlobalSettings.Version.LibGit2CommitSha}";
        string file =
            OperatingSystem.IsWindows() ? $"{name}.dll"
            : OperatingSystem.IsMacOS() ? $"lib{name}.dylib"
            : $"lib{name}.so";
        return Path.Combine(AppContext.BaseDirectory, "runtimes", RuntimeInformation.RuntimeIdentifier, "native", file);
    }
}
