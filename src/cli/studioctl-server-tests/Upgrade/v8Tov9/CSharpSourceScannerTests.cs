using System.Text;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>How the scanner writes files: as they were encoded, and new ones as part of the compilation.</summary>
public sealed class CSharpSourceScannerTests : IDisposable
{
    private static readonly byte[] _bom = [0xEF, 0xBB, 0xBF];

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Update_KeepsWhetherTheFileStartedWithAByteOrderMark(bool withBom)
    {
        // nkom/femsiffer-ny-soknad App/processing/TaskEndProcessing.cs starts with one.
        var text = "namespace App;\n\npublic class Hook { }\n";
        byte[] bytes = [.. withBom ? _bom : [], .. Encoding.UTF8.GetBytes(text)];
        _app.WriteBytes("Hook.cs", bytes);
        var scanner = new CSharpSourceScanner(AppFolder);
        var file = scanner.Files[0];

        scanner.Update(file, file.Root.WithLeadingTrivia(SyntaxFactory.Comment("// Ported"), SyntaxFactory.LineFeed));

        Assert.Equal(
            [.. withBom ? _bom : [], .. Encoding.UTF8.GetBytes("// Ported\n" + text)],
            _app.ReadBytes("Hook.cs")
        );
    }

    [Fact]
    public void Update_BindsTheOtherFilesAgainstTheUpdatedCompilation()
    {
        _app.Write("Hook.cs", "namespace App;\n\npublic class Hook { }\n");
        _app.Write("Program.cs", "namespace App;\n\npublic class Registration { public Hook Registered; }\n");
        var scanner = SemanticScannerFactory.CreateScanner(AppFolder);
        var hook = scanner.Files.Single(static file => file.RelativePath == "Hook.cs");
        Assert.NotNull(hook.SemanticModel);
        var program = scanner.Files.Single(static file => file.RelativePath == "Program.cs");

        program = scanner.Update(
            program,
            program.Root.WithLeadingTrivia(SyntaxFactory.Comment("// Ported"), SyntaxFactory.LineFeed)
        );

        var declared = hook.SemanticModel?.GetDeclaredSymbol(
            hook.Root.DescendantNodes().OfType<ClassDeclarationSyntax>().Single(),
            TestContext.Current.CancellationToken
        );
        var referenced = program
            .SemanticModel?.GetTypeInfo(
                program.Root.DescendantNodes().OfType<VariableDeclarationSyntax>().Single().Type,
                TestContext.Current.CancellationToken
            )
            .Type?.OriginalDefinition;
        Assert.Equal(declared, referenced, SymbolEqualityComparer.Default);
    }

    [Fact]
    public void Add_WritesTheFile_AndCompilesItWithTheOthers()
    {
        _app.Write("Hook.cs", "namespace App;\n\npublic class Hook { }\n");
        var scanner = SemanticScannerFactory.CreateScanner(AppFolder);
        var path = Path.Combine(AppFolder, "Handlers.cs");

        var added = scanner.Add(
            path,
            SyntaxFactory.ParseCompilationUnit("namespace App;\n\nclass Handlers(Hook hook) { }\n")
        );

        Assert.Equal("namespace App;\n\nclass Handlers(Hook hook) { }\n", File.ReadAllText(path));
        Assert.Contains(added, scanner.Files);
        var model = added.SemanticModel ?? throw new InvalidOperationException("The added file has no semantic model.");
        Assert.Empty(
            model
                .GetDiagnostics(cancellationToken: TestContext.Current.CancellationToken)
                .Where(static d => d.Severity == DiagnosticSeverity.Error)
        );
    }

    [Fact]
    public void SyntaxScan_ParsesCSharp15Unions()
    {
        // Without a compilation, files are parsed with the default language version of the Roslyn the
        // server ships. An app already on v9 gets C# 15 from net11.0 and may use unions when the upgrade
        // runs on it again. An older default turns the declaration into error nodes for every rewriter.
        _app.Write("Pet.cs", "public record Cat; public record Dog; public union Pet(Cat, Dog);");

        var file = Assert.Single(new CSharpSourceScanner(AppFolder).Files);

        Assert.DoesNotContain(
            file.Root.GetDiagnostics(),
            static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error
        );
    }
}
