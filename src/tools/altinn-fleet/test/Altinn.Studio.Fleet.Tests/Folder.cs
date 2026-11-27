using System.Diagnostics;

namespace Altinn.Studio.Fleet.Tests;

/// <summary>Helpers for the folders a test works in.</summary>
internal static class Folder
{
    public static string CreateTemporary()
    {
        string path = Path.Join(Path.GetTempPath(), "fleet-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return path;
    }

    /// <summary>
    /// What agentctl's copy volumes compare to decide whether a folder changed: every entry's path, type, size, mode,
    /// modification and change times and inode, the folder's own included. Linux only, since it uses GNU find.
    /// </summary>
    public static string Fingerprint(string path)
    {
        var start = new ProcessStartInfo("find") { RedirectStandardOutput = true, UseShellExecute = false };
        foreach (string arg in (string[])[path, "-printf", "%P|%y|%s|%m|%T@|%C@|%i\n"])
        {
            start.ArgumentList.Add(arg);
        }

        using Process process = Process.Start(start)!;
        string output = process.StandardOutput.ReadToEnd();
        process.WaitForExit();
        Assert.Equal(0, process.ExitCode);
        return string.Join('\n', output.Split('\n').Order(StringComparer.Ordinal));
    }

    public static string[] Tree(string path) =>
        [
            .. Directory
                .EnumerateFileSystemEntries(path, "*", SearchOption.AllDirectories)
                .Select(p => Path.GetRelativePath(path, p).Replace('\\', '/'))
                .Order(StringComparer.Ordinal),
        ];
}
