using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.App.Analyzers.Tests.Fixtures;

public sealed class AltinnAppCoreFixture : BaseFixture
{
    public AltinnAppCoreFixture() { }

    internal async Task Initialize()
    {
        await base.Init(
            Path.Join(Directory.GetCurrentDirectory(), "..", "..", "src", "Altinn.App.Core", "Altinn.App.Core.csproj")
        );
    }

    public IDisposable WithCode(string code)
    {
        if (!IsInitialized)
            throw new InvalidOperationException("Fixture not initialized");

        var modification = new ProjectModification(this);

        var doc = Project.AddDocument("Code.cs", SourceText.From(code, Encoding.UTF8));
        Project = doc.Project;
        Assert.True(Workspace.TryApplyChanges(Project.Solution));

        return modification;
    }

    public async Task<(CompilationWithAnalyzers Compilation, IReadOnlyList<Diagnostic>)> GetCompilation(
        DiagnosticAnalyzer analyzer,
        CancellationToken cancellationToken
    )
    {
        var (compilation, diagnostics) = await base.CompileWithAnalyzer(analyzer, cancellationToken);

        // TODO: can't assert this as source generation hasn't run yet so we get errors
        // var errorDiagnostics = diagnostics
        //     .Where(d =>
        //         d.Severity == DiagnosticSeverity.Error
        //         && !d.Id.StartsWith("ALTINNINT", StringComparison.Ordinal)
        //         && !d.IsSuppressed
        //     )
        //     .ToArray();
        // Assert.Empty(errorDiagnostics);

        return (
            compilation,
            diagnostics
                .Where(d => d.Id.StartsWith("ALTINNINT", StringComparison.Ordinal))
                .OrderBy(d => d.Location.GetLineSpan().StartLinePosition)
                .ToArray()
        );
    }
}
