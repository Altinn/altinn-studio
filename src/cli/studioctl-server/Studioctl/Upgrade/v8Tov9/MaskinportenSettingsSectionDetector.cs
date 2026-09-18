using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Warn-only detector for a <c>MaskinportenSettings</c> configuration section that no longer does anything.
/// <para>
/// In v9 an app has exactly one Maskinporten identity, and Studio provisions its credentials as a
/// <c>maskinporten-settings.json</c> file that the app libraries read through a configuration root of their
/// own. The app's configuration is not a Maskinporten configuration surface at all any more: a section named
/// <c>MaskinportenSettings</c> is simply never read, and one carrying a private key is a key in the
/// repository doing nothing.
/// </para>
/// <para>
/// The exception is the external <c>Altinn.ApiClients.Maskinporten</c> package, whose own convention is a
/// section of that name. Its settings shape is distinguishable by keys the app libraries never had
/// (<c>Environment</c>, <c>EncodedJwk</c>, ...), and it is live configuration - the package is the supported
/// way to bring your own credentials now that the provisioned ones no longer transit the app's configuration
/// - so such a section is left alone.
/// </para>
/// <para>
/// This reads <c>appsettings*.json</c> rather than C#, because a dead section is a configuration fact: an
/// app can carry one with no Maskinporten code of its own.
/// </para>
/// </summary>
internal sealed class MaskinportenSettingsSectionDetector
{
    private const string SectionName = "MaskinportenSettings";

    /// <summary>
    /// Keys that only ever belong to the external package's settings shape. Their presence is what
    /// distinguishes "this app configures the external client" from "this section is left over from v8".
    /// </summary>
    private static readonly IReadOnlySet<string> _externalOnlyKeys = new HashSet<string>(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Environment",
        "EncodedJwk",
        "EncodedX509",
        "CertificatePkcs12Path",
        "CertificatePkcs12Password",
        "CertificateStoreThumbprint",
        "ExhangeToAltinnToken",
        "Scope",
        "ConsumerOrgNo",
        "EnterpriseUserName",
        "EnterpriseUserPassword",
        "EnableDebugLogging",
        "ClientKey",
    };

    private const string Summary =
        "This app has a "
        + SectionName
        + " configuration section that v9 never reads. An app has one Maskinporten identity, the client "
        + "Studio provisions for it, and the app libraries read those credentials from the provisioned "
        + "settings file rather than from the app's configuration. Delete the section; if it holds a private "
        + "key, that key is worth removing from the repository on its own merits. (A section configuring the "
        + "external Altinn.ApiClients.Maskinporten package is still read by that package and is not reported.) "
        + "Sections found:";

    private readonly string _projectFolder;

    public MaskinportenSettingsSectionDetector(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    public MigrationResult Detect()
    {
        var deadSections = new List<string>();

        foreach (var file in EnumerateAppSettingsFiles())
        {
            var section = ReadSectionKeys(file);
            if (section is null || section.Any(_externalOnlyKeys.Contains))
            {
                continue;
            }

            deadSections.Add(Path.GetRelativePath(_projectFolder, file));
        }

        var messages = new List<UpgradeMessage>();
        if (deadSections.Count > 0)
        {
            messages.Warn(Summary);
            messages.WarnRange(deadSections);
        }

        return new MigrationResult(messages);
    }

    private IEnumerable<string> EnumerateAppSettingsFiles()
    {
        if (!Directory.Exists(_projectFolder))
        {
            yield break;
        }

        var files = Directory
            .EnumerateFiles(_projectFolder, "appsettings*.json", SearchOption.AllDirectories)
            .Order(StringComparer.Ordinal);

        foreach (var file in files)
        {
            if (!IsIgnoredPath(Path.GetRelativePath(_projectFolder, file)))
            {
                yield return file;
            }
        }
    }

    /// <summary>
    /// Build output and vendored dependency trees. A settings file inside <c>node_modules</c> belongs to a
    /// third-party package, and attributing its configuration to the app would be a false report.
    /// </summary>
    private static bool IsIgnoredPath(string relativePath)
    {
        if (BuildOutputPaths.IsBuildOutput(relativePath))
        {
            return true;
        }

        var segments = relativePath.Split(
            new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar },
            StringSplitOptions.RemoveEmptyEntries
        );

        return Array.Exists(
            segments,
            static segment =>
                segment.Equals("node_modules", StringComparison.OrdinalIgnoreCase)
                || segment.Equals(".git", StringComparison.Ordinal)
        );
    }

    /// <summary>
    /// The property names of the file's <c>MaskinportenSettings</c> object, or <c>null</c> when the file
    /// has no such section. Unparsable files are skipped rather than reported: appsettings files legally
    /// contain comments and trailing commas, and a JSON complaint from an upgrade step about Maskinporten
    /// would be a confusing way to learn that.
    /// </summary>
    private static IReadOnlyCollection<string>? ReadSectionKeys(string file)
    {
        JsonDocument document;
        try
        {
            var options = new JsonDocumentOptions
            {
                CommentHandling = JsonCommentHandling.Skip,
                AllowTrailingCommas = true,
            };
            document = JsonDocument.Parse(File.ReadAllText(file), options);
        }
        catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
        {
            return null;
        }

        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            // .NET configuration keys are case-insensitive, so a section spelled "maskinportensettings" is
            // the same section. Every match is merged so the result does not depend on which spelling
            // appears first.
            var keys = new List<string>();
            var found = false;

            foreach (var property in document.RootElement.EnumerateObject())
            {
                if (
                    !string.Equals(property.Name, SectionName, StringComparison.OrdinalIgnoreCase)
                    || property.Value.ValueKind != JsonValueKind.Object
                )
                {
                    continue;
                }

                found = true;
                keys.AddRange(property.Value.EnumerateObject().Select(static child => child.Name));
            }

            return found ? keys : null;
        }
    }
}
