using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>Finds the node an edit reuses as it is when the edit is made, after the edits inside it.</summary>
internal sealed class NodeLookup(SyntaxNode? root, IReadOnlyDictionary<SyntaxNode, SyntaxAnnotation> annotations)
{
    /// <summary>A lookup that gives every node as it was planned.</summary>
    public static readonly NodeLookup Original = new(null, new Dictionary<SyntaxNode, SyntaxAnnotation>());

    public T Current<T>(T original)
        where T : SyntaxNode
    {
        if (root is null)
        {
            return original;
        }

        return
            annotations.TryGetValue(original, out var annotation)
            && root.GetAnnotatedNodes(annotation).OfType<T>().FirstOrDefault() is { } current
            ? current
            : throw new InvalidOperationException($"An edit reuses a node it did not name: {original}");
    }
}

/// <summary>
/// The planned edits of one member, made on its nodes as they were when they were planned. They are applied
/// innermost first, so an edit that contains another sees it made, and a node an edit reuses is taken as it is then.
/// </summary>
internal sealed class MethodEdits
{
    private const string AnnotationKind = "Altinn.Studio.Cli.ProcessHooks.EditedNode";

    private readonly List<Edit> _edits = [];

    public bool IsEmpty => _edits.Count == 0;

    public int Count => _edits.Count;

    public void Clear() => _edits.Clear();

    public void Replace(SyntaxNode target, Func<NodeLookup, SyntaxNode> build, params SyntaxNode[] uses) =>
        _edits.Add(new Edit(EditKind.Replace, target, lookup => [build(lookup)], uses));

    /// <summary>Replaces a statement with others; no statements removes it.</summary>
    public void ReplaceStatement(
        StatementSyntax target,
        Func<NodeLookup, IReadOnlyList<StatementSyntax>> build,
        params SyntaxNode[] uses
    ) => _edits.Add(new Edit(EditKind.ReplaceStatement, target, build, uses));

    public void Remove(StatementSyntax target) =>
        _edits.Add(new Edit(EditKind.ReplaceStatement, target, static _ => [], [], Removes: true));

    public void InsertBefore(
        StatementSyntax target,
        Func<NodeLookup, IReadOnlyList<StatementSyntax>> build,
        params SyntaxNode[] uses
    ) => _edits.Add(new Edit(EditKind.InsertBefore, target, build, uses));

    /// <summary>Whether an edit replaces or removes <paramref name="node"/> or a node around it.</summary>
    public bool Rewrites(SyntaxNode node) =>
        _edits.Any(edit =>
            edit.Kind != EditKind.InsertBefore
            && edit.Target.SyntaxTree == node.SyntaxTree
            && edit.Target.Span.Contains(node.Span)
        );

    /// <summary>Whether <paramref name="node"/> is still in the code after the edits: not rewritten, or reused by an edit.</summary>
    public bool Keeps(SyntaxNode node) =>
        !Rewrites(node)
        || _edits.Any(edit => edit.Uses.Any(use => use.SyntaxTree == node.SyntaxTree && use.Span.Contains(node.Span)));

    /// <summary><paramref name="member"/> with the edits made; every edit's nodes are inside it.</summary>
    public T Apply<T>(T member, string lineEnding)
        where T : SyntaxNode
    {
        if (_edits.Count == 0)
        {
            return member;
        }

        var nodes = _edits.SelectMany(static edit => edit.Uses.Prepend(edit.Target)).Distinct().ToList();
        var annotations = nodes.ToDictionary(static node => node, static _ => new SyntaxAnnotation(AnnotationKind));
        SyntaxNode root = member.ReplaceNodes(
            nodes,
            (original, rewritten) => rewritten.WithAdditionalAnnotations(annotations[original])
        );
        foreach (
            var edit in _edits
                .Select(static (edit, index) => (Edit: edit, Index: index))
                // A removal goes last: another edit may reuse what the removed statement held.
                .OrderBy(static item => item.Edit.Kind == EditKind.ReplaceStatement && item.Edit.Removes)
                .ThenByDescending(static item => item.Edit.Target.Ancestors().Count())
                // Statements go before their target while the nodes they reuse from it are still there.
                .ThenBy(static item => item.Edit.Kind == EditKind.InsertBefore ? 0 : 1)
                .ThenBy(static item => item.Index)
                .Select(static item => item.Edit)
        )
        {
            var lookup = new NodeLookup(root, annotations);
            var current = lookup.Current(edit.Target);
            var built = edit.Build(lookup);
            var kept = current.GetAnnotations(AnnotationKind).ToArray();
            root = edit.Kind switch
            {
                EditKind.Replace => root.ReplaceNode(
                    current,
                    built[0].WithTriviaFrom(current).WithAdditionalAnnotations(kept)
                ),
                EditKind.ReplaceStatement => ReplaceStatement(root, (StatementSyntax)current, built, kept, lineEnding),
                _ => InsertBefore(root, (StatementSyntax)current, built, kept, lineEnding),
            };
        }

        return (T)root;
    }

