using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.App.Analyzers.Tests.Fixtures;

public sealed partial class AltinnTestAppFixture : BaseFixture
{
    internal async Task Initialize()
    {
        await base.Init(Path.Join(Directory.GetCurrentDirectory(), "testapp", "App", "App.csproj"));
    }

    public IDisposable WithRemovedModelClass()
    {
        if (!IsInitialized)
            throw new InvalidOperationException("Fixture not initialized");

        var content = Content.ModelClass;

        var modification = new ProjectModification(this);

        var doc = Project.Documents.Single(d => d.FilePath == content.FilePath);
        Project = Project.RemoveDocument(doc.Id);
        Assert.True(Workspace.TryApplyChanges(Project.Solution));

        return modification;
    }

    public IDisposable WithInvalidHttpContextAccessorUse()
    {
        if (!IsInitialized)
            throw new InvalidOperationException("Fixture not initialized");

        var content = Content.InvalidHttpContextAccessorUse;

        var modification = new ProjectModification(this);

        var doc = Project.AddDocument(
            content.FilePath,
            SourceText.From(File.ReadAllText(content.FilePath, Encoding.UTF8), Encoding.UTF8)
        );
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
        var errorDiagnostics = diagnostics
            .Where(d =>
                d.Severity == DiagnosticSeverity.Error
                && !d.Id.StartsWith("ALTINNAPP", StringComparison.Ordinal)
                && !d.IsSuppressed
            )
            .ToArray();
        Assert.Empty(errorDiagnostics);

        return (
            compilation,
            diagnostics
                .Where(d => d.Id.StartsWith("ALTINNAPP", StringComparison.Ordinal))
                .OrderBy(d => d.Location.GetLineSpan().StartLinePosition)
                .ToArray()
        );
    }
}
