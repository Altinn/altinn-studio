using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Compiles the Correspondence constructor rewrite against v9. The authentication record was introduced during
/// v8, so both early v8 packages without it and later v8 packages must produce valid qualified references.
/// Text-level rewrites are covered by <see cref="CSharpApiMigrationTests"/>.
/// </summary>
public sealed class CorrespondenceApiMigrationCompileTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private const string PayloadModels = """
        namespace Altinn.App.Core.Features.Correspondence.Models
        {
            public sealed class CorrespondenceRequest { }
        """;

    private const string AuthenticationMethod = """
        namespace Altinn.App.Core.Features
        {
            public sealed record CorrespondenceAuthenticationMethod
            {
                public static CorrespondenceAuthenticationMethod Default() => new();
            }
        }
        """;

    private static MetadataReference V8Sdk(bool hasAuthenticationMethod) =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            (hasAuthenticationMethod ? AuthenticationMethod : "")
                + PayloadModels
                + """

                    public enum CorrespondenceAuthorisation
                    {
                        Maskinporten,
                    }

                    public sealed class SendCorrespondencePayload
                    {
                        public SendCorrespondencePayload(CorrespondenceRequest request, CorrespondenceAuthorisation authorisation) { }
                    }
                }
                """
        );

    private static readonly Lazy<MetadataReference> _v9Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            AuthenticationMethod
                + PayloadModels
                + """

                    public sealed class SendCorrespondencePayload
                    {
                        public SendCorrespondencePayload(
                            CorrespondenceRequest request,
                            Altinn.App.Core.Features.CorrespondenceAuthenticationMethod authenticationMethod
                        ) { }
                    }
                }
                """
        )
    );

    [Theory]
    [InlineData(true, false)]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public async Task LegacyPayloadConstructor_IsRewrittenToCodeThatCompilesAgainstV9(
        bool semantic,
        bool hasAuthenticationMethod
    )
    {
        var path = _app.Write(
            "logic/Send.cs",
            """
            using Altinn.App.Core.Features.Correspondence.Models;

            public class Send
            {
                public SendCorrespondencePayload Build(CorrespondenceRequest request) =>
                    new SendCorrespondencePayload(request, CorrespondenceAuthorisation.Maskinporten);
            }
            """
        );
        var scanner = semantic
            ? SemanticScannerFactory.CreateScanner(AppFolder, V8Sdk(hasAuthenticationMethod))
            : new CSharpSourceScanner(AppFolder);

        var result = new CorrespondenceApiMigration(scanner).Migrate(TestContext.Current.CancellationToken);

        Assert.Empty(result.Todos);
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value);
        Assert.True(errors.Count == 0, "Migrated app does not compile against v9:\n" + string.Join("\n", errors));
        var migrated = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);
        Assert.DoesNotContain("using Altinn.App.Core.Features;", migrated);
        Assert.Contains("global::Altinn.App.Core.Features.CorrespondenceAuthenticationMethod.Default()", migrated);
    }
}