    private static SyntaxNode ReplaceStatement(
        SyntaxNode root,
        StatementSyntax current,
        IReadOnlyList<SyntaxNode> built,
        SyntaxAnnotation[] kept,
        string lineEnding
    )
    {
        var statements = built.Cast<StatementSyntax>().ToList();
        if (current.Parent is BlockSyntax or SwitchSectionSyntax)
        {
            if (statements.Count == 0)
            {
                return RemoveStatement(root, current);
            }

            var laidOut = LaidOut(statements, current, lineEnding);
            laidOut[0] = laidOut[0].WithAdditionalAnnotations(kept);
            return root.ReplaceNode(current, laidOut);
        }

        if (statements.Count == 1)
        {
            return root.ReplaceNode(current, statements[0].WithTriviaFrom(current).WithAdditionalAnnotations(kept));
        }

        return root.ReplaceNode(current, Block(statements, current).WithAdditionalAnnotations(kept));
    }

    private static SyntaxNode InsertBefore(
        SyntaxNode root,
        StatementSyntax current,
        IReadOnlyList<SyntaxNode> built,
        SyntaxAnnotation[] kept,
        string lineEnding
    )
    {
        var statements = built.Cast<StatementSyntax>().ToList();
        if (statements.Count == 0)
        {
            return root;
        }

        if (current.Parent is BlockSyntax or SwitchSectionSyntax)
        {
            var indentation = Indentation(current);
            var laidOut = LaidOut(statements, current, lineEnding);
            laidOut[^1] = laidOut[^1].WithTrailingTrivia(SyntaxFactory.EndOfLine(lineEnding));
            var moved = current.WithLeadingTrivia(indentation);
            root = root.ReplaceNode(current, moved);
            var target = root.GetAnnotatedNodes(kept[0]).First();
            return root.InsertNodesBefore(target, laidOut);
        }

        return root.ReplaceNode(
            current,
            Block([.. statements, current.WithoutTrivia()], current).WithAdditionalAnnotations(kept)
        );
    }

    /// <summary>
    /// The statements in place of <paramref name="current"/>: the first with its leading trivia, the others on lines of
    /// their own with its indentation, the last with its trailing trivia.
    /// </summary>
    private static List<StatementSyntax> LaidOut(
        IReadOnlyList<StatementSyntax> statements,
        StatementSyntax current,
        string lineEnding
    )
    {
        var indentation = Indentation(current);
        var laidOut = new List<StatementSyntax>(statements.Count);
        for (var i = 0; i < statements.Count; i++)
        {
            var statement = statements[i];
            statement = statement.WithLeadingTrivia(i == 0 ? current.GetLeadingTrivia() : indentation);
            statement = statement.WithTrailingTrivia(
                i == statements.Count - 1
                    ? current.GetTrailingTrivia()
                    : SyntaxFactory.TriviaList(SyntaxFactory.EndOfLine(lineEnding))
            );
            laidOut.Add(statement);
        }

        return laidOut;
    }

    private static BlockSyntax Block(IReadOnlyList<StatementSyntax> statements, StatementSyntax current) =>
        SyntaxFactory
            .Block(statements.Select(static statement => statement.WithLeadingTrivia(SyntaxFactory.Space)))
            .WithCloseBraceToken(SyntaxFactory.Token(SyntaxKind.CloseBraceToken).WithLeadingTrivia(SyntaxFactory.Space))
            .WithTriviaFrom(current);

    /// <summary>Removes a statement with its line, keeping the comments above it.</summary>
    private static SyntaxNode RemoveStatement(SyntaxNode root, StatementSyntax current)
    {
        var leading = current.GetLeadingTrivia();
        if (leading.Any(static t => !t.IsKind(SyntaxKind.WhitespaceTrivia) && !t.IsKind(SyntaxKind.EndOfLineTrivia)))
        {
            var indentation = leading.Reverse().TakeWhile(static t => t.IsKind(SyntaxKind.WhitespaceTrivia)).Count();
            var trimmed = current.WithLeadingTrivia(leading.Take(leading.Count - indentation));
            var annotation = new SyntaxAnnotation(AnnotationKind);
            root = root.ReplaceNode(current, trimmed.WithAdditionalAnnotations(annotation));
            var node = root.GetAnnotatedNodes(annotation).First();
            return root.RemoveNode(node, SyntaxRemoveOptions.KeepLeadingTrivia)
                ?? throw new InvalidOperationException("Failed to remove a statement.");
        }

        if (
            current.Parent is BlockSyntax block
            && block.Statements.IndexOf(current) is 0
            && block.Statements.Count > 1
            && block.Statements[1] is var next
            && next.GetLeadingTrivia() is [var first, ..]
            && first.IsKind(SyntaxKind.EndOfLineTrivia)
        )
        {
            // The blank line that separated the removed first statement from the next one goes with it.
            var annotation = new SyntaxAnnotation(AnnotationKind);
            root = root.ReplaceNode(
                next,
                next.WithLeadingTrivia(next.GetLeadingTrivia().Skip(1)).WithAdditionalAnnotations(annotation)
            );
            current = root.GetAnnotatedNodes(annotation).First().Parent is BlockSyntax annotated
                ? annotated.Statements[0]
                : throw new InvalidOperationException("The statement after a removed one left its block.");
        }

        return root.RemoveNode(current, SyntaxRemoveOptions.KeepNoTrivia)
            ?? throw new InvalidOperationException("Failed to remove a statement.");
    }

