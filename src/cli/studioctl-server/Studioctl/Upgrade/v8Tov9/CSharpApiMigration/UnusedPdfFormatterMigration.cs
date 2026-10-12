using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Deletes <c>IPdfFormatter</c> implementations that cannot change the PDF, so that
/// <see cref="RemovedPdfFormatterDetector"/> only reports the ones with logic to port. That is a class
/// that is never registered, or one whose <c>FormatPdf</c> returns the layout settings unchanged, which
/// goes with its registrations.
/// </summary>
/// <remarks>
/// Only a class that is alone in its file and referred to nowhere else is deleted. Using directives of
/// namespaces left empty are removed too. Finding those takes a compilation, so without one this does
/// nothing: an app is expected to compile on v8 before it moves to v9.
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
                        + string.Join(
                            ", ",
                            removal.Registrations.Select(static r => $"{r.File.RelativePath}:{r.File.GetLine(r.Node)}")
                        );
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
            || Declarations(file.Root.Members).ToList()
                is not [ClassDeclarationSyntax { BaseList.Types.Count: 1 } declaration]
            || model.GetDeclaredSymbol(declaration) is not { DeclaringSyntaxReferences.Length: 1 } type
            || !type.Interfaces.Any(IsPdfFormatter)
            || file.Root.AttributeLists.Count > 0
            || file.Root.Usings.Any(static directive => directive.GlobalKeyword.IsKind(SyntaxKind.GlobalKeyword))
            || ExcludedCode(file).Any()
        )
        {
            return null;
        }

        var registrations = new List<Line>();
        foreach (var other in _scanner.Files.Where(other => other != file))
        {
            if (ExcludedCode(other).Any(code => code.Contains(type.Name, StringComparison.Ordinal)))
            {
                return null;
            }

            foreach (var name in other.Root.DescendantNodes().OfType<SimpleNameSyntax>())
            {
                if (name.Identifier.Text != type.Name)
                {
                    continue;
                }

                // A name that does not bind might be this class, so it keeps the class too.
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

    /// <summary>Everything deleting the file would delete, such as classes, delegates and top-level statements.</summary>
    private static IEnumerable<MemberDeclarationSyntax> Declarations(SyntaxList<MemberDeclarationSyntax> members) =>
        members.SelectMany(member => member is BaseNamespaceDeclarationSyntax ns ? Declarations(ns.Members) : [member]);

    /// <summary>Code excluded by a preprocessor condition, which the compilation does not see.</summary>
    private static IEnumerable<string> ExcludedCode(ScannedCSharpFile file) =>
        file
            .Root.DescendantTrivia()
            .Where(static trivia => trivia.IsKind(SyntaxKind.DisabledTextTrivia))
            .Select(static trivia => trivia.ToString());

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
    /// Whether the class has nothing but a <c>FormatPdf</c> that returns its first parameter, as is or through
    /// <c>Task.FromResult</c>, awaited or not. A constructor or field could have an effect of its own.
    /// </summary>
    private static bool ReturnsLayoutSettingsUnchanged(ClassDeclarationSyntax declaration) =>
        declaration.Members is [MethodDeclarationSyntax { ParameterList.Parameters: [var parameter, _] } method]
        && Returns(
            method switch
            {
                { ExpressionBody: { } body } => body.Expression,
                { Body.Statements: [ReturnStatementSyntax { Expression: { } expression }] } => expression,
                _ => null,
            },
            parameter.Identifier.Text
        );

    private static bool Returns(ExpressionSyntax? expression, string parameterName) =>
        expression switch
        {
            AwaitExpressionSyntax awaited => Returns(awaited.Expression, parameterName),
            InvocationExpressionSyntax
            {
                Expression: MemberAccessExpressionSyntax
                {
                    Expression: IdentifierNameSyntax { Identifier.Text: "Task" },
                    Name.Identifier.Text: "FromResult",
                },
                ArgumentList.Arguments: [var argument],
            } => Returns(argument.Expression, parameterName),
            IdentifierNameSyntax identifier => identifier.Identifier.Text == parameterName,
            _ => false,
        };

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

    /// <summary>Removes nodes that have lines of their own, keeping comments on the lines above them.</summary>
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
                // The comments stay, but not the node's indentation, which would double the next line's.
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

    private sealed record Line(ScannedCSharpFile File, SyntaxNode Node);
}
