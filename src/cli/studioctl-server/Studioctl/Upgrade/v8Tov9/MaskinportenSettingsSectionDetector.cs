using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// <para>Warn-only detector for the configuration the built-in Maskinporten client was fed in v8 and that v9
/// never reads. An app has one Maskinporten identity, the client Studio provisions for it, and the app
/// libraries read those credentials from the provisioned settings file rather than from the app's
/// configuration - so every section below is inert, and one holding a private key is a key in the
/// repository for no reason.</para>
/// <para>Two tiers, because they differ in confidence. The <b>bound</b> sections are known: the paths the code
/// handed to <c>ConfigureMaskinportenClient</c> or the Fiks builder's <c>WithMaskinportenConfig</c>, which is
/// how a v8 app pointed the built-in client at a section of its own (<c>my-app--MaskinportenSettings</c> was
/// the convention), plus the default <c>MaskinportenSettings</c> section the client bound when nothing was
/// configured. The <b>leftovers</b> are objects nothing binds but that carry the built-in model's own keys -
/// <c>jwk</c> or <c>jwkBase64</c>, which the external package spells differently, or <c>authority</c> under a
/// name that says Maskinporten. An <c>authority</c> on its own is not evidence: OpenID Connect options use
/// that key too, and would be the false positive.</para>
/// <para>Every hit names its file and configuration path, so the section can be pasted into
/// <c>studioctl app maskinporten set</c> before it is deleted - the one thing a developer may still want
/// from it. An object configuring the external
/// <c>Altinn.ApiClients.Maskinporten</c> package is still read by that package and is not reported - unless
/// the code explicitly bound the built-in client to it, in which case the binding is what is dead.</para>
/// </summary>
internal sealed class MaskinportenSettingsSectionDetector
{
    private const string DefaultSectionName = "MaskinportenSettings";

    /// <summary>
    /// Keys that only ever belong to the external package's settings shape.
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
    /// Keys only the built-in client's settings model ever had. The external package's key is <c>EncodedJwk</c>.
    /// </summary>
    private static readonly IReadOnlySet<string> _builtInOnlyKeys = new HashSet<string>(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "jwk",
        "jwkBase64",
    };

    private const string BoundSummary =
        "This app fed the built-in Maskinporten client from these configuration sections, which v9 never reads. "
        + "An app has one Maskinporten identity, the client Studio provisions for it, and the app libraries read "
        + "those credentials from the provisioned settings file rather than from the app's configuration. Delete "
        + "the sections; if one holds a private key, that key is worth removing from the repository on its own "
        + "merits. If one holds the client you use for local runs, paste the section into studioctl app "
        + "maskinporten set first, and studioctl provisions the client to the app for local runs the way Studio "
        + "does when the app is deployed. One exception: a default MaskinportenSettings section that configures "
        + "the external Altinn.ApiClients.Maskinporten package, with its Environment and key kept in user "
        + "secrets or a key vault, is still read by that package - keep it. Sections found:";

    private const string LeftoverSummary =
        "These configuration objects look like credentials for the built-in Maskinporten client - they carry "
        + "the keys its settings had - but nothing in the app binds them, and v9 reads nothing there either. "
        + "Most likely leftovers: delete them, and if one is the client you use for local runs, paste it into "
        + "studioctl app maskinporten set first. (An object configuring the external "
        + "Altinn.ApiClients.Maskinporten package is still read by that package and is not reported.) "
        + "Objects found:";

    private readonly string _projectFolder;
    private readonly IReadOnlySet<string> _boundSections;

