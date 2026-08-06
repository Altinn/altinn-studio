using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Rewrites the two mechanical <c>PlatformHttpException</c> breaks in v9.
/// <list type="bullet">
/// <item><c>PlatformHttpException.CreateAsync(response)</c> is renamed to <c>Create(response)</c>.</item>
/// <item>
/// The public constructor takes a <c>PlatformHttpResponse</c> snapshot instead of a live
/// <c>HttpResponseMessage</c>, so the first argument is wrapped.
/// </item>
/// </list>
/// <para>
/// Reading <c>ex.Response.StatusCode</c> needs no rewrite: the snapshot exposes <c>StatusCode</c> under
/// the same name, so those call sites keep compiling. Uses of <c>.Response</c> that the snapshot cannot
/// satisfy are reported by <see cref="PlatformHttpExceptionApiDetector"/> instead.
/// </para>
/// </summary>
internal sealed class PlatformHttpExceptionApiMigration
{
    private const string ExceptionTypeName = "PlatformHttpException";
    private const string SnapshotTypeName = "PlatformHttpResponse";
    private const string HttpResponseMessageTypeName = "HttpResponseMessage";
    private const string ResponseParameterName = "response";
    private const string RenamedFactory = "CreateAsync";
    private const string NewFactory = "Create";
    private const string HelpersNamespace = "Altinn.App.Core.Helpers";

    private readonly CSharpSourceScanner _scanner;

    public PlatformHttpExceptionApiMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var changes = new List<string>();

        foreach (var file in _scanner.Files)
        {
            var rewriter = new Rewriter(file);
            var updated = rewriter.Visit(file.Root);
            if (rewriter.Changes.Count == 0)
            {
                continue;
            }

            // A file may reference the exception fully qualified, in which case the emitted
            // `PlatformHttpResponse` would not bind without the using.
            if (rewriter.NeedsHelpersUsing && updated is CompilationUnitSyntax unit)
            {
                updated = AddUsingIfMissing(unit, HelpersNamespace);
            }

            File.WriteAllText(file.Path, updated.ToFullString());
            changes.AddRange(rewriter.Changes);
        }

        if (changes.Count == 0)
        {
            return new MigrationResult(ManualActionRequired: false, Array.Empty<string>());
        }

        changes.Insert(
            0,
            "Migrated PlatformHttpException to the v9 response snapshot. Note that the constructor no longer "
                + "captures the response body - where the body matters, switch the call site to the async "
                + "PlatformHttpException.Create(response), which reads it. Rewrites:"
        );

