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
/// is to delete their configuration in favor of the provisioned client - a judgment that depends on
/// scopes this tool cannot see.
/// </para>
/// </summary>
internal sealed class ExternalMaskinportenPackageDetector
{
    private const string PackageId = "Altinn.ApiClients.Maskinporten";
    private const string PackageNamespace = "Altinn.ApiClients.Maskinporten";

    /// <summary>
    /// Types whose simple name belongs unambiguously to the external package, so a bare reference is
    /// evidence on its own. Deliberately excludes <c>MaskinportenSettings</c>, whose simple name is shared
    /// with the built-in client's settings record - that overlap is the config section collision, and it is
    /// <see cref="MaskinportenSettingsCollisionDetector"/>'s job.
    /// </summary>
    private static readonly IReadOnlySet<string> _distinctiveExternalTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "SettingsJwkClientDefinition",
        "SettingsX509ClientDefinition",
        "Pkcs12ClientDefinition",
        "CertificateStoreClientDefinition",
        "MaskinportenClientDefinitionHelper",
        "ClientDefinitionInstanceKeys",
        "MaskinportenHttpMessageHandlerFactory",
    };

    /// <summary>
    /// Types from the external package whose simple names are also the obvious names for an app's own
    /// Maskinporten wrapper written against the v9 built-in client. Matching these bare would tell an app
    /// with a class called <c>MaskinportenService</c> that its build is about to break and that it should
    /// install a package it never used - so they only count in a file that imports the package's namespace.
    /// </summary>
    private static readonly IReadOnlySet<string> _ambiguousExternalTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IMaskinportenService",
        "MaskinportenService",
        "MaskinportenTokenHandler",
        "IClientDefinition",
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

    private const string ConditionalReferenceSummary =
        "This app declares the external Altinn.ApiClients.Maskinporten package behind an MSBuild condition, so "
        + "only some builds get it - while the code using it below is compiled unconditionally. v9 no longer "
        + "supplies the package transitively, so every build that does not match the condition now fails. Either "
        + "declare the reference unconditionally, or migrate to the built-in IMaskinportenClient, which every v9 "
        + "app already has and which Studio configures automatically when the app is deployed. Usages found:";

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
        var matches = _scanner.Files.SelectMany(MatchesIn).ToList();

        if (matches.Count == 0)
        {
            return new MigrationResult();
        }

        return PackageDeclaration() switch
        {
            Declaration.Unconditional => WarnOnlyDetector.Advise(OwnReferenceSummary, matches),
            Declaration.Conditional => WarnOnlyDetector.Report(ConditionalReferenceSummary, matches),
            _ => WarnOnlyDetector.Report(MissingReferenceSummary, matches),
        };
    }

    /// <summary>How the project declares the external package, if at all.</summary>
    private enum Declaration
    {
        /// <summary>No reference at all - the app relied on the transitive one and no longer compiles.</summary>
        None,

        /// <summary>Declared behind an MSBuild condition, so only some builds get it.</summary>
        Conditional,

        /// <summary>Declared for every build.</summary>
        Unconditional,
    }

    /// <summary>
    /// External-package usages in one file. The distinctive names and registration methods count on their
    /// own; the ambiguous names only once the file imports the package's namespace, which is what tells a
    /// genuine external-package consumer apart from an app that happens to have named its own v9 wrapper
    /// <c>MaskinportenService</c>.
    /// </summary>
    private IEnumerable<CSharpApiMatch> MatchesIn(ScannedCSharpFile file)
    {
        var usings = CSharpSyntaxQueries.UsingNamespaces(file, PackageNamespace).ToList();

        var matches = usings
            .Concat(CSharpSyntaxQueries.TypeReferences(file, _distinctiveExternalTypes))
            .Concat(CSharpSyntaxQueries.TypesImplementing(file, _distinctiveExternalTypes))
            .Concat(CSharpSyntaxQueries.InvokedMethods(file, _externalMethods));

        if (usings.Count > 0)
        {
            matches = matches
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _ambiguousExternalTypes))
                .Concat(CSharpSyntaxQueries.TypesImplementing(file, _ambiguousExternalTypes));
        }

        return matches;
    }

    /// <summary>
    /// How the project declares the package. A malformed or unreadable csproj is treated as
    /// <see cref="Declaration.None"/>, which produces the louder message - the safer way to be wrong, since
    /// the alternative is telling an app it is fine when its build is about to break.
    /// </summary>
    private Declaration PackageDeclaration()
    {
        XDocument document;
        try
        {
            document = XDocument.Parse(File.ReadAllText(_projectFile));
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or XmlException)
        {
            return Declaration.None;
        }

        // Descendants rather than direct ItemGroup children: a reference declared inside <Choose>/<When> or
        // a <Target> is still a declaration, and treating it as absent would tell an app that builds fine
        // that its build is about to break. Matched on local name so a legacy-format csproj carrying the
        // MSBuild default namespace is handled too.
        var references =
            document
                .Root?.Descendants()
                .Where(static element => element.Name.LocalName == "PackageReference")
                .Where(reference =>
                    string.Equals(reference.Attribute("Include")?.Value, PackageId, StringComparison.OrdinalIgnoreCase)
                )
                .ToList()
            ?? [];

        if (references.Count == 0)
        {
            return Declaration.None;
        }

        return references.Any(static reference => !IsConditional(reference))
            ? Declaration.Unconditional
            : Declaration.Conditional;
    }

    /// <summary>
    /// Whether an MSBuild condition anywhere between the element and the project root gates this reference.
    /// A reference that only applies to some configurations does not make the app safe: the C# using it is
    /// typically unconditional, so the other configurations still fail to compile.
    /// </summary>
    private static bool IsConditional(XElement reference)
    {
        for (var element = reference; element is not null; element = element.Parent)
        {
            if (!string.IsNullOrWhiteSpace(element.Attribute("Condition")?.Value))
            {
                return true;
            }
        }

        return false;
    }
}
