using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Deletes the <c>IPdfFormatter</c> implementations that cannot change the PDF, so that
/// <see cref="RemovedPdfFormatterDetector"/> only reports the ones with logic to port by hand. Two kinds
/// go: a class that is never registered, which v8 never calls, and a class whose <c>FormatPdf</c> returns
/// the layout settings unchanged, as v8's default does, along with its registrations.
/// </summary>
/// <remarks>
/// Only a class alone in its file is deleted, and only when nothing else refers to it. A using directive
/// whose namespace has nothing left in it is removed, as it would no longer compile. Telling which
/// namespace that is takes a compilation, so without one this does nothing: an app is expected to
/// compile on v8 before it moves to v9.
/// </remarks>
internal sealed class UnusedPdfFormatterMigration
{
    private const string InterfaceName = "Altinn.App.Core.Features.IPdfFormatter";

    private readonly CSharpSourceScanner _scanner;

    public UnusedPdfFormatterMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var removals = _scanner.Files.Select(FindRemoval).OfType<Removal>().ToList();
        if (removals.Count == 0)
        {
            return new MigrationResult();
        }

        var removedFiles = removals.Select(static r => r.File).ToHashSet();
        var removedTypes = removals.Select(static r => (ISymbol)r.Type).ToHashSet(SymbolEqualityComparer.Default);
        var lines = removals
            .SelectMany(static r => r.Registrations)
            .Concat(
                _scanner.Files.Where(f => !removedFiles.Contains(f)).SelectMany(f => EmptiedImports(f, removedTypes))
            )
            .ToList();

        var messages = new List<UpgradeMessage>();
        foreach (var removal in removals)
        {
            var text =
                removal.Registrations.Count == 0
                    ? $"Deleted {removal.File.RelativePath}: {removal.Type.Name} was never registered, so it never ran"
                    : $"Deleted {removal.File.RelativePath}: {removal.Type.Name} returned the layout settings unchanged. "
                        + "Also removed its registration in "
                        + string.Join(", ", removal.Registrations.Select(static r => r.Location));
            messages.Add(new UpgradeMessage(text, UpgradeMessageStatus.Ok));
        }

        foreach (var file in lines.GroupBy(static line => line.File))
        {
            _scanner.Update(file.Key, RemoveLines(file.Key.Root, file.Select(static line => line.Node).ToList()));
        }

        foreach (var removal in removals)
        {
            _scanner.Remove(removal.File);
        }

