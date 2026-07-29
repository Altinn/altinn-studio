using System.Diagnostics;
using Xunit;

namespace Altinn.App.Tests.Common;

internal sealed class KubernetesProjectedVolume
{
    // Kubernetes writes Secret/projected volume payloads into timestamped hidden directories and keeps the
    // visible files pointing through ..data. Updates are published by renaming the ..data_tmp symlink over ..data.
    // The exact timestamp-like directory names below are representative fixtures; the symlink swap is the behavior under test.
    public const string InitialVersionDirectoryName = "..2026_06_15_10_00_00.000000001";
    public const string UpdatedVersionDirectoryName = "..2026_06_15_10_00_10.000000002";

    private const string DataSymlinkName = "..data";

    public KubernetesProjectedVolume(string path)
    {
        Assert.True(OperatingSystem.IsLinux(), $"{nameof(KubernetesProjectedVolume)} can only be used on Linux.");
        Path = path;
    }

    public string Path { get; }

    public void WriteVersion(string versionDirectoryName, string fileName, string content)
    {
        string versionDirectory = System.IO.Path.Join(Path, versionDirectoryName);
        Directory.CreateDirectory(versionDirectory);
        File.WriteAllText(System.IO.Path.Join(versionDirectory, fileName), content);
    }

    public void CreateSymlinks(string versionDirectoryName, string fileName)
    {
        Directory.CreateSymbolicLink(System.IO.Path.Join(Path, DataSymlinkName), versionDirectoryName);
        File.CreateSymbolicLink(System.IO.Path.Join(Path, fileName), System.IO.Path.Join(DataSymlinkName, fileName));
    }

    public void SwapDataSymlink(string versionDirectoryName)
    {
        string dataLinkPath = System.IO.Path.Join(Path, DataSymlinkName);
        string newDataLinkPath = System.IO.Path.Join(Path, $"{DataSymlinkName}_tmp");
        Directory.CreateSymbolicLink(newDataLinkPath, versionDirectoryName);

        using var process = Process.Start(
            new ProcessStartInfo
            {
                FileName = "/usr/bin/mv",
                RedirectStandardError = true,
                UseShellExecute = false,
                ArgumentList = { "-Tf", newDataLinkPath, dataLinkPath },
            }
        );
        Assert.NotNull(process);
        string standardError = process.StandardError.ReadToEnd();
        process.WaitForExit();
        Assert.True(
            process.ExitCode == 0,
            $"Failed to atomically replace {DataSymlinkName} with {DataSymlinkName}_tmp: {standardError}"
        );
    }
}
