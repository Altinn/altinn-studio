using System.Text;
using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes <c>GeneralSettings:HostName</c> from the app's <c>appsettings*.json</c> files. A v9 app is given its
/// host name by what runs it: the platform sets it in every Altinn environment and studioctl sets it for a local
/// run, both overriding the file, and the library default is <c>local.altinn.cloud</c>. A value in the file only
/// goes stale, as the old localtest host <c>altinn3local.no</c> has in many apps.
///
/// The property is removed as a whole line, so the rest of the file keeps its formatting and comments. A property
/// that does not sit on a line of its own is left in place with a to-do, and so is a file the removal would leave
/// unreadable.
/// </summary>
internal sealed class GeneralSettingsHostNameMigration
{
    private const string SectionName = "GeneralSettings";
    private const string PropertyName = "HostName";

    private const string Summary =
        "Removed GeneralSettings:HostName from the appsettings files. The platform sets it in every Altinn "
        + "environment and studioctl sets it for a local run, both overriding the file, and the default is "
        + "local.altinn.cloud. Removed:";

    /// <summary>The grammar the configuration loader reads appsettings files with.</summary>
    private static readonly JsonReaderOptions _readerOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Allow,
    };

    private static readonly JsonDocumentOptions _documentOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    private readonly string _appFolder;

    /// <param name="appFolder">The folder with the app's project file and appsettings files</param>
    public GeneralSettingsHostNameMigration(string appFolder)
    {
        _appFolder = appFolder;
    }

    public async Task<MigrationResult> Migrate()
    {
        var removed = new List<string>();
        var todos = new List<UpgradeMessage>();
        foreach (var file in EnumerateAppSettingsFiles())
        {
            await Migrate(file, removed, todos);
        }

        var messages = new List<UpgradeMessage>();
        if (removed.Count > 0)
        {
            messages.Warn(Summary);
            messages.WarnRange(removed);
        }

        messages.AddRange(todos);
        return new MigrationResult(messages);
    }

    private async Task Migrate(string file, List<string> removed, List<UpgradeMessage> todos)
    {
        var relativeFile = Path.GetRelativePath(_appFolder, file);
        string original;
        bool hadBom;
        try
        {
            (original, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(file));
        }
        catch (DecoderFallbackException)
        {
            // Not UTF-8, so not a file the configuration loader reads either.
            return;
        }

        if (!original.Contains(PropertyName, StringComparison.OrdinalIgnoreCase))
            return;

        var json = Encoding.UTF8.GetBytes(original);
        List<HostNameProperty> properties;
        try
        {
            properties = Find(json);
        }
        catch (JsonException)
        {
            // Unreadable as configuration already; the app reports that when it starts.
            return;
        }

        var buffer = new List<byte>(json);
        var removedFromFile = new List<string>();
        // Back to front, so the offsets of the properties still to go stay valid.
        for (var i = properties.Count - 1; i >= 0; i--)
        {
            var property = properties[i];
            if (TryRemoveLine(buffer, property))
            {
                removedFromFile.Insert(0, $"{relativeFile}: {SectionName}:{PropertyName} = {property.RawValue}");
            }
            else
            {
                todos.Todo(
                    $"{relativeFile}: {SectionName}:{PropertyName} does not sit on a line of its own, so it was left "
                        + "in place. Remove it: the platform and studioctl set the host name of a v9 app."
                );
            }
        }

        if (removedFromFile.Count == 0)
            return;

        var result = Encoding.UTF8.GetString([.. buffer]);
        try
        {
            using var _ = JsonDocument.Parse(result, _documentOptions);
        }
        catch (JsonException ex)
        {
            todos.Todo(
                $"{relativeFile}: removing {SectionName}:{PropertyName} would leave invalid JSON ({ex.Message}), so "
                    + "the file was left unchanged. Remove it: the platform and studioctl set the host name of a v9 app."
            );
            return;
        }

        await Utf8TextFile.Write(file, result, hadBom);
        removed.AddRange(removedFromFile);
    }

    /// <summary>
    /// A <c>HostName</c> property directly inside the root <c>GeneralSettings</c> object, as byte offsets into the
    /// file. <see cref="PreviousValueEnd"/> is where the property before it in the same object ends, or -1 when it
    /// is the first.
    /// </summary>
    private readonly record struct HostNameProperty(int NameStart, int ValueEnd, int PreviousValueEnd, string RawValue);

    /// <summary>Configuration keys are case-insensitive, so the section and the key are matched that way.</summary>
    private static List<HostNameProperty> Find(byte[] json)
    {
        var found = new List<HostNameProperty>();
        var reader = new Utf8JsonReader(json, _readerOptions);
        var inSection = false;
        var previousValueEnd = -1;
        while (reader.Read())
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
                continue;

            if (reader.CurrentDepth == 1)
            {
                inSection = string.Equals(reader.GetString(), SectionName, StringComparison.OrdinalIgnoreCase);
                previousValueEnd = -1;
                continue;
            }

            if (!inSection || reader.CurrentDepth != 2)
                continue;

            var nameStart = checked((int)reader.TokenStartIndex);
            var isHostName = string.Equals(reader.GetString(), PropertyName, StringComparison.OrdinalIgnoreCase);
            do
            {
                reader.Read();
            } while (reader.TokenType == JsonTokenType.Comment);

            var valueStart = checked((int)reader.TokenStartIndex);
            if (reader.TokenType is JsonTokenType.StartObject or JsonTokenType.StartArray)
                reader.Skip();

            var valueEnd = checked((int)reader.BytesConsumed);
            if (isHostName)
            {
                var rawValue = Encoding.UTF8.GetString(json, valueStart, valueEnd - valueStart);
                found.Add(new HostNameProperty(nameStart, valueEnd, previousValueEnd, rawValue));
            }

            previousValueEnd = valueEnd;
        }

        return found;
    }

    /// <summary>
    /// Removes the line holding <paramref name="property"/> when nothing else is on it but whitespace, its comma
    /// and a line comment. Removing the last property of the object also removes the comma after the one before.
    /// </summary>
    private static bool TryRemoveLine(List<byte> buffer, HostNameProperty property)
    {
        var lineStart = property.NameStart;
        while (lineStart > 0 && buffer[lineStart - 1] is (byte)' ' or (byte)'\t')
            lineStart--;
        if (lineStart > 0 && buffer[lineStart - 1] != '\n')
            return false;

        var lineEnd = SkipBlanks(buffer, property.ValueEnd);
        var hasComma = lineEnd < buffer.Count && buffer[lineEnd] == ',';
        if (hasComma)
            lineEnd = SkipBlanks(buffer, lineEnd + 1);
        if (IsAt(buffer, lineEnd, "//"))
        {
            while (lineEnd < buffer.Count && buffer[lineEnd] != '\n')
                lineEnd++;
        }

        if (lineEnd < buffer.Count && buffer[lineEnd] == '\r')
            lineEnd++;
        if (lineEnd < buffer.Count)
        {
            if (buffer[lineEnd] != '\n')
                return false;
            lineEnd++;
        }

        // Without a comma the property must close the object, or the comma is on a line further down.
        if (!hasComma)
        {
            var next = SkipTrivia(buffer, lineEnd);
            if (next >= buffer.Count || buffer[next] != '}')
                return false;
        }

        buffer.RemoveRange(lineStart, lineEnd - lineStart);

        if (!hasComma && property.PreviousValueEnd >= 0)
        {
            var comma = SkipTrivia(buffer, property.PreviousValueEnd);
            if (comma < buffer.Count && buffer[comma] == ',')
                buffer.RemoveAt(comma);
        }

        return true;
    }

    private static int SkipBlanks(List<byte> buffer, int index)
    {
        while (index < buffer.Count && buffer[index] is (byte)' ' or (byte)'\t')
            index++;
        return index;
    }

    /// <summary>Skips whitespace and comments.</summary>
    private static int SkipTrivia(List<byte> buffer, int index)
    {
        while (index < buffer.Count)
        {
            if (buffer[index] is (byte)' ' or (byte)'\t' or (byte)'\r' or (byte)'\n')
            {
                index++;
            }
            else if (IsAt(buffer, index, "//"))
            {
                while (index < buffer.Count && buffer[index] != '\n')
                    index++;
            }
            else if (IsAt(buffer, index, "/*"))
            {
                index += 2;
                while (index < buffer.Count && !IsAt(buffer, index, "*/"))
                    index++;
                index += 2;
            }
            else
            {
                break;
            }
        }

        return index;
    }

    private static bool IsAt(List<byte> buffer, int index, string ascii)
    {
        if (index + ascii.Length > buffer.Count)
            return false;
        for (var i = 0; i < ascii.Length; i++)
        {
            if (buffer[index + i] != ascii[i])
                return false;
        }

        return true;
    }

    private IEnumerable<string> EnumerateAppSettingsFiles()
    {
        if (!Directory.Exists(_appFolder))
            return [];

        return Directory
            .EnumerateFiles(_appFolder, "appsettings*.json", SearchOption.TopDirectoryOnly)
            .Order(StringComparer.Ordinal);
    }
}
