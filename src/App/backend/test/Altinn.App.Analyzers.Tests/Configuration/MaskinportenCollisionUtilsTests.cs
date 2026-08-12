using Altinn.App.Analyzers.Configuration;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Configuration;

public class MaskinportenCollisionUtilsTests
{
    private const string Path = "/repo/App/appsettings.json";
    private const string DevelopmentPath = "/repo/App/appsettings.Development.json";

    private static List<Diagnostic> Collect(string json, string path = Path)
    {
        var diagnostics = new List<Diagnostic>();
        MaskinportenCollisionUtils.CollectCollisionDiagnostics(
            new InMemoryAdditionalText(path, json),
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }

    [Fact]
    public async Task Provisioned_Keys_Emit_One_Warning_Per_Key()
    {
        var diagnostics = Collect(
            """
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "clientId": "e23f-...",
                "jwkBase64": "eyJwIjo..."
              }
            }
            """
        );

        Assert.Equal(2, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.Configuration.MaskinportenCredentialsCollision.Id, d.Id));
        Assert.All(diagnostics, d => Assert.Equal(DiagnosticSeverity.Warning, d.Severity));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Jwk_Object_Emits_Warning()
    {
        var diagnostics = Collect(
            """
            {
              "MaskinportenSettings": {
                "clientId": "e23f-...",
                "jwk": { "p": "...", "kty": "RSA" }
              }
            }
            """
        );

        Assert.Equal(2, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.Configuration.MaskinportenCredentialsCollision.Id, d.Id));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task External_Package_Shape_Emits_Section_Warning()
    {
        var diagnostics = Collect(
            """
            {
              "MaskinportenSettings": {
                "Environment": "test",
                "ClientId": "e23f-...",
                "Scope": "altinn:serviceowner/instances.read",
                "EncodedJwk": "eyJwIjo..."
              }
            }
            """
        );

        // External-only keys identify whose section this is, so the finding is one section-level
        // diagnostic with the rename guidance — not per-key removal advice that would break the
        // external client.
        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(Diagnostics.Configuration.ExternalMaskinportenSectionCollision.Id, diagnostic.Id);
        await Verify(diagnostics);
    }

    [Fact]
    public void Certificate_Shape_Emits_Section_Warning()
    {
        var diagnostics = Collect(
            """
            {
              "MaskinportenSettings": {
                "Environment": "prod",
                "ClientId": "e23f-...",
                "CertificateStoreThumbprint": "AB12..."
              }
            }
            """
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(Diagnostics.Configuration.ExternalMaskinportenSectionCollision.Id, diagnostic.Id);
    }

    [Fact]
    public void Section_And_Key_Matching_Is_Case_Insensitive()
    {
        // Configuration keys are case-insensitive, so any spelling binds — and collides — the same.
        var diagnostics = Collect(
            """
            {
              "maskinportensettings": {
                "ClientID": "e23f-...",
                "JWKBase64": "eyJwIjo..."
              }
            }
            """
        );

        Assert.Equal(2, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.Configuration.MaskinportenCredentialsCollision.Id, d.Id));
    }

    [Fact]
    public async Task Development_Settings_File_Emits_Info()
    {
        var diagnostics = Collect(
            """
            {
              "MaskinportenSettings": {
                "clientId": "e23f-...",
                "jwkBase64": "eyJwIjo..."
              }
            }
            """,
            DevelopmentPath
        );

        Assert.Equal(2, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(DiagnosticSeverity.Info, d.Severity));
        await Verify(diagnostics);
    }

    [Fact]
    public void Authority_Only_Emits_Nothing()
    {
        // authority carries no identity; the provisioned value overriding it is the correct outcome.
        var diagnostics = Collect(
            """
            { "MaskinportenSettings": { "authority": "https://test.maskinporten.no/" } }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void No_Section_Emits_Nothing()
    {
        var diagnostics = Collect(
            """
            { "Logging": { "LogLevel": { "Default": "Information" } }, "MaskinportenSettingsLegacy": { "clientId": "x" } }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Comments_And_Trailing_Commas_Are_Tolerated()
    {
        // .NET configuration permits comments and trailing commas in appsettings.json.
        var diagnostics = Collect(
            """
            {
              // Local test credentials — see https://example.com/docs
              "MaskinportenSettings": {
                /* the client id is https://... issued for local runs */
                "clientId": "e23f-...",
              },
            }
            """
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(Diagnostics.Configuration.MaskinportenCredentialsCollision.Id, diagnostic.Id);
    }

    [Fact]
    public void Comment_Containing_Section_Emits_Nothing()
    {
        var diagnostics = Collect(
            """
            {
              // "MaskinportenSettings": { "clientId": "commented-out" }
              "Logging": {}
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Malformed_Json_Does_Not_Throw_And_Emits_Nothing()
    {
        Assert.Empty(Collect("{ this is not valid json "));
        Assert.Empty(Collect(""));
        Assert.Empty(Collect("[ { \"MaskinportenSettings\": { \"clientId\": \"x\" } } ]"));
    }

    [Fact]
    public void Section_With_Non_Object_Value_Emits_Nothing()
    {
        Assert.Empty(Collect("""{ "MaskinportenSettings": "not-an-object" }"""));
    }
}
