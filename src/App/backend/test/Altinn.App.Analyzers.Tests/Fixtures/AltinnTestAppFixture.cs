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

    public IDisposable WithInvalidHttpContextAccessorUse() => WithAddedDocument(Content.InvalidHttpContextAccessorUse);

    public IDisposable WithReplacedSealedDefine() => WithAddedDocument(Content.ReplacedSealedDefine);

    public IDisposable WithDiscardedEFormidlingBuilder() => WithAddedDocument(Content.DiscardedEFormidlingBuilder);

    public IDisposable WithMailboxHandleConsumption() => WithAddedDocument(Content.MailboxHandleConsumption);

    /// <summary>
    /// Adds a source file to the project for the duration of the modification. Restoring the
    /// fixture's captured snapshots alone is not enough on dispose: the workspace's *current*
    /// solution still contains the added document, and the next modification's TryApplyChanges
    /// (derived from the restored, older snapshot) would fail — so the dispose action also
    /// removes the document from the live workspace and re-syncs the fixture's project to it.
    /// </summary>
    /// <remarks>
    /// The removal goes by <see cref="DocumentId"/> rather than by path on purpose:
    /// <c>AddDocument(name, text)</c> takes a document <em>name</em> and leaves
    /// <see cref="Document.FilePath"/> null, so looking the document up by its path found nothing and
    /// the file stayed in the project for the rest of the run. That leak is invisible while each test
    /// runs an analyzer that ignores the other tests' files, and shows up the moment one class's
    /// "clean by default" test happens to be ordered after its own "emits diagnostics" test.
    /// </remarks>
    private IDisposable WithAddedDocument(DocumentSelector content)
    {
        if (!IsInitialized)
            throw new InvalidOperationException("Fixture not initialized");

        DocumentId? addedDocumentId = null;
        var modification = new ProjectModification(
            this,
            action: () =>
            {
                var project = Workspace.CurrentSolution.GetProject(Project!.Id);
                if (addedDocumentId is not null && project?.GetDocument(addedDocumentId) is not null)
                {
                    Assert.True(Workspace.TryApplyChanges(project.RemoveDocument(addedDocumentId).Solution));
                }
                Project = Workspace.CurrentSolution.GetProject(Project.Id)!;
            }
        );

        var doc = Project.AddDocument(
            content.FilePath,
            SourceText.From(File.ReadAllText(content.FilePath, Encoding.UTF8), Encoding.UTF8)
        );
        addedDocumentId = doc.Id;
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