        return new MigrationResult(messages);
    }

    private Removal? FindRemoval(ScannedCSharpFile file)
    {
        if (
            file.SemanticModel is not { } model
            || file.Root.DescendantNodes().OfType<BaseTypeDeclarationSyntax>().ToList()
                is not [ClassDeclarationSyntax { BaseList.Types.Count: 1 } declaration]
            || model.GetDeclaredSymbol(declaration) is not { DeclaringSyntaxReferences.Length: 1 } type
            || !type.Interfaces.Any(IsPdfFormatter)
            || !HoldsNothingElse(file.Root)
        )
        {
            return null;
        }

        var registrations = new List<Line>();
        foreach (var other in _scanner.Files.Where(other => other != file))
        {
            foreach (var name in other.Root.DescendantNodes().OfType<SimpleNameSyntax>())
            {
                if (name.Identifier.Text != type.Name)
                {
                    continue;
                }

                // A name that does not bind may well mean this class, so it keeps the class too.
                var symbol = other.SemanticModel?.GetSymbolInfo(name).Symbol;
                if (symbol is not null && !SymbolEqualityComparer.Default.Equals(symbol, type))
                {
                    continue;
                }

                if (symbol is null || RegistrationOf(name, other) is not { } registration)
                {
                    return null;
                }

                registrations.Add(registration);
            }
        }

        return registrations.Count == 0 || ReturnsLayoutSettingsUnchanged(declaration)
            ? new Removal(file, type, registrations)
            : null;
    }

    /// <summary>
    /// The statement <c>services.AddTransient&lt;IPdfFormatter, X&gt;();</c>, or one of its siblings, that
    /// <paramref name="name"/> is the <c>X</c> of.
    /// </summary>
    private static Line? RegistrationOf(SimpleNameSyntax name, ScannedCSharpFile file) =>
        name.Parent
            is TypeArgumentListSyntax { Arguments: [var service, var implementation], Parent: GenericNameSyntax method }
        && implementation == name
        && method.Identifier.Text
            is "AddTransient"
                or "AddScoped"
                or "AddSingleton"
                or "TryAddTransient"
                or "TryAddScoped"
                or "TryAddSingleton"
        && method.Parent is MemberAccessExpressionSyntax { Parent: InvocationExpressionSyntax invocation } access
        && access.Name == method
        && invocation
            is { ArgumentList.Arguments.Count: 0, Parent: ExpressionStatementSyntax { Parent: BlockSyntax } statement }
        && file.SemanticModel?.GetSymbolInfo(service).Symbol is INamedTypeSymbol serviceType
        && IsPdfFormatter(serviceType)
            ? new Line(file, statement)
            : null;

    /// <summary>
    /// Whether the class only has a <c>FormatPdf</c> that returns its first parameter, as is or through
    /// <c>Task.FromResult</c>, awaited or not. Anything more, such as a constructor, may have an effect.
    /// </summary>
    private static bool ReturnsLayoutSettingsUnchanged(ClassDeclarationSyntax declaration)
    {
        if (
            declaration.Members is not [MethodDeclarationSyntax { ParameterList.Parameters: [var parameter, _] } method]
        )
        {
            return false;
        }

        var returned = method switch
        {
            { ExpressionBody: { } body } => body.Expression,
            { Body.Statements: [ReturnStatementSyntax { Expression: { } expression }] } => expression,
            _ => null,
        };

        while (true)
        {
            switch (returned)
            {
                case AwaitExpressionSyntax awaited:
                    returned = awaited.Expression;
                    break;
                case InvocationExpressionSyntax
                {
                    Expression: MemberAccessExpressionSyntax
                    {
                        Expression: IdentifierNameSyntax { Identifier.Text: "Task" },
                        Name.Identifier.Text: "FromResult",
                    },
                    ArgumentList.Arguments: [var argument],
                }:
                    returned = argument.Expression;
                    break;
                default:
                    return returned is IdentifierNameSyntax identifier
                        && identifier.Identifier.Text == parameter.Identifier.Text;
            }
        }
    }

    /// <summary>
    /// Whether the file holds nothing besides its one class that deleting it would lose: no assembly
    /// attributes, global using directives or code excluded by a preprocessor condition.
    /// </summary>
    private static bool HoldsNothingElse(CompilationUnitSyntax root) =>
        root.AttributeLists.Count == 0
        && root.Usings.All(static directive => directive.GlobalKeyword.IsKind(SyntaxKind.None))
        && !root.DescendantTrivia().Any(static trivia => trivia.IsKind(SyntaxKind.DisabledTextTrivia));

    /// <summary>Using directives of namespaces that have nothing left in them once the types are deleted.</summary>
    private static IEnumerable<Line> EmptiedImports(ScannedCSharpFile file, IReadOnlySet<ISymbol> removedTypes)
    {
        if (file.SemanticModel is not { } model)
        {
            yield break;
        }

        foreach (var directive in file.Root.DescendantNodes().OfType<UsingDirectiveSyntax>())
        {
            if (
                directive is { Alias: null, Name: { } name }
                && directive.StaticKeyword.IsKind(SyntaxKind.None)
                && model.GetSymbolInfo(name).Symbol is INamespaceSymbol ns
                && !HasAnythingLeft(ns, model.Compilation.Assembly, removedTypes)
            )
            {
                yield return new Line(file, directive);
            }
        }
    }

    private static bool HasAnythingLeft(INamespaceSymbol ns, IAssemblySymbol app, IReadOnlySet<ISymbol> removedTypes) =>
        ns.ConstituentNamespaces.Any(part => !SymbolEqualityComparer.Default.Equals(part.ContainingAssembly, app))
        || ns.GetTypeMembers().Any(type => !removedTypes.Contains(type))
        || ns.GetNamespaceMembers().Any(child => HasAnythingLeft(child, app, removedTypes));

    /// <summary>
    /// Removes nodes that each have lines of their own. Comments on the lines above a node are kept for
    /// whatever follows it.
    /// </summary>
    private static CompilationUnitSyntax RemoveLines(CompilationUnitSyntax root, IReadOnlyList<SyntaxNode> nodes)
    {
        root = root.TrackNodes(nodes);
        foreach (var original in nodes)
        {
            var node = Current(root, original);
            var leading = node.GetLeadingTrivia();
            var options = SyntaxRemoveOptions.KeepNoTrivia;
            if (
                leading.Any(static t => !t.IsKind(SyntaxKind.WhitespaceTrivia) && !t.IsKind(SyntaxKind.EndOfLineTrivia))
            )
            {
                // Without the node's own indentation, which would otherwise be doubled up on the next line.
                var indentation = leading
                    .Reverse()
                    .TakeWhile(static t => t.IsKind(SyntaxKind.WhitespaceTrivia))
                    .Count();
                root = root.ReplaceNode(node, node.WithLeadingTrivia(leading.Take(leading.Count - indentation)));
                node = Current(root, original);
                options = SyntaxRemoveOptions.KeepLeadingTrivia;
            }

            root = root.RemoveNode(node, options) ?? throw new InvalidOperationException("Failed to remove a line");
        }

        return root;
    }

    private static SyntaxNode Current(CompilationUnitSyntax root, SyntaxNode original) =>
        root.GetCurrentNode(original) ?? throw new InvalidOperationException("Failed to track a line");

    private static bool IsPdfFormatter(INamedTypeSymbol type) => type.ToDisplayString() == InterfaceName;

    private sealed record Removal(ScannedCSharpFile File, INamedTypeSymbol Type, IReadOnlyList<Line> Registrations);

    private sealed record Line(ScannedCSharpFile File, SyntaxNode Node)
    {
        public string Location => $"{File.RelativePath}:{File.GetLine(Node)}";
    }
}
