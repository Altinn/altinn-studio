namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the removed API that let an app point the built-in Maskinporten client at
/// credentials of its own: <c>ConfigureMaskinportenClient</c> and the Fiks builder's
/// <c>WithMaskinportenConfig</c>.
/// <para>
/// A v9 app has exactly one Maskinporten identity - the client Studio provisions for it - and the SDK binds
/// its credentials outside the app's configuration root, so there is nothing left to configure and both
/// methods are gone. That is deliberately a compile error rather than a rewrite: the replacement is a
/// decision, not a mechanical substitution. Either the extra scopes belong on the provisioned client, and
/// are declared there, or the integration is the app's own and belongs on its own client - for example the
/// external <c>Altinn.ApiClients.Maskinporten</c> package, which is free to bring its own credentials now
/// that the provisioned ones no longer travel through the app's configuration.
/// </para>
/// <para>
/// Reported rather than left to the compiler because the call site alone does not say which of the two
/// answers applies, and because in v9 the default client is shared infrastructure: it is what mints the
/// service owner tokens the app's process transitions run on.
/// </para>
/// </summary>
internal sealed class MaskinportenClientOverrideDetector
{
    private static readonly IReadOnlySet<string> _removedMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "ConfigureMaskinportenClient",
        "WithMaskinportenConfig",
    };

    private const string Summary =
        "This app configures the built-in Maskinporten client, which v9 does not allow: "
        + "ConfigureMaskinportenClient and WithMaskinportenConfig are removed and these call sites will not "
        + "compile. An app has one Maskinporten identity, the client Studio provisions for it, and its "
        + "credentials are no longer read from the app's configuration at all. If this call was adding scopes, "
        + "declare them on the provisioned client in Studio instead. If it configured a Maskinporten client for "
        + "the app's own integration, give that integration its own client - the Altinn.ApiClients.Maskinporten "
        + "package is the supported way to bring your own credentials - and leave the built-in client alone: it "
        + "is what mints the service owner tokens this app's process transitions run on. Where a call named a "
        + "configuration section holding the client you use for local runs, hand that section to studioctl "
        + "instead - studioctl app maskinporten set --from-appsettings App/appsettings.Development.json "
        + "--section <the name in the call> - and studioctl provisions the client to the app for local runs the "
        + "way Studio does when the app is deployed. Call sites found:";

    private readonly CSharpSourceScanner _scanner;

    public MaskinportenClientOverrideDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        // The section name in the call is the value the studioctl command needs, so it is quoted in the report.
        var matches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries.InvokedMethods(file, _removedMethods, describeFirstStringArgument: true)
        );
        return WarnOnlyDetector.Report(Summary, matches);
    }
}