    /// <param name="projectFolder">The app repository root; settings files are found anywhere beneath it.</param>
    /// <param name="boundSections">
    /// The configuration section paths the code bound the built-in client to (from
    /// <see cref="MaskinportenClientOverrideDetector.NamedSections"/>). The default section is always included.
    /// </param>
    public MaskinportenSettingsSectionDetector(string projectFolder, IReadOnlySet<string>? boundSections = null)
    {
        _projectFolder = projectFolder;
        var sections = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DefaultSectionName };
        if (boundSections is not null)
        {
            sections.UnionWith(boundSections);
        }
        _boundSections = sections;
    }

    public MigrationResult Detect()
    {
        var bound = new List<string>();
        var leftovers = new List<string>();

        foreach (var file in EnumerateAppSettingsFiles())
        {
            using var document = TryParse(file);
            if (document is null || document.RootElement.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var relativeFile = Path.GetRelativePath(_projectFolder, file);
            var matched = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var section in _boundSections.Order(StringComparer.OrdinalIgnoreCase))
            {
                if (!TryResolve(document.RootElement, section, out var element, out var actualPath))
                {
                    continue;
                }

                matched.Add(actualPath);
                // The default section was bound implicitly; shaped for the external package, it is that package's
                // to read. A built-in-only key (jwkBase64, say) beside external keys says the built-in client was
                // meant, whatever else is there. A section the code named explicitly is dead whatever its shape.
                var isDefault = string.Equals(section, DefaultSectionName, StringComparison.OrdinalIgnoreCase);
                if (isDefault && HasAnyKey(element, _externalOnlyKeys) && !HasAnyKey(element, _builtInOnlyKeys))
                {
                    continue;
                }

                bound.Add(Describe(relativeFile, actualPath));
            }

            foreach (var (path, element) in EnumerateObjects(document.RootElement, parentPath: null))
            {
                if (matched.Contains(path) || IsUnderAny(path, matched))
                {
                    continue;
                }
                if (LooksLikeBuiltInCredentials(element, path) && !IsExternalPackageObject(element))
                {
                    leftovers.Add(Describe(relativeFile, path));
                }
            }
        }

        var messages = new List<UpgradeMessage>();
        if (bound.Count > 0)
        {
            messages.Warn(BoundSummary);
            messages.WarnRange(bound);
        }
        if (leftovers.Count > 0)
        {
            messages.Warn(LeftoverSummary);
            messages.WarnRange(leftovers);
        }

        return new MigrationResult(messages);
    }

    private static string Describe(string relativeFile, string path) => $"{relativeFile}: {path}";

    /// <summary>
    /// The object at a configuration path, matched the way .NET configuration matches: case-insensitively,
    /// with <c>:</c> separating levels. The JSON provider flattens <c>"a:b": { "c": ... }</c> and nested
    /// <c>a → b → c</c> to the same path, so at each level the longest key that is a prefix of the remaining
    /// path is taken before descending.
    /// </summary>
    private static bool TryResolve(JsonElement root, string path, out JsonElement element, out string actualPath)
    {
        element = root;
        actualPath = string.Empty;
        var segments = path.Split(':');
        var consumed = 0;

        while (consumed < segments.Length)
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            var found = false;
            for (var take = segments.Length - consumed; take >= 1; take--)
            {
                var candidate = string.Join(':', segments, consumed, take);
                if (TryGetProperty(element, candidate, out var next, out var nextName))
                {
                    element = next;
                    actualPath = Join(actualPath, nextName);
                    consumed += take;
                    found = true;
                    break;
                }
            }
            if (!found)
            {
                return false;
            }
        }

        return element.ValueKind == JsonValueKind.Object;
    }

    private static bool TryGetProperty(JsonElement element, string name, out JsonElement value, out string actualName)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                actualName = property.Name;
                return true;
            }
        }

        value = default;
        actualName = string.Empty;
        return false;
    }

    private static string Join(string parent, string name) => parent.Length == 0 ? name : parent + ":" + name;

    private static IEnumerable<(string Path, JsonElement Element)> EnumerateObjects(
        JsonElement element,
        string? parentPath
    )
    {
        foreach (var property in element.EnumerateObject())
        {
            if (property.Value.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var path = parentPath is null ? property.Name : parentPath + ":" + property.Name;
            yield return (path, property.Value);
            foreach (var nested in EnumerateObjects(property.Value, path))
            {
                yield return nested;
            }
        }
    }

    private static bool IsUnderAny(string path, IEnumerable<string> parents) =>
        parents.Any(parent => path.StartsWith(parent + ":", StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Whether an object carries the built-in client's own keys: a <c>jwk</c>/<c>jwkBase64</c> (names only that
    /// model had), or an <c>authority</c> under a name that says Maskinporten. <c>authority</c> alone is what
    /// OpenID Connect options are configured with, so it is deliberately not enough.
    /// </summary>
    private static bool LooksLikeBuiltInCredentials(JsonElement element, string path)
    {
        if (HasAnyKey(element, _builtInOnlyKeys))
        {
            return true;
        }

        return HasKey(element, "authority") && path.Contains("maskinporten", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Whether an object is the external package's, so that package still reads it. A built-in-only key
    /// beside external ones says otherwise: the built-in client was meant, and the object is dead.
    /// </summary>
    private static bool IsExternalPackageObject(JsonElement element) =>
        HasAnyKey(element, _externalOnlyKeys) && !HasAnyKey(element, _builtInOnlyKeys);

    private static bool HasKey(JsonElement element, string key) =>
        element
            .EnumerateObject()
            .Any(property => string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase));

    private static bool HasAnyKey(JsonElement element, IReadOnlySet<string> keys) =>
        element.EnumerateObject().Any(property => keys.Contains(property.Name));

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
        return segments.Any(static segment =>
            segment.Equals("node_modules", StringComparison.OrdinalIgnoreCase)
            || segment.Equals(".git", StringComparison.Ordinal)
        );
    }

    /// <summary>
    /// The parsed file, or <c>null</c> when it cannot be read. Unparsable files are skipped rather than
    /// reported: appsettings files legally contain comments and trailing commas, and a JSON complaint from
    /// an upgrade step about Maskinporten would be a confusing way to learn that.
    /// </summary>
    private static JsonDocument? TryParse(string file)
    {
        try
        {
            var options = new JsonDocumentOptions
            {
                CommentHandling = JsonCommentHandling.Skip,
                AllowTrailingCommas = true,
            };
            return JsonDocument.Parse(File.ReadAllText(file), options);
        }
        catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }
}
