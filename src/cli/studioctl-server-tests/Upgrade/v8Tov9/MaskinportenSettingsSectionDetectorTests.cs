using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class MaskinportenSettingsSectionDetectorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    /// <summary>
    /// The detector is handed the app repo root (matching <c>V8Tov9UpgradeOptions.ProjectFolder</c>), and
    /// finds configuration anywhere beneath it - <c>App/appsettings.json</c> in a normal app.
    /// </summary>
    private MigrationResult Detect() => new MaskinportenSettingsSectionDetector(_app.Root).Detect();

    /// <summary>
    /// The textbook v8 shape: the key arrives from an env var or secret file and only the client id is
    /// checked in. In v9 nothing reads it.
    /// </summary>
    [Fact]
    public void BuiltInShapedSection_IsReportedAsDead()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "clientId": "some-client-id",
                "jwkBase64": "eyJraWQiOiJ0ZXN0In0="
              }
            }
            """
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("configuration section that v9 never reads"));
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json"));
        // A developer who used the section for local runs is told where those credentials go now.
        Assert.Contains(result.Warnings, w => w.Contains("studioctl app maskinporten set --from-appsettings"));
    }

    /// <summary>
    /// A section carrying only <c>authority</c> is just as dead as one carrying credentials.
    /// </summary>
    [Fact]
    public void SectionWithOnlyAuthority_IsReportedAsDead()
    {
        _app.Write(
            "appsettings.json",
            """
            { "MaskinportenSettings": { "authority": "https://test.maskinporten.no/" } }
            """
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json"));
    }

    /// <summary>
    /// The development settings file is no more alive than any other - the app libraries never read the
    /// section in any environment - so it is reported the same way. The repo's own test apps carried this.
    /// </summary>
    [Fact]
    public void DevelopmentSettings_AreReportedToo()
    {
        _app.Write(
            "appsettings.Development.json",
            """
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "clientId": "local-dev-client"
              }
            }
            """
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.Development.json"));
    }

    /// <summary>
    /// .NET configuration keys are case-insensitive, so a differently-cased section name is the same
    /// section and is just as dead.
    /// </summary>
    [Fact]
    public void SectionNameMatchIsCaseInsensitive()
    {
        _app.Write(
            "appsettings.json",
            """
            { "maskinportensettings": { "clientId": "some-client-id" } }
            """
        );

        var result = Detect();

        Assert.NotEmpty(result.Warnings);
    }

    /// <summary>
    /// The external <c>Altinn.ApiClients.Maskinporten</c> package binds this section name by its own
    /// convention, and with the provisioned credentials out of the app's configuration root that is once
    /// again a safe, supported way to bring your own client. Reporting it would be a false positive.
    /// </summary>
    [Fact]
    public void ExternalPackageSection_ReportsNothing()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "Environment": "test",
                "ClientId": "some-client-id",
                "EncodedJwk": "eyJraWQiOiJ0ZXN0In0=",
                "Scope": "altinn:serviceowner"
              }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void CertificateBasedExternalSection_ReportsNothing()
    {
        _app.Write(
            "appsettings.Production.json",
            """
            {
              "MaskinportenSettings": {
                "ClientId": "some-client-id",
                "CertificatePkcs12Path": "/secrets/cert.p12",
                "CertificatePkcs12Password": "hunter2"
              }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    /// <summary>
    /// Nothing here blocks the upgrade: a section that is never read breaks nothing, it is only clutter
    /// (and, when it holds a key, a key worth removing).
    /// </summary>
    [Fact]
    public void DeadSection_DoesNotBlockTheUpgrade()
    {
        _app.Write(
            "appsettings.json",
            """
            { "MaskinportenSettings": { "clientId": "some-client-id" } }
            """
        );

        var result = Detect();

        Assert.Empty(result.Todos);
    }

    [Fact]
    public void VendoredDependencySettings_AreIgnored()
    {
        _app.Write(
            "ui/node_modules/some-pkg/appsettings.json",
            """
            { "MaskinportenSettings": { "clientId": "some-client-id" } }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void NoMaskinportenSection_ReportsNothing()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "Logging": { "LogLevel": { "Default": "Information" } }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void AppSettingsWithCommentsAndTrailingCommas_IsStillParsed()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              // credentials for our reporting integration
              "MaskinportenSettings": {
                "clientId": "some-client-id",
              },
            }
            """
        );

        var result = Detect();

        Assert.NotEmpty(result.Warnings);
    }

    /// <summary>
    /// An unparsable appsettings file is skipped rather than reported: a JSON complaint from a
    /// Maskinporten check would be a confusing way to learn the file is malformed.
    /// </summary>
    [Fact]
    public void UnparseableAppSettings_IsSkippedSilently()
    {
        _app.Write("appsettings.json", "{ this is not json");

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void BuildOutputIsIgnored()
    {
        _app.Write(
            "obj/Debug/appsettings.json",
            """
            { "MaskinportenSettings": { "clientId": "some-client-id" } }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void EverySettingsFileIsReported()
    {
        _app.Write(
            "appsettings.json",
            """
            { "MaskinportenSettings": { "clientId": "some-client-id" } }
            """
        );
        _app.Write(
            "appsettings.Development.json",
            """
            { "MaskinportenSettings": { "authority": "https://test.maskinporten.no/" } }
            """
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json"));
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.Development.json"));
    }
}
