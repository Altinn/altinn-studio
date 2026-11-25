using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CSharpSourceScannerTests
{
    [Fact]
    public void SyntaxScan_ParsesCSharp15Unions()
    {
        // Without a compilation, files are parsed with the default language version of the Roslyn the
        // server ships. An app already on v9 gets C# 15 from net11.0 and may use unions when the upgrade
        // runs on it again. An older default turns the declaration into error nodes for every rewriter.
        using var app = new TempAppFolder();
        app.Write("Pet.cs", "public record Cat; public record Dog; public union Pet(Cat, Dog);");

        var file = Assert.Single(new CSharpSourceScanner(app.Root).Files);

        Assert.DoesNotContain(
            file.Root.GetDiagnostics(),
            static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error
        );
    }
}
