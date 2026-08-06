using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Detector for app code using the external <c>Altinn.ApiClients.Maskinporten</c> package. In v8 that
/// package reached apps transitively through <c>Altinn.App.Core</c>; in v9 it is gone, so an app that
/// used it without declaring it no longer compiles.
/// <para>
/// The severity depends on the project file, which is why this reads the csproj as well as the source.
/// An app that declares its own <c>PackageReference</c> keeps working and is only nudged towards the
/// built-in client (no manual action). An app that relied on the transitive reference is broken and is
/// told so, with both ways out. Either way nothing is rewritten: the two clients differ in credential
/// model (JWK only, versus the external package's PKCS#12 paths, certificate-store thumbprints and
/// enterprise-user credentials) and in where scopes are declared, and the right migration for most apps
/// is to delete their configuration in favour of the provisioned client - a judgement that depends on
/// scopes this tool cannot see.
/// </para>
/// </summary>
internal sealed class ExternalMaskinportenPackageDetector
{
    private const string PackageId = "Altinn.ApiClients.Maskinporten";
    private const string PackageNamespace = "Altinn.ApiClients.Maskinporten";

    /// <summary>
    /// Types unique to the external package. Deliberately excludes <c>MaskinportenSettings</c>, whose
    /// simple name is shared with the built-in client's settings record - that overlap is the config
    /// section collision, and it is <see cref="MaskinportenSettingsCollisionDetector"/>'s job.
    /// </summary>
    private static readonly IReadOnlySet<string> _externalTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IMaskinportenService",
        "MaskinportenService",
        "SettingsJwkClientDefinition",
        "SettingsX509ClientDefinition",
        "MaskinportenClientDefinitionHelper",
        "MaskinportenTokenHandler",
        "ClientDefinitionInstanceKeys",
        "MaskinportenHttpMessageHandlerFactory",
    };

    /// <summary>
    /// Registration methods unique to the external package. <c>AddMaskinportenHttpMessageHandler</c> is
    /// deliberately absent: the built-in client exposes a method of the same name, so matching it would
    /// flag correct v9 code.
    /// </summary>
    private static readonly IReadOnlySet<string> _externalMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "AddMaskinportenHttpClient",
        "RegisterMaskinportenClientDefinition",
        "AddClientDefinitionInstance",
    };

    private const string MissingReferenceSummary =
        "This app uses the external Altinn.ApiClients.Maskinporten package, which v8 supplied transitively "
        + "through Altinn.App.Core. v9 no longer depends on it, so these files will not compile as-is. Either "
        + "declare the package explicitly in App.csproj (<PackageReference Include=\""
        + PackageId
        + "\" Version=\"...\" />), or migrate to the built-in IMaskinportenClient, which every v9 app already has "
        + "and which Studio configures automatically when the app is deployed. If you keep the external package, "
        + "make sure your own settings do not live in a configuration section named MaskinportenSettings - that "
        + "name is now owned by the provisioned client. Usages found:";

    private const string OwnReferenceSummary =
        "This app declares its own Altinn.ApiClients.Maskinporten package reference, so the code below keeps "
        + "working in v9 - no action is required. Worth knowing: every v9 app now has a built-in "
        + "IMaskinportenClient, configured automatically when the app is deployed from Studio, so the external "
        + "package is a second set of credentials to maintain and rotate. Migrating to the built-in client "
        + "(GetAccessToken/GetAltinnExchangedToken, or UseMaskinportenAuthorization on an HttpClient "
        + "registration) lets you retire your own client registration and key. Usages found:";

    private readonly CSharpSourceScanner _scanner;
    private readonly string _projectFile;

    public ExternalMaskinportenPackageDetector(CSharpSourceScanner scanner, string projectFile)
    {
        _scanner = scanner;
        _projectFile = projectFile;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner
            .Files.SelectMany(file =>
                CSharpSyntaxQueries
                    .UsingNamespaces(file, PackageNamespace)
                    .Concat(CSharpSyntaxQueries.TypeReferences(file, _externalTypes))
                    .Concat(CSharpSyntaxQueries.TypesImplementing(file, _externalTypes))
                    .Concat(CSharpSyntaxQueries.InvokedMethods(file, _externalMethods))
            )
            .ToList();

        if (matches.Count == 0)
        {
            return new MigrationResult(ManualActionRequired: false, Array.Empty<string>());
        }

        return DeclaresPackageReference()
            ? WarnOnlyDetector.Advise(OwnReferenceSummary, matches)
            : WarnOnlyDetector.Report(MissingReferenceSummary, matches);
    }

    /// <summary>
    /// Whether the project declares the package itself. A malformed or unreadable csproj is treated as
    /// "not declared", which produces the louder of the two messages - the safer way to be wrong, since
    /// the alternative is telling an app it is fine when its build is about to break.
    /// </summary>
    private bool DeclaresPackageReference()
    {
        XDocument document;
        try
        {
            document = XDocument.Parse(File.ReadAllText(_projectFile));
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or XmlException)
        {
            return false;
        }

        return document
                .Root?.Elements("ItemGroup")
                .Elements("PackageReference")
                .Any(reference =>
                    string.Equals(reference.Attribute("Include")?.Value, PackageId, StringComparison.OrdinalIgnoreCase)
                )
            ?? false;
    }
}