    private static SyntaxTriviaList Indentation(SyntaxNode node)
    {
        var whitespace = node.GetLeadingTrivia()
            .Reverse()
            .TakeWhile(static t => t.IsKind(SyntaxKind.WhitespaceTrivia))
            .Reverse();
        return SyntaxFactory.TriviaList(whitespace);
    }

    private enum EditKind
    {
        Replace,
        ReplaceStatement,
        InsertBefore,
    }

    private sealed record Edit(
        EditKind Kind,
        SyntaxNode Target,
        Func<NodeLookup, IReadOnlyList<SyntaxNode>> Build,
        IReadOnlyList<SyntaxNode> Uses,
        bool Removes = false
    );
}

/// <summary>
/// Code the rewrite writes, from text with holes <c>$0</c>, <c>$1</c>, … that take existing nodes, so the app's own
/// expressions and the annotated type references keep what they carry.
/// </summary>
internal static class SyntaxTemplate
{
    private const string HolePrefix = "__studioctlHole";

    public static ExpressionSyntax Expression(string text, params SyntaxNode[] holes) =>
        Filled(
            InAsyncMethod<ExpressionStatementSyntax>($"_ = {Marked(text, holes.Length)};")
                is { Expression: AssignmentExpressionSyntax assignment }
                ? assignment.Right
                : throw new InvalidOperationException($"Generated code does not parse: {text}"),
            holes
        );

    public static StatementSyntax Statement(string text, params SyntaxNode[] holes) =>
        Filled(InAsyncMethod<StatementSyntax>(Marked(text, holes.Length)), holes);

    /// <summary>The statement parsed where <c>await</c> is a keyword, as it is in the methods the rewrite edits.</summary>
    private static T InAsyncMethod<T>(string statement)
        where T : StatementSyntax
    {
        var unit = SyntaxFactory.ParseCompilationUnit($"class C {{ async void M() {{ {statement} }} }}");
        return
            unit.DescendantNodes().OfType<BlockSyntax>().First().Statements is [T parsed] && !unit.ContainsDiagnostics
            ? parsed.WithoutTrivia()
            : throw new InvalidOperationException($"Generated code does not parse: {statement}");
    }

    private static string Marked(string text, int holes)
    {
        for (var i = holes - 1; i >= 0; i--)
        {
            text = text.Replace("$" + i, HolePrefix + i, StringComparison.Ordinal);
        }

        return text;
    }

    private static T Filled<T>(T node, SyntaxNode[] holes)
        where T : SyntaxNode
    {
        return node.ReplaceNodes(
            node.DescendantNodesAndSelf()
                .OfType<IdentifierNameSyntax>()
                .Where(static name => name.Identifier.ValueText.StartsWith(HolePrefix, StringComparison.Ordinal)),
            (original, _) =>
            {
                var hole = holes[
                    int.Parse(
                        original.Identifier.ValueText[HolePrefix.Length..],
                        System.Globalization.CultureInfo.InvariantCulture
                    )
                ]
                    .WithoutTrivia();
                if (hole is ExpressionSyntax expression && NeedsParentheses(expression, original))
                {
                    hole = SyntaxFactory.ParenthesizedExpression(expression);
                }

                return hole.WithTriviaFrom(original);
            }
        );
    }

    /// <summary>Whether <paramref name="expression"/> must be parenthesized where <paramref name="hole"/> is.</summary>
    private static bool NeedsParentheses(ExpressionSyntax expression, ExpressionSyntax hole) =>
        hole.Parent
            is MemberAccessExpressionSyntax
                or ElementAccessExpressionSyntax
                or ConditionalAccessExpressionSyntax
                or PostfixUnaryExpressionSyntax
                or CastExpressionSyntax
                or PrefixUnaryExpressionSyntax
                or AwaitExpressionSyntax
        && expression
            is not (
                IdentifierNameSyntax
                or GenericNameSyntax
                or QualifiedNameSyntax
                or AliasQualifiedNameSyntax
                or MemberAccessExpressionSyntax
                or InvocationExpressionSyntax
                or ElementAccessExpressionSyntax
                or LiteralExpressionSyntax
                or ParenthesizedExpressionSyntax
                or BaseObjectCreationExpressionSyntax
                or ThisExpressionSyntax
                or PredefinedTypeSyntax
                or InterpolatedStringExpressionSyntax
                or TupleExpressionSyntax
                or ArrayCreationExpressionSyntax
                or ImplicitArrayCreationExpressionSyntax
                or CollectionExpressionSyntax
            );
}
