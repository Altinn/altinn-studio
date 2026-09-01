using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Warn-only detector for an app's own <c>MaskinportenSettings</c> configuration section clashing with
/// the one the platform provisions.
/// <para>
/// Every v9 app has a built-in Maskinporten client - the workflow engine's callbacks mint service owner tokens
/// through it - and Studio provisions its credentials as a <c>maskinporten-settings.json</c> file whose
/// root is a <c>MaskinportenSettings</c> section. That file is registered as a configuration source
/// <em>after</em> <c>appsettings.json</c>, so it wins; and .NET configuration merges key by key, not
/// section by section. Any app-supplied value under a key the platform also supplies is therefore
/// silently replaced in deployed environments, while the app's other keys survive - producing a hybrid
/// configuration that belongs to neither client.
/// </para>
/// <para>
/// The dangerous keys are <c>clientId</c>, <c>jwk</c> and <c>jwkBase64</c>, whichever client the app
/// meant to configure. Two shapes both end in a rejected token request:
/// <list type="bullet">
/// <item>An external-package section (<c>Environment</c>, <c>EncodedJwk</c>, ...) keeps its own key while
/// <c>clientId</c> is replaced by the provisioned one.</item>
/// <item>A built-in-shaped section pinning credentials fares no better: <c>jwkBase64</c> takes precedence
/// over a provisioned <c>jwk</c> (see <c>MaskinportenSettings.ConvertJwk</c>), so the app signs with its
/// own key and presents the provisioned client id. A <c>jwk</c> object is worse - it merges per sub-key
/// into an unusable key.</item>
/// </list>
/// A section carrying only <c>authority</c> is benign: the provisioned value simply overrides it.
/// </para>
/// <para>
/// This reads <c>appsettings*.json</c> rather than C# because the collision is a configuration fact:
/// an app can hit it with no Maskinporten code of its own, if a library it registers binds the section.
/// </para>
/// </summary>
internal sealed class MaskinportenSettingsCollisionDetector
{
    private const string SectionName = "MaskinportenSettings";

    /// <summary>
    /// Keys that only ever belong to the external package's settings shape. Their presence is what
    /// distinguishes "this app configured the external client" from "this app pinned the built-in one".
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

    /// <summary>
    /// Keys the platform-provisioned settings file also supplies, so an app-supplied value is replaced or
    /// merged at deploy time. <c>authority</c> is deliberately absent: it carries no identity, and the
    /// provisioned value overriding it is the correct outcome rather than a hazard.
    /// </summary>
    private static readonly IReadOnlySet<string> _provisionedKeys = new HashSet<string>(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "clientId",
        "jwk",
        "jwkBase64",
    };

    private readonly string _projectFolder;

    public MaskinportenSettingsCollisionDetector(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>One <c>MaskinportenSettings</c> section that overlaps the provisioned one.</summary>
    /// <param name="Detail">A <c>path: keys</c> line for the warning list.</param>
    /// <param name="LocalOnly">
    /// True for <c>appsettings.Development.json</c>, which a deployed environment never loads. Such a
    /// section is reported for awareness but must not fail the upgrade.
    /// </param>
    private sealed record SectionFinding(string Detail, bool LocalOnly);

    public MigrationResult Detect()
    {
        var externalShaped = new List<SectionFinding>();
        var provisionedOverlap = new List<SectionFinding>();

        foreach (var file in EnumerateAppSettingsFiles())
        {
            var section = ReadSectionKeys(file);
            if (section is null)
            {
                continue;
            }

            var relativePath = Path.GetRelativePath(_projectFolder, file);
            var localOnly = IsDevelopmentSettingsFile(file);

            var externalKeys = section.Where(_externalOnlyKeys.Contains).Order(StringComparer.Ordinal).ToList();
            if (externalKeys.Count > 0)
            {
                externalShaped.Add(new SectionFinding($"{relativePath}: {string.Join(", ", externalKeys)}", localOnly));
                continue;
            }

            var provisioned = section.Where(_provisionedKeys.Contains).Order(StringComparer.Ordinal).ToList();
            if (provisioned.Count > 0)
            {
                provisionedOverlap.Add(
                    new SectionFinding($"{relativePath}: {string.Join(", ", provisioned)}", localOnly)
                );
            }
        }

        var messages = new List<UpgradeMessage>();
        AppendFindings(messages, ExternalShapeSummary, externalShaped);
        AppendFindings(messages, ProvisionedOverlapSummary, provisionedOverlap);

        if (externalShaped.Concat(provisionedOverlap).Any(static finding => !finding.LocalOnly))
        {
            messages.Todo(
                "MaskinportenSettings needs manual follow-up due to a section collision. See warnings above."
            );
        }

        return new MigrationResult(messages);
    }

    private static void AppendFindings(List<UpgradeMessage> messages, string summary, List<SectionFinding> findings)
    {
        if (findings.Count == 0)
        {
            return;
        }

        messages.Warn(summary);
        messages.WarnRange(
            findings.Select(static finding =>
                finding.LocalOnly ? $"{finding.Detail} (development only - not loaded when deployed)" : finding.Detail
            )
        );
    }

    private const string ExternalShapeSummary =
        "This app configures the external Maskinporten client in a section named "
        + SectionName
        + ", which in v9 is the section the platform-provisioned Maskinporten client reads. Studio provisions "
        + "those credentials as a settings file that is applied after appsettings.json, and configuration merges "
        + "key by key - so in deployed environments the provisioned clientId replaces yours while your own key is "
        + "still used, and Maskinporten rejects the token request. Rename your own section (for example to "
        + "MaskinportenSettingsLegacy) and bind it explicitly where you register the external client; leave "
        + SectionName
        + " to the built-in client. Sections found:";

    private const string ProvisionedOverlapSummary =
        "This app supplies Maskinporten credentials under keys the platform also provisions ("
        + SectionName
        + ".clientId/jwk/jwkBase64). Studio provides these automatically at deploy time, and its settings file is "
        + "applied after appsettings.json, merging key by key - so the two sets are combined rather than one "
        + "replacing the other. A checked-in jwkBase64 takes precedence over the provisioned key while clientId "
        + "does not, leaving the app signing with its own key under the provisioned client id, which Maskinporten "
        + "rejects. Remove these keys and let the app use the provisioned credentials. (A private key in the "
        + "repository is worth removing on its own merits.) Sections found:";

    /// <summary>
    /// Whether the file is the conventional local-development settings file. Deployed environments never
    /// load it, so credentials there are a local concern rather than a deployment break.
    /// </summary>
    private static bool IsDevelopmentSettingsFile(string file) =>
        Path.GetFileName(file).Equals("appsettings.Development.json", StringComparison.OrdinalIgnoreCase);

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

            // .NET configuration keys are case-insensitive, so a section spelled "maskinportensettings"
            // binds just the same and collides just the same. Every match is merged so the result does not
            // depend on which spelling appears first.
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
