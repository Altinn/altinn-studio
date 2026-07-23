namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Helper for skipping build output (<c>bin</c>/<c>obj</c>) when walking an app's source tree, so
/// migrations never read or rewrite generated files.
/// </summary>
internal static class BuildOutputPaths
{
    /// <summary>
    /// True if <paramref name="relativePath"/> lives under a <c>bin</c> or <c>obj</c> directory at any
    /// depth. The path is expected relative to the scanned root, using either platform separator.
    /// </summary>
    public static bool IsBuildOutput(string relativePath)
    {
        var segments = relativePath.Split(
            new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar },
            StringSplitOptions.RemoveEmptyEntries
        );
        return Array.Exists(
            segments,
            static segment =>
                segment.Equals("bin", StringComparison.OrdinalIgnoreCase)
                || segment.Equals("obj", StringComparison.OrdinalIgnoreCase)
        );
    }
}
