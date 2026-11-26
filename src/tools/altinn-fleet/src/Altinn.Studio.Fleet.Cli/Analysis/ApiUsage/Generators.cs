using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

/// <summary>Finds out whether a project's source generators failed.</summary>
/// <remarks>
/// A generator that throws only costs the compilation what it would have generated. The workspace reports that
/// nowhere, and the compilation has no error for it, so the generators run once more here, on the project's own
/// documents, to see what they report.
/// </remarks>
internal static class Generators
{
    // A generator threw while it initialized, or while it generated.
    private static readonly string[] s_generatorFailures = ["CS8784", "CS8785"];

    /// <summary>How a project's generators failed, or <c>null</c> when they did not.</summary>
    public static async Task<string?> FindFailure(
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
            return null;
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
        return diagnostics.FirstOrDefault(d => s_generatorFailures.Contains(d.Id))?.ToString();
    }

    private sealed class DocumentText(string path, SourceText text) : AdditionalText
    {
        public override string Path => path;

        public override SourceText GetText(CancellationToken cancellationToken = default) => text;
    }
}