        // Every rewrite here leaves the app compiling, so no manual follow-up is demanded.
        return new MigrationResult(ManualActionRequired: false, changes);
    }

    private static CompilationUnitSyntax AddUsingIfMissing(CompilationUnitSyntax unit, string namespaceName)
    {
        if (unit.Usings.Any(existing => existing.Name?.ToString() == namespaceName))
        {
            return unit;
        }

        var directive = SyntaxFactory
            .UsingDirective(SyntaxFactory.ParseName(namespaceName))
            .NormalizeWhitespace()
            .WithTrailingTrivia(SyntaxFactory.ElasticCarriageReturnLineFeed);

        var insertAt = unit.Usings.IndexOf(existing =>
            string.CompareOrdinal(existing.Name?.ToString(), namespaceName) > 0
        );

        return unit.WithUsings(insertAt < 0 ? unit.Usings.Add(directive) : unit.Usings.Insert(insertAt, directive));
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;

        public Rewriter(ScannedCSharpFile file)
        {
            _file = file;
        }

        public List<string> Changes { get; } = [];

        public bool NeedsHelpersUsing { get; private set; }

        public override SyntaxNode? VisitInvocationExpression(InvocationExpressionSyntax node)
        {
            var visited = (InvocationExpressionSyntax?)base.VisitInvocationExpression(node);
            if (visited is null)
            {
                return null;
            }

            if (
                visited.Expression is not MemberAccessExpressionSyntax memberAccess
                || memberAccess.Name.Identifier.Text != RenamedFactory
                || TrailingName(memberAccess.Expression) != ExceptionTypeName
            )
            {
                return visited;
            }

            Changes.Add(
                $"{_file.RelativePath}:{_file.GetLine(node)}: PlatformHttpException.CreateAsync(..) -> Create(..)"
            );

            return visited.WithExpression(
                memberAccess.WithName(SyntaxFactory.IdentifierName(NewFactory).WithTriviaFrom(memberAccess.Name))
            );
        }

        public override SyntaxNode? VisitObjectCreationExpression(ObjectCreationExpressionSyntax node) =>
            RewriteCreation(node, base.VisitObjectCreationExpression(node));

        public override SyntaxNode? VisitImplicitObjectCreationExpression(
            ImplicitObjectCreationExpressionSyntax node
        ) => RewriteCreation(node, base.VisitImplicitObjectCreationExpression(node));

        /// <summary>
        /// Wraps the first constructor argument in a snapshot. Handles target-typed <c>new(..)</c> as well
        /// as <c>new PlatformHttpException(..)</c> — the one real-world call site found across the app
        /// estate is written as target-typed <c>new(..)</c>, which a textual search for
        /// <c>new PlatformHttpException(</c> does not find at all.
        /// </summary>
        private SyntaxNode? RewriteCreation(BaseObjectCreationExpressionSyntax original, SyntaxNode? rewritten)
        {
            if (rewritten is not BaseObjectCreationExpressionSyntax visited)
            {
                return rewritten;
            }

            if (ConstructedTypeName(original) != ExceptionTypeName)
            {
                return visited;
            }

            if (visited.ArgumentList is not { } argumentList || argumentList.Arguments.Count == 0)
            {
                return visited;
            }

            // Named arguments may be written in any order, so position 0 is not necessarily the
            // response. Prefer the one named `response`; if the call is named but has no such
            // argument, leave it alone rather than emit a rewrite that will not compile.
            var first = argumentList.Arguments[0];
            if (argumentList.Arguments.Any(argument => argument.NameColon is not null))
            {
                var named = argumentList.Arguments.FirstOrDefault(argument =>
                    argument.NameColon?.Name.Identifier.Text == ResponseParameterName
                );

                if (named is null)
                {
                    return visited;
                }

                first = named;
            }

            var replacement = BuildSnapshotArgument(first.Expression);
            if (replacement is null)
            {
                return visited;
            }

            NeedsHelpersUsing = true;
            Changes.Add(
                $"{_file.RelativePath}:{_file.GetLine(original)}: new PlatformHttpException(..) now takes a "
                    + "PlatformHttpResponse snapshot"
            );

            var updatedArguments = argumentList.Arguments.Replace(first, first.WithExpression(replacement));
            return visited.WithArgumentList(argumentList.WithArguments(updatedArguments));
        }

        /// <summary>
        /// The simple name of the constructed type, resolving target-typed <c>new(..)</c>.
        /// </summary>
        /// <remarks>
        /// <see cref="CSharpSyntaxQueries.ConstructedTypeName"/> deliberately stops at a
        /// <c>return</c> or expression-body arrow rather than walk further out, because for its callers an
        /// outer declaration could be an unrelated type. That is too conservative here: the only
        /// constructor call site found across the app estate is an expression-bodied factory method
        /// (<c>static PlatformHttpException PlatformError(..) =&gt; new(..)</c>), where the enclosing
        /// member's return type is precisely the target type. So fall back to reading it, rather than
        /// loosening the shared helper for every other migration.
        /// </remarks>
        private static string? ConstructedTypeName(BaseObjectCreationExpressionSyntax creation)
        {
            if (CSharpSyntaxQueries.ConstructedTypeName(creation) is { } resolved)
            {
                return resolved;
            }

            // Only an expression body or a `return` takes its type from the enclosing member; anything
            // else (an argument, an initializer element) does not, and the shared helper already
            // returned null for those.
            var isMemberResult = creation
                .Ancestors()
                .TakeWhile(node => node is not MemberDeclarationSyntax)
                .Any(node => node is ArrowExpressionClauseSyntax or ReturnStatementSyntax);

            if (!isMemberResult)
            {
                return null;
            }

            return creation.FirstAncestorOrSelf<MemberDeclarationSyntax>() switch
            {
                MethodDeclarationSyntax method => SimpleTypeName(method.ReturnType),
                PropertyDeclarationSyntax property => SimpleTypeName(property.Type),
                _ => null,
            };
        }

        /// <summary>
        /// The snapshot expression to substitute for a live-response argument, or <c>null</c> to leave the
        /// argument alone.
        /// </summary>
        private static ExpressionSyntax? BuildSnapshotArgument(ExpressionSyntax argument)
        {
            // Already migrated (or hand-written against v9): re-running the upgrade must not double-wrap.
            if (
                argument
                    .DescendantNodesAndSelf()
                    .OfType<SimpleNameSyntax>()
                    .Any(name => name.Identifier.Text == SnapshotTypeName)
            )
            {
                return null;
            }

            // `new PlatformHttpException(new HttpResponseMessage(status), ..)` is the test-double shape.
            // Constructing a throwaway HttpResponseMessage just to snapshot it is pointless, so build the
            // snapshot directly. The status expression already implies a `System.Net` using in this file.
            if (
                argument is ObjectCreationExpressionSyntax creation
                && SimpleTypeName(creation.Type) == HttpResponseMessageTypeName
                && creation.ArgumentList?.Arguments.Count == 1
            )
            {
                return SyntaxFactory.ParseExpression(
                    $"new {SnapshotTypeName} {{ StatusCode = {creation.ArgumentList.Arguments[0].Expression} }}"
                );
            }

            // Anything else (including a parameterless `new HttpResponseMessage()`): snapshot at runtime.
            return SyntaxFactory.ParseExpression($"{SnapshotTypeName}.FromHttpResponse({argument})");
        }

        private static string? TrailingName(ExpressionSyntax expression) =>
            expression switch
            {
                SimpleNameSyntax simple => simple.Identifier.Text,
                MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.Text,
                AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
                _ => null,
            };

        private static string? SimpleTypeName(TypeSyntax? type) =>
            type switch
            {
                IdentifierNameSyntax identifier => identifier.Identifier.Text,
                GenericNameSyntax generic => generic.Identifier.Text,
                QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
                AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
                _ => null,
            };
    }
}
