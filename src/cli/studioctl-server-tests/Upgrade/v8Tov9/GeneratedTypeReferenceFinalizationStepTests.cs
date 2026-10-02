using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class GeneratedTypeReferenceFinalizationStepTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner CreateScanner(bool markReference)
    {
        _app.Write("Types.cs", "class C { global::System.Threading.CancellationToken token; }");
        var scanner = new CSharpSourceScanner(Path.Combine(_app.Root, "App"));
        if (markReference)
        {
            var file = Assert.Single(scanner.Files);
            var type = Assert.Single(file.Root.DescendantNodes().OfType<VariableDeclarationSyntax>()).Type;
            scanner.Update(
                file,
                file.Root.ReplaceNode(
                    type,
                    GeneratedTypeReferenceFinalizer.Reference("System.Threading.CancellationToken")
                )
            );
        }
        return scanner;
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, true)]
    public async Task UnneededOrDisabledCleanup_DoesNotLoadTheTarget(bool markReference, bool skipSemanticAnalysis)
    {
        var scanner = CreateScanner(markReference);
        var original = _app.Read("Types.cs");
        var report = new UpgradeReport();
        using var output = UpgradeConsole.Use(report, TextWriter.Null);

        await V8Tov9Upgrade.FinalizeGeneratedTypeReferencesAsync(
            scanner,
            skipSemanticAnalysis,
            _ => throw new InvalidOperationException("Target loading must not run"),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(original, _app.Read("Types.cs"));
        Assert.DoesNotContain(
            report.Steps.SelectMany(step => step.Messages),
            message => message.Status == UpgradeMessageStatus.Warning
        );
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UnavailableTarget_PreservesTheRewriteAndEarlierManualWork(bool throwDuringLoad)
    {
        var scanner = CreateScanner(markReference: true);
        var original = _app.Read("Types.cs");
        var report = new UpgradeReport();
        using var output = UpgradeConsole.Use(report, TextWriter.Null);
        UpgradeConsole.BeginStep("Earlier migration");
        UpgradeConsole.Todo("Finish the removed API migration");

        await V8Tov9Upgrade.FinalizeGeneratedTypeReferencesAsync(
            scanner,
            skipSemanticAnalysis: false,
            _ =>
                throwDuringLoad
                    ? throw new InvalidOperationException("Target SDK unavailable")
                    : Task.FromResult(TargetProjectAnalysis.Unavailable("Target SDK unavailable")),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(original, _app.Read("Types.cs"));
        Assert.Equal(UpgradeMessageStatus.Todo, Assert.Single(report.Steps[0].Messages).Status);
        var cleanup = Assert.Single(report.Steps[1].Messages);
        Assert.Equal(UpgradeMessageStatus.Warning, cleanup.Status);
        Assert.Contains("Target SDK unavailable", cleanup.Text);
    }

    [Fact]
    public async Task ConditionalCompilation_ReportsWhyNamesWereKeptQualified()
    {
        var scanner = CreateScanner(markReference: true);
        var original = _app.Read("Types.cs");
        var report = new UpgradeReport();
        using var output = UpgradeConsole.Use(report, TextWriter.Null);
        using var workspace = new AdhocWorkspace();
        var project = workspace
            .AddProject("App", LanguageNames.CSharp)
            .AddDocument("Conditional.cs", SourceText.From("#if DEBUG\nclass DebugOnly { }\n#endif\n"))
            .Project;

        await V8Tov9Upgrade.FinalizeGeneratedTypeReferencesAsync(
            scanner,
            skipSemanticAnalysis: false,
            _ => Task.FromResult(new TargetProjectAnalysis([project], null)),
            TestContext.Current.CancellationToken
        );

        var message = Assert.Single(Assert.Single(report.Steps).Messages);
        Assert.Equal(UpgradeMessageStatus.Skip, message.Status);
        Assert.Contains("conditional compilation", message.Text);
        Assert.Equal(original, _app.Read("Types.cs"));
    }

    [Fact]
    public async Task CancellationDuringTargetLoading_Propagates()
    {
        var scanner = CreateScanner(markReference: true);
        var original = _app.Read("Types.cs");
        using var output = UpgradeConsole.Use(new UpgradeReport(), TextWriter.Null);
        using var cancellation = new CancellationTokenSource();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            V8Tov9Upgrade.FinalizeGeneratedTypeReferencesAsync(
                scanner,
                skipSemanticAnalysis: false,
                token =>
                {
                    cancellation.Cancel();
                    token.ThrowIfCancellationRequested();
                    return Task.FromResult(TargetProjectAnalysis.Unavailable("Not reached"));
                },
                cancellation.Token
            )
        );

        Assert.Equal(original, _app.Read("Types.cs"));
    }
}
