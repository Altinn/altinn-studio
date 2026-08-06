using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Warn-only detector for an app's own <c>MaskinportenSettings</c> configuration section clashing with
/// the one the platform provisions.
/// <para>
/// Every v9 app has a built-in Maskinporten client - the workflow engine's callbacks mint org tokens
/// through it - and Studio provisions its credentials as a <c>maskinporten-settings.json</c> file whose
/// root is a <c>MaskinportenSettings</c> section. That file is registered as a configuration source
/// <em>after</em> <c>appsettings.json</c>, so it wins; and .NET configuration merges key by key, not
/// section by section. An app that kept its own <c>MaskinportenSettings</c> section for the external
/// <c>Altinn.ApiClients.Maskinporten</c> package therefore ends up, in deployed environments only, with
/// the provisioned <c>clientId</c> spliced into its own credentials while its own key is still used -
/// which Maskinporten rejects. Nothing fails at startup and nothing reproduces locally (no file is
/// mounted there), so this is close to undiagnosable from the symptom. Hence a dedicated check.
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

    /// <summary>Credential-bearing keys of the built-in client's settings shape.</summary>
    private static readonly IReadOnlySet<string> _builtInSecretKeys = new HashSet<string>(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "jwk",
        "jwkBase64",
    };

    private readonly string _projectFolder;

    public MaskinportenSettingsCollisionDetector(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    public MigrationResult Detect()
    {
        var collisions = new List<string>();
        var checkedInSecrets = new List<string>();

        foreach (var file in EnumerateAppSettingsFiles())
        {
            var section = ReadSectionKeys(file);
            if (section is null)
            {
                continue;
            }

            var relativePath = Path.GetRelativePath(_projectFolder, file);

            var externalKeys = section.Where(_externalOnlyKeys.Contains).Order(StringComparer.Ordinal).ToList();
            if (externalKeys.Count > 0)
            {
                collisions.Add($"{relativePath}: {SectionName} contains {string.Join(", ", externalKeys)}");
                continue;
            }

            var secretKeys = section.Where(_builtInSecretKeys.Contains).Order(StringComparer.Ordinal).ToList();
            if (secretKeys.Count > 0)
            {
                checkedInSecrets.Add($"{relativePath}: {SectionName} contains {string.Join(", ", secretKeys)}");
            }
        }

        var warnings = new List<string>();
        var manualActionRequired = false;

        if (collisions.Count > 0)
        {
            manualActionRequired = true;
            warnings.Add(CollisionSummary);
            warnings.AddRange(collisions);
        }

        if (checkedInSecrets.Count > 0)
        {
            warnings.Add(CheckedInSecretSummary);
            warnings.AddRange(checkedInSecrets);
        }

        return new MigrationResult(manualActionRequired, warnings);
    }

    private const string CollisionSummary =
        "This app configures the external Maskinporten client in a section named "
        + SectionName
        + ", which in v9 is the section the platform-provisioned Maskinporten client reads. Studio provisions "
        + "those credentials as a settings file that is applied after appsettings.json, and configuration merges "
        + "key by key - so in deployed environments the provisioned clientId replaces yours while your own key is "
        + "still used, and Maskinporten rejects the token request. This does not reproduce locally, where no "
        + "settings file is mounted. Rename your own section (for example to MaskinportenSettingsLegacy) and bind "
        + "it explicitly where you register the external client; leave "
        + SectionName
        + " to the built-in client. Sections found:";

    private const string CheckedInSecretSummary =
        "This app supplies built-in Maskinporten client credentials in "
        + SectionName
        + ". Studio provisions these automatically when the app is deployed, so a checked-in key is usually "
        + "redundant - and a private key in the repository is worth removing on its own merits. Keep it only if "
        + "it is a local development placeholder. Sections found:";

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
            if (!BuildOutputPaths.IsBuildOutput(Path.GetRelativePath(_projectFolder, file)))
            {
                yield return file;
            }
        }
    }

    /// <summary>
    /// The property names of the file's <c>MaskinportenSettings</c> object, or <c>null</c> when the file
    /// has no such section. Unparseable files are skipped rather than reported: appsettings files legally
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

            foreach (var property in document.RootElement.EnumerateObject())
            {
                // .NET configuration keys are case-insensitive, so a section spelled
                // "maskinportensettings" binds just the same and collides just the same.
                if (
                    !string.Equals(property.Name, SectionName, StringComparison.OrdinalIgnoreCase)
                    || property.Value.ValueKind != JsonValueKind.Object
                )
                {
                    continue;
                }

                return property.Value.EnumerateObject().Select(static child => child.Name).ToList();
            }

            return null;
        }
    }
}
