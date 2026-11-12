using System;
using System.Collections.Generic;

namespace Altinn.Studio.Common.Domain.App;

// Reads a V9Description, whether or not the app turns out to be on v9.
internal sealed class V9DescriptionReader : IAppSourceReader
{
    private const string UiDirectory = "App/ui/";
    private const string SettingsFile = "Settings.json";

    private readonly SortedSet<string> _uiFolders = new(StringComparer.Ordinal);

    /// <inheritdoc />
    public bool Accepts(AppFilePath path) => UiFolder(path) is not null;

    /// <inheritdoc />
    public void Read(AppFilePath path, ReadOnlyMemory<byte> content) => Add(path);

    /// <inheritdoc />
    public void Read(AppFilePath path, string content) => Add(path);

    /// <summary>Describes the app from the files read so far.</summary>
    public V9Description Build() => new([.. _uiFolders]);

    private void Add(AppFilePath path)
    {
        if (UiFolder(path) is { } folder)
        {
            _uiFolders.Add(folder);
        }
    }

    // The folder of App/ui/{folder}/Settings.json.
    private static string? UiFolder(AppFilePath path)
    {
        bool matches =
            string.Equals(path.FileName, SettingsFile, StringComparison.OrdinalIgnoreCase)
            && path.Directory.Length > UiDirectory.Length
            && path.Directory.StartsWith(UiDirectory, StringComparison.OrdinalIgnoreCase)
            && path.Directory.IndexOf('/', UiDirectory.Length) < 0;
        return matches ? path.Directory.Substring(UiDirectory.Length) : null;
    }
}
