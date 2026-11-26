using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.Fleet.Analysis.ApiUsage;

/// <summary>Finds out what a project's source generators report, such as that one failed.</summary>
/// <remarks>
/// A generator that throws only costs the compilation what it would have generated, and an error a generator reports
/// fails the build. The workspace reports neither, and the compilation has no diagnostic for them, so the generators
/// run once more here, on the project's own documents, to see what they report.
/// </remarks>
internal static class Generators
{
    // A generator threw while it initialized, or while it generated. The compiler reports it as a warning.
    private static readonly string[] s_thrown = ["CS8784", "CS8785"];

    /// <summary>Whether a diagnostic says that a generator threw.</summary>
    public static bool Threw(Diagnostic diagnostic) => s_thrown.Contains(diagnostic.Id);

    /// <summary>
    /// Whether a diagnostic fails the build: an error that a generator reports, or that a generator threw, which costs
    /// the compilation what it would have generated.
    /// </summary>
    public static bool Fails(Diagnostic diagnostic) =>
        Threw(diagnostic) || diagnostic.Severity == DiagnosticSeverity.Error;

    /// <summary>What a project's generators report.</summary>
    public static async Task<ImmutableArray<Diagnostic>> Run(
        Project project,
        Compilation compilation,
        CancellationToken cancellationToken
    )
    {
        ImmutableArray<ISourceGenerator> generators =
        [
            .. project.AnalyzerReferences.SelectMany(reference => reference.GetGenerators(LanguageNames.CSharp)),
        ];
        if (generators.IsEmpty)
        {
            return [];
        }

        HashSet<string> documents = [.. project.Documents.Select(d => d.FilePath).OfType<string>()];
        Compilation source = compilation.RemoveSyntaxTrees(
            compilation.SyntaxTrees.Where(tree => !documents.Contains(tree.FilePath))
        );
        var additionalTexts = new List<AdditionalText>();
        foreach (TextDocument document in project.AdditionalDocuments)
        {
            additionalTexts.Add(
                new DocumentText(document.FilePath ?? document.Name, await document.GetTextAsync(cancellationToken))
            );
        }

        GeneratorDriver driver = CSharpGeneratorDriver.Create(
            generators,
            additionalTexts,
            project.ParseOptions as CSharpParseOptions,
            project.AnalyzerOptions.AnalyzerConfigOptionsProvider
        );
        driver.RunGeneratorsAndUpdateCompilation(
            source,
            out _,
            out ImmutableArray<Diagnostic> diagnostics,
            cancellationToken
        );
        return diagnostics;
    }

    private sealed class DocumentText(string path, SourceText text) : AdditionalText
    {
        public override string Path => path;

        public override SourceText GetText(CancellationToken cancellationToken = default) => text;
    }
}
