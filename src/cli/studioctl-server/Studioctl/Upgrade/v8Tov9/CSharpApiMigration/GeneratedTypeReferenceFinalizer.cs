using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Editing;
using Microsoft.CodeAnalysis.Formatting;
using Microsoft.CodeAnalysis.Options;
using Microsoft.CodeAnalysis.Simplification;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed record TypeReferenceFinalizationResult(int ChangedFiles, string? SkipReason = null);

/// <summary>
/// Simplifies migration-generated type references after all rewrites, against the upgraded project's
/// dependencies. The scanner supplies provenance, while target projects supply syntax and semantics.
/// A reference stays qualified whenever its meaning or a proposed import cannot be established.
/// </summary>
internal static class GeneratedTypeReferenceFinalizer
{
    private const string MarkerKind = "Altinn.Studio.Cli.TypeReference";

    /// <summary>Creates a qualified reference whose spelling can be finalized against the upgraded project.</summary>
    public static NameSyntax Reference(string fullyQualifiedTypeName) =>
        SyntaxFactory
            .ParseName("global::" + fullyQualifiedTypeName)
            .WithAdditionalAnnotations(new SyntaxAnnotation(MarkerKind, fullyQualifiedTypeName));

    public static bool HasReferences(CSharpSourceScanner scanner) =>
        scanner.Files.Any(static file => file.Root.GetAnnotatedNodes(MarkerKind).Any());

    /// <summary>
    /// Uses Roslyn to propose readable names independently in every target configuration. A file is written
    /// only when every configuration agrees. Conditional source remains qualified: Debug and Release alone
    /// cannot establish what names mean under arbitrary application-defined preprocessor symbols.
    /// This terminal pass writes target source directly. The scanner remains a v8 snapshot and must not
    /// be used for subsequent rewrites or analysis after finalization.
    /// </summary>
    public static async Task<TypeReferenceFinalizationResult> FinalizeAsync(
        CSharpSourceScanner scanner,
        IReadOnlyList<Project> targetProjects,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (targetProjects.Count == 0 || !HasReferences(scanner))
        {
            return new(0);
        }

        var projects = targetProjects.ToArray();
        foreach (var project in projects)
        {
            if (await project.GetCompilationAsync(cancellationToken) is not { } compilation)
            {
                return new(0, "the target project did not provide a compilation");
            }

            // A declaration in another file can shadow an introduced name, even if the edited file
            // itself has no directives. Include generated trees and all declaration positions.
            foreach (var tree in compilation.SyntaxTrees)
            {
                var root = await tree.GetRootAsync(cancellationToken);
                if (
                    root.DescendantTrivia(descendIntoTrivia: true)
                        .Any(static trivia => trivia.IsKind(SyntaxKind.IfDirectiveTrivia))
                )
                {
                    return new(
                        0,
                        "the app uses conditional compilation, so names cannot be verified for every set of preprocessor symbols"
                    );
                }
            }
        }

        var sourcePaths = scanner.Files.Select(static file => file.Path).ToArray();
        var documentIds = projects
            .Select(project =>
                SourceFilePaths.Match(sourcePaths, project.DocumentIds, id => project.GetDocument(id)?.FilePath)
            )
            .ToArray();
        var changedFiles = 0;
        foreach (var file in scanner.Files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var references = file.Root.GetAnnotatedNodes(MarkerKind).ToArray();
            if (references.Length == 0)
            {
                continue;
            }

            var originalText = file.Root.ToFullString();
            if (!File.Exists(file.Path) || await File.ReadAllTextAsync(file.Path, cancellationToken) != originalText)
            {
                continue;
            }

            var proposals = new List<Document>(projects.Length);
            string? proposedText = null;
            for (var i = 0; i < projects.Length; i++)
            {
                var document = documentIds[i].TryGetValue(file.Path, out var id) ? projects[i].GetDocument(id) : null;
                if (
                    document is null
                    || await ProposeAsync(document, originalText, references, cancellationToken) is not { } proposal
                )
                {
                    break;
                }

                var text = (await proposal.GetTextAsync(cancellationToken)).ToString();
                if (proposedText is not null && proposedText != text)
                {
                    break;
                }

                proposedText = text;
                proposals.Add(proposal);
            }

            if (proposals.Count != projects.Length || proposedText is null || proposedText == originalText)
            {
                continue;
            }

            // A later migration can write outside the scanner. Never overwrite that work with our snapshot.
            if (!File.Exists(file.Path) || await File.ReadAllTextAsync(file.Path, cancellationToken) != originalText)
            {
                continue;
            }

            // Once the file is opened for writing, cancellation must not leave truncated source behind.
            cancellationToken.ThrowIfCancellationRequested();
            await File.WriteAllTextAsync(file.Path, proposedText, CancellationToken.None);
            for (var i = 0; i < projects.Length; i++)
            {
                projects[i] = proposals[i].Project;
            }

            changedFiles++;
        }

        cancellationToken.ThrowIfCancellationRequested();
        return new(changedFiles);
    }

