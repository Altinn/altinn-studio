using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Rewrites the two mechanical <c>PlatformHttpException</c> breaks in v9.
/// <list type="bullet">
/// <item><c>PlatformHttpException.CreateAsync(response)</c> is renamed to <c>Create(response)</c>.</item>
/// <item>
/// The public constructor takes an <c>HttpStatusCode</c> instead of a live <c>HttpResponseMessage</c>,
/// so a constructed throwaway response is unwrapped to the status it carried.
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
    private const string StatusCodeTypeName = "HttpStatusCode";
    private const string HttpResponseMessageTypeName = "HttpResponseMessage";
    private const string ResponseParameterName = "response";
    private const string RenamedFactory = "CreateAsync";
    private const string NewFactory = "Create";

    private readonly CSharpSourceScanner _scanner;

    public PlatformHttpExceptionApiMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var changes = new List<string>();
        var unresolved = new List<string>();

        foreach (var file in _scanner.Files)
        {
            var rewriter = new Rewriter(file);
            var updated = rewriter.Visit(file.Root);
            unresolved.AddRange(rewriter.Unresolved);
            if (rewriter.Changes.Count == 0)
            {
                continue;
            }

            File.WriteAllText(file.Path, updated.ToFullString());
            changes.AddRange(rewriter.Changes);
        }

        if (changes.Count == 0 && unresolved.Count == 0)
        {
            return new MigrationResult(ManualActionRequired: false, Array.Empty<string>());
        }

        if (changes.Count > 0)
        {
            changes.Insert(
                0,
                "Migrated PlatformHttpException to its v9 shape. The constructor now takes a status code; where "
                    + "the response body and headers matter, switch the call site to the asynchronous "
                    + "PlatformHttpException.Create(response), which captures them. Rewrites:"
            );
        }

        if (unresolved.Count > 0)
        {
            changes.Add(
                "These PlatformHttpException constructor calls could not be rewritten - the response argument's "
                    + "type is not determinable from syntax, and a wrong guess would not compile:"
            );
            changes.AddRange(unresolved);
        }

        // The rewrites leave the app compiling; anything left unresolved does need a human.
        return new MigrationResult(ManualActionRequired: unresolved.Count > 0, changes);
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;

        public Rewriter(ScannedCSharpFile file)
        {
            _file = file;
        }

        public List<string> Changes { get; } = [];

        public List<string> Unresolved { get; } = [];

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

            var (replacement, reportable) = ClassifyResponseArgument(first.Expression);
            if (replacement is null)
            {
                if (reportable)
                {
                    Unresolved.Add(
                        $"{_file.RelativePath}:{_file.GetLine(original)}: new PlatformHttpException(..) - could not "
                            + "determine the response argument's type. Use await PlatformHttpException.Create("
                            + "response, message) to capture the whole response, or new PlatformHttpException("
                            + "statusCode, message) when a status code is all you need."
                    );
                }

                return visited;
            }

            Changes.Add(
                $"{_file.RelativePath}:{_file.GetLine(original)}: new PlatformHttpException(..) now takes a "
                    + "status code instead of a response"
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
        /// Classifies the constructor's response argument: the expression to replace it with, and — when
        /// there is none — whether that is worth reporting.
        /// </summary>
        /// <remarks>
        /// Order matters. A v8 call reads <c>new PlatformHttpException(new HttpResponseMessage(status), ..)</c>,
        /// which mentions <c>HttpStatusCode</c> too, so the already-migrated check has to come second or it
        /// swallows the very shape this exists to rewrite.
        /// </remarks>
        private static (ExpressionSyntax? Replacement, bool Reportable) ClassifyResponseArgument(
            ExpressionSyntax argument
        )
        {
            // The test-double shape. v9 has a constructor for exactly it — the status code alone — so the
            // throwaway response is unwrapped to the status it carried. This keeps the call site
            // synchronous, which matters: these are usually expression-bodied test helpers.
            if (
                argument is ObjectCreationExpressionSyntax creation
                && SimpleTypeName(creation.Type) == HttpResponseMessageTypeName
                && creation.ArgumentList?.Arguments.Count == 1
            )
            {
                return (creation.ArgumentList.Arguments[0].Expression, false);
            }

            // Already a status code — either migrated, or written against v9 in the first place. Re-running
            // the upgrade must leave it alone, and silently.
            if (
                argument
                    .DescendantNodesAndSelf()
                    .OfType<SimpleNameSyntax>()
                    .Any(name => name.Identifier.Text == StatusCodeTypeName)
            )
            {
                return (null, false);
            }

            // Anything else: the argument's type cannot be resolved from syntax. v9 builds the exception
            // either from a live response (the asynchronous Create, which reads the body) or from a bare
            // status code — and picking between those is the caller's call, not ours.
            return (null, true);
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
