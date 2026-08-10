namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the obsolete Maskinporten surface that <c>Altinn.App.Core</c> used to expose
/// as a thin shim over the external <c>Altinn.ApiClients.Maskinporten</c> package: the
/// <c>IMaskinportenTokenProvider</c>/<c>MaskinportenJwkTokenProvider</c> pair, the
/// <c>AddMaskinportenJwkTokenProvider</c> registration, the <c>IX509CertificateProvider</c> abstraction,
/// and the <c>EformidlingStatusCheckEventHandler</c> that consumed them. All of these are gone in v9.
/// The Maskinporten types are replaced by the built-in <c>IMaskinportenClient</c>; the eFormidling handler
/// has no replacement at all - the v9 eFormidling service task waits for the delivery confirmation itself -
/// so it is reported separately with its own guidance.
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
    // shim they consumed, but the guidance they need is an eFormidling one, so they are reported separately.
    // Both are deleted in v9, along with the IEventHandler abstraction they were registered against, so an
    // app naming either one fails to compile - the `2` suffixed handler included, public though it was in v8.
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
        "The eFormidling status check handlers are removed in v9: naming either "
        + "EformidlingStatusCheckEventHandler or EformidlingStatusCheckEventHandler2 fails to compile. Nothing "
        + "needs to take their place - the v9 eFormidling service task waits for the delivery confirmation "
        + "itself, polling the integration point and advancing the process only once delivery is confirmed, so "
        + "there is no status check left to register. They are not replaced by the Maskinporten client either. "
        + "Remove these references and any DI registration of the handlers; eFormidling itself is registered "
        + "with services.AddEFormidling().WithMetadata<T>(). Usages found:";

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