    private static async Task<Document?> ProposeAsync(
        Document document,
        string originalText,
        IReadOnlyList<SyntaxNode> references,
        CancellationToken cancellationToken
    )
    {
        if (
            await document.GetSyntaxRootAsync(cancellationToken) is not CompilationUnitSyntax root
            || root.ToFullString() != originalText
            || await document.GetSemanticModelAsync(cancellationToken) is not { } model
        )
        {
            return null;
        }

        var verified = new List<SyntaxNode>();
        foreach (var reference in references)
        {
            var fullName =
                reference.GetAnnotations(MarkerKind).Single().Data
                ?? throw new InvalidOperationException("A generated type reference is missing its metadata name.");
            var candidate = root.FindNode(reference.Span, getInnermostNodeForTie: true);
            if (candidate.Span != reference.Span || candidate.ToString() != reference.ToString())
            {
                continue;
            }

            // Parsing an expression can produce a different node kind than the migration's generated
            // NameSyntax. Match exact span and text, then let the target semantic model establish meaning.
            if (
                model.GetSymbolInfo(candidate, cancellationToken).Symbol is INamedTypeSymbol bound
                && !SymbolEqualityComparer.Default.Equals(bound.ContainingAssembly, model.Compilation.Assembly)
                && model
                    .Compilation.GetTypesByMetadataName(fullName)
                    .Any(type => SymbolEqualityComparer.Default.Equals(type, bound))
            )
            {
                verified.Add(candidate);
            }
        }

        if (verified.Count == 0)
        {
            return document;
        }

        var annotatedRoot = root.ReplaceNodes(
            verified,
            static (_, node) => node.WithAdditionalAnnotations(Simplifier.Annotation, Simplifier.AddImportsAnnotation)
        );
        // Existing aliases and namespace imports can be affected by an import in an outer scope too.
        // Mark their directives so the binding check excludes only the imports the service adds.
        var existingUsing = new SyntaxAnnotation();
        annotatedRoot = annotatedRoot.ReplaceNodes(
            annotatedRoot.DescendantNodes().OfType<UsingDirectiveSyntax>(),
            (_, directive) => directive.WithAdditionalAnnotations(existingUsing)
        );
        document = document.WithSyntaxRoot(annotatedRoot);
        var imported = await ImportAdder.AddImportsAsync(
            document,
            Simplifier.AddImportsAnnotation,
            options: null,
            cancellationToken
        );
        var formatImports = new SyntaxAnnotation();
        var needsFormatting = false;
        if (await PreservesBindingsAsync(document, imported, existingUsing, cancellationToken))
        {
            var importedRoot =
                await imported.GetSyntaxRootAsync(cancellationToken)
                ?? throw new InvalidOperationException($"The rewritten {document.Name} has no syntax root.");
            var newImports = importedRoot
                .DescendantNodes()
                .OfType<UsingDirectiveSyntax>()
                .Where(directive => !directive.HasAnnotation(existingUsing))
                .ToArray();
            needsFormatting = newImports.Length > 0;
            document = imported.WithSyntaxRoot(
                importedRoot.ReplaceNodes(
                    newImports,
                    (_, directive) => directive.WithAdditionalAnnotations(formatImports)
                )
            );
        }

        document = await Simplifier.ReduceAsync(document, Simplifier.Annotation, optionSet: null, cancellationToken);
        if (!needsFormatting)
        {
            return document;
        }

        // Simplification marks the reduced declaration for formatting, and even formatting only an import
        // can change a neighboring declaration's trivia. Retain only the formatted new directives.
        var formatted = await Formatter.FormatAsync(
            document,
            formatImports,
            await FileFormattingOptionsAsync(document, root, cancellationToken),
            cancellationToken
        );
        var unformattedRoot =
            await document.GetSyntaxRootAsync(cancellationToken)
            ?? throw new InvalidOperationException($"The simplified {document.Name} has no syntax root.");
        var formattedRoot =
            await formatted.GetSyntaxRootAsync(cancellationToken)
            ?? throw new InvalidOperationException($"The formatted {document.Name} has no syntax root.");
        var text = await document.GetTextAsync(cancellationToken);
        var replacements = unformattedRoot
            .GetAnnotatedNodes(formatImports)
            .Zip(formattedRoot.GetAnnotatedNodes(formatImports))
            .ToDictionary(
                static pair => pair.First,
                pair => WithScopeIndentation(pair.Second, pair.First, existingUsing, text)
            );
        return document.WithSyntaxRoot(
            unformattedRoot.ReplaceNodes(replacements.Keys, (original, _) => replacements[original])
        );
    }

