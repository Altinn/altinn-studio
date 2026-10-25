using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// Code a rewrite writes, built when the edit is made: from the app's own nodes, taken as they are then, and from
/// templates with holes (<see cref="SyntaxTemplate"/>). <see cref="Uses"/> are the app's nodes it takes.
/// </summary>
internal sealed record Piece(Func<NodeLookup, SyntaxNode> Build, IReadOnlyList<SyntaxNode> Uses)
{
    /// <summary>One of the app's nodes.</summary>
    public static Piece Of(SyntaxNode original) => new(lookup => lookup.Current(original), [original]);

    public static Piece Fixed(SyntaxNode node) => new(_ => node, []);

    /// <summary>This piece built from the app's nodes as they are before any edit.</summary>
    public Piece Copy() => Fixed(Build(NodeLookup.Original));

    public static Piece Type(string fullName) => Fixed(GeneratedTypeReferenceFinalizer.Reference(fullName));

    public static Piece Name(string name) => Fixed(SyntaxFactory.IdentifierName(name));

    public static Piece Expression(string template, params Piece[] holes) =>
        new(lookup => SyntaxTemplate.Expression(template, Built(holes, lookup)), Collect(holes));

    public static Piece Statement(string template, params Piece[] holes) =>
        new(lookup => SyntaxTemplate.Statement(template, Built(holes, lookup)), Collect(holes));

    /// <summary>Holes joined by <paramref name="separator"/>, for argument lists and initializers of any length.</summary>
    public static (string Template, Piece[] Holes) Joined(IReadOnlyList<Piece> pieces, string separator, int first)
    {
        var template = string.Join(
            separator,
            pieces.Select((_, i) => "$" + (first + i).ToString(System.Globalization.CultureInfo.InvariantCulture))
        );
        return (template, [.. pieces]);
    }

    private static SyntaxNode[] Built(Piece[] holes, NodeLookup lookup) =>
        [.. holes.Select(hole => hole.Build(lookup))];

    private static SyntaxNode[] Collect(Piece[] holes) => [.. holes.SelectMany(static hole => hole.Uses)];
}

/// <summary>Edits a <see cref="MethodRewrite"/> plans with <see cref="Piece"/>s.</summary>
internal static class PieceEdits
{
    public static void ReplaceStatement(
        this MethodRewrite rewrite,
        StatementSyntax target,
        params Piece[] statements
    ) =>
        rewrite.Edits.ReplaceStatement(
            target,
            lookup => [.. statements.Select(statement => (StatementSyntax)statement.Build(lookup))],
            [.. statements.SelectMany(static statement => statement.Uses)]
        );

    public static void InsertBefore(this MethodRewrite rewrite, StatementSyntax target, params Piece[] statements) =>
        rewrite.Edits.InsertBefore(
            target,
            lookup => [.. statements.Select(statement => (StatementSyntax)statement.Build(lookup))],
            [.. statements.SelectMany(static statement => statement.Uses)]
        );

    public static void Replace(this MethodRewrite rewrite, SyntaxNode target, Piece replacement) =>
        rewrite.Edits.Replace(target, replacement.Build, [.. replacement.Uses]);
}
