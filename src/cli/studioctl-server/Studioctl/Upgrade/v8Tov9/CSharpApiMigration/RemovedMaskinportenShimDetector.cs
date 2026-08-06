namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the obsolete Maskinporten surface that <c>Altinn.App.Core</c> used to expose
/// as a thin shim over the external <c>Altinn.ApiClients.Maskinporten</c> package: the
/// <c>IMaskinportenTokenProvider</c>/<c>MaskinportenJwkTokenProvider</c> pair, the
/// <c>AddMaskinportenJwkTokenProvider</c> registration, the <c>IX509CertificateProvider</c> abstraction,
/// and the <c>EformidlingStatusCheckEventHandler</c> that consumed them. All of these are gone in v9.
/// The Maskinporten types are replaced by the built-in <c>IMaskinportenClient</c>; the eFormidling handler
/// is not, so it is reported separately and pointed at <c>AddEFormidlingServices2</c>.
/// <para>
/// Unlike <see cref="ExternalMaskinportenPackageDetector"/>, no NuGet reference can bring these back -
/// they were app-lib types, not package types - so this is always a hard break requiring a port. The
/// port is not mechanical: the built-in client authenticates with a JWK only, so an app on a PKCS#12
/// certificate or a certificate-store thumbprint needs a new key registered in Maskinporten before it
/// can move over. Hence reporting rather than rewriting.
/// </para>
/// </summary>
internal sealed class RemovedMaskinportenShimDetector
{
    private static readonly IReadOnlySet<string> _removedMaskinportenTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IMaskinportenTokenProvider",
        "MaskinportenJwkTokenProvider",
        "IX509CertificateProvider",
    };

    // Only the registration extension is matched by name. The removed provider's own methods (`GetToken`,
    // `GetAltinnExchangedToken`) are deliberately not: `GetAltinnExchangedToken` is also a method on the
    // replacement IMaskinportenClient, so matching it would flag exactly the code apps are being told to
    // write. Call sites are reached via the interface reference instead.
    private static readonly IReadOnlySet<string> _removedMaskinportenMethods = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "AddMaskinportenJwkTokenProvider",
    };

    // The eFormidling status check handlers. Both fell out of the app-facing surface with the Maskinporten
    // shim they consumed, but their replacement is an eFormidling one, so they are reported separately with
    // their own guidance. The `2` suffixed handler was public in v8 and is internal in v9, so an app naming
    // it fails to compile (CS0122) just as surely as one naming the deleted v1 handler.
    private static readonly IReadOnlySet<string> _removedEformidlingTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "EformidlingStatusCheckEventHandler",
        "EformidlingStatusCheckEventHandler2",
    };

    private const string MaskinportenSummary =
        "The obsolete Maskinporten types in Altinn.App.Core are removed in v9 "
        + "(IMaskinportenTokenProvider, MaskinportenJwkTokenProvider, AddMaskinportenJwkTokenProvider, "
        + "IX509CertificateProvider). Use the built-in IMaskinportenClient instead: inject it and call "
        + "GetAccessToken(scopes)/GetAltinnExchangedToken(scopes), or attach authorization to an HttpClient "
        + "registration with UseMaskinportenAuthorization(scopes)/UseMaskinportenAltinnAuthorization(scopes). "
        + "Configuration comes from a MaskinportenSettings section (authority/clientId/jwk), which Studio "
        + "provisions automatically when the app is deployed - so in most cases the app no longer needs to "
        + "supply credentials at all. Note that the built-in client authenticates with a JWK: if this app "
        + "authenticates with a PKCS#12 certificate or a certificate-store thumbprint, register a JWK in "
        + "Maskinporten before porting. Usages found:";

    private const string EformidlingSummary =
        "The eFormidling status check handlers are no longer app-facing in v9: EformidlingStatusCheckEventHandler "
        + "is removed, and EformidlingStatusCheckEventHandler2 is now internal, so naming either one fails to "
        + "compile. They are not replaced by the Maskinporten client - register eFormidling with "
        + "AddEFormidlingServices2<TM, TR>(configuration), which sets up the status check for you. Remove these "
        + "references and any DI registration of the handlers. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedMaskinportenShimDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var maskinportenMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedMaskinportenTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedMaskinportenTypes))
                .Concat(CSharpSyntaxQueries.InvokedMethods(file, _removedMaskinportenMethods))
        );

        var eformidlingMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedEformidlingTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedEformidlingTypes))
        );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(MaskinportenSummary, maskinportenMatches),
            WarnOnlyDetector.Report(EformidlingSummary, eformidlingMatches)
        );
    }
}
