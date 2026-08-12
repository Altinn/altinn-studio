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
    public void Truncated_Json_Does_Not_Throw_And_Emits_Nothing()
    {
        // A truncated document can end inside a string — even right after its opening quote. That must
        // surface as a skipped file, not as an analyzer crash (AD0001).
        Assert.Empty(Collect("\""));
        Assert.Empty(Collect("{\"a\":\""));
        Assert.Empty(Collect("{\"MaskinportenSettings\": {\"clientId\": \"e23f"));
        Assert.Empty(Collect("{\"MaskinportenSettings\": {\"clientId\": \"e23f\\"));
    }

    [Fact]
    public void Case_Variant_Duplicate_Sections_Are_Classified_On_Merged_Keys()
    {
        // Several spellings merge into one bound section at runtime, so the verdict must be computed
        // once over all of them — otherwise an external-client app would also get per-key "remove it"
        // advice that would break its own integration.
        var diagnostics = Collect(
            """
            {
              "MaskinportenSettings": { "Environment": "test" },
              "maskinportensettings": { "clientId": "e23f-..." }
            }
            """
        );

        Assert.Equal(2, diagnostics.Count);
        Assert.All(
            diagnostics,
            d => Assert.Equal(Diagnostics.Configuration.ExternalMaskinportenSectionCollision.Id, d.Id)
        );

        // Order-reversed, so a regression to classifying only the first (or only the last) section
        // cannot slip through: the external-only key must dominate from either position.
        var reversed = Collect(
            """
            {
              "maskinportensettings": { "clientId": "e23f-..." },
              "MaskinportenSettings": { "Environment": "test" }
            }
            """
        );

        Assert.Equal(2, reversed.Count);
        Assert.All(
            reversed,
            d => Assert.Equal(Diagnostics.Configuration.ExternalMaskinportenSectionCollision.Id, d.Id)
        );
    }

    [Fact]
    public void Diagnostic_Spans_Cover_The_Offending_Key_And_Value()
    {
        var json = """
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "jwkBase64": "eyJwIjo...",
                "jwk": { "p": "...", "kty": "RSA" }
              }
            }
            """;

        var diagnostics = Collect(json);

        Assert.Equal(2, diagnostics.Count);
        var spans = diagnostics
            .Select(d => json.Substring(d.Location.SourceSpan.Start, d.Location.SourceSpan.Length))
            .ToList();
        Assert.Contains("\"jwkBase64\": \"eyJwIjo...\"", spans);
        Assert.Contains("\"jwk\": { \"p\": \"...\", \"kty\": \"RSA\" }", spans);
    }

    [Fact]
    public void External_Shape_Diagnostic_Span_Covers_The_Section_Key()
    {
        var json = """
            { "MaskinportenSettings": { "Environment": "test" } }
            """;

        var diagnostic = Assert.Single(Collect(json));

        var span = json.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length);
        Assert.Equal("\"MaskinportenSettings\"", span);
    }

    [Fact]
    public void Section_With_Non_Object_Value_Emits_Nothing()
    {
        Assert.Empty(Collect("""{ "MaskinportenSettings": "not-an-object" }"""));
    }
}