    /// <summary>
    /// Whether every name and call in the file still binds to the same symbol after the import service added its
    /// directives. The service's own conflict search covers only the span it adds imports for, so an import that
    /// would make a field's type ambiguous, or make a call resolve to a different extension method, elsewhere in
    /// the file passes it; this compares the whole file, so such an import is dropped and the reference stays
    /// qualified.
    /// </summary>
    private static async Task<bool> PreservesBindingsAsync(
        Document before,
        Document after,
        SyntaxAnnotation existingUsing,
        CancellationToken cancellationToken
    )
    {
        var beforeRoot = await before.GetSyntaxRootAsync(cancellationToken);
        var afterRoot = await after.GetSyntaxRootAsync(cancellationToken);
        var beforeModel = await before.GetSemanticModelAsync(cancellationToken);
        var afterModel = await after.GetSemanticModelAsync(cancellationToken);
        if (beforeRoot is null || afterRoot is null || beforeModel is null || afterModel is null)
        {
            return false;
        }

        var beforeSites = BindingSites(beforeRoot);
        var afterSites = BindingSites(afterRoot);
        if (beforeSites.Count != afterSites.Count)
        {
            return false;
        }

        for (var i = 0; i < beforeSites.Count; i++)
        {
            var site = beforeSites[i];
            var counterpart = afterSites[i];
            if (
                site.RawKind != counterpart.RawKind
                || site.ToString() != counterpart.ToString()
                || Describe(beforeModel.GetSymbolInfo(site, cancellationToken))
                    != Describe(afterModel.GetSymbolInfo(counterpart, cancellationToken))
            )
            {
                return false;
            }
        }

        return true;

        // New directives have no counterpart. Existing directives must retain their bindings too.
        List<SyntaxNode> BindingSites(SyntaxNode root) =>
            root.DescendantNodes(node => node is not UsingDirectiveSyntax || node.HasAnnotation(existingUsing))
                .Where(static node =>
                    node is SimpleNameSyntax or InvocationExpressionSyntax or MemberAccessExpressionSyntax
                )
                .ToList();

        static string Describe(SymbolInfo info) =>
            info.Symbol is { } symbol
                ? Identity(symbol)
                : $"{info.CandidateReason}: {string.Join(" | ", info.CandidateSymbols.Select(Identity))}";
    }

    /// <summary>
    /// A name for a symbol that is the same across two compilations and differs between two different symbols.
    /// Symbols never compare equal across compilations, and a display string without the containing type and the
    /// signature would let two same-named methods pass as one. The documentation-comment ID carries both for
    /// members and types; the symbols that have none (locals, parameters, range variables) fall back to a full
    /// display with their kind.
    /// </summary>
    private static string Identity(ISymbol symbol)
    {
        var definition = symbol is IMethodSymbol { ReducedFrom: { } reducedFrom }
            ? reducedFrom
            : symbol.OriginalDefinition;
        return definition.GetDocumentationCommentId() ?? $"{symbol.Kind}:{symbol.ToDisplayString(_identityFormat)}";
    }

    private static readonly SymbolDisplayFormat _identityFormat = new(
        globalNamespaceStyle: SymbolDisplayGlobalNamespaceStyle.Included,
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypesAndNamespaces,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
        memberOptions: SymbolDisplayMemberOptions.IncludeContainingType
            | SymbolDisplayMemberOptions.IncludeParameters
            | SymbolDisplayMemberOptions.IncludeType,
        parameterOptions: SymbolDisplayParameterOptions.IncludeType | SymbolDisplayParameterOptions.IncludeParamsRefOut,
        localOptions: SymbolDisplayLocalOptions.IncludeType,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.UseSpecialTypes
    );

    /// <summary>Format new directives with the file's newline, using document settings as the fallback.</summary>
    private static async Task<OptionSet> FileFormattingOptionsAsync(
        Document document,
        CompilationUnitSyntax original,
        CancellationToken cancellationToken
    )
    {
        OptionSet options = await document.GetOptionsAsync(cancellationToken);
        var endOfLine = original
            .DescendantTrivia(descendIntoTrivia: true)
            .FirstOrDefault(static trivia => trivia.IsKind(SyntaxKind.EndOfLineTrivia));
        if (endOfLine != default)
        {
            options = options.WithChangedOption(FormattingOptions.NewLine, LanguageNames.CSharp, endOfLine.ToString());
        }

        return options;
    }

    private static SyntaxNode WithScopeIndentation(
        SyntaxNode formatted,
        SyntaxNode original,
        SyntaxAnnotation existingUsing,
        SourceText text
    )
    {
        // Copy indentation from the same scope, including zero indentation inside a namespace.
        // File-wide indentation guesses cannot represent that layout or mixed namespace styles.
        var siblings = original.Parent?.ChildNodes().ToArray() ?? [];
        var neighbor =
            siblings.FirstOrDefault(node => node.HasAnnotation(existingUsing))
            ?? siblings.FirstOrDefault(static node => node is MemberDeclarationSyntax);
        if (neighbor is null)
        {
            return formatted;
        }

        var indentation = text.ToString(
            TextSpan.FromBounds(text.Lines.GetLineFromPosition(neighbor.SpanStart).Start, neighbor.SpanStart)
        );
        if (!indentation.All(static character => character is ' ' or '\t'))
        {
            return formatted;
        }

        var trivia = formatted.GetLeadingTrivia();
        while (trivia.Count > 0 && trivia[^1].IsKind(SyntaxKind.WhitespaceTrivia))
        {
            trivia = trivia.RemoveAt(trivia.Count - 1);
        }
        return formatted.WithLeadingTrivia(trivia.Add(SyntaxFactory.Whitespace(indentation)));
    }
}
