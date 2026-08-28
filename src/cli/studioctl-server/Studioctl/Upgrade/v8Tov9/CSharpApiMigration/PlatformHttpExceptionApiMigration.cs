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
    private const string StatusCodeParameterName = "statusCode";
    private const string RenamedFactory = "CreateAsync";
    private const string NewFactory = "Create";

    private readonly CSharpSourceScanner _scanner;

    public PlatformHttpExceptionApiMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var rewrites = new List<string>();
        var unresolved = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var rewriter = new Rewriter(file);
            var updated = rewriter.Visit(file.Root);
            unresolved.AddRange(rewriter.Unresolved);
            if (rewriter.Changes.Count == 0)
            {
                continue;
            }

            _scanner.Update(file, (CompilationUnitSyntax)updated);
            rewrites.AddRange(rewriter.Changes);
        }

        var messages = new List<UpgradeMessage>();
        if (rewrites.Count > 0)
        {
            messages.Warn(
                "Migrated PlatformHttpException to its v9 shape. The constructor now takes a status code; where "
                    + "the response body and headers matter, switch the call site to the asynchronous "
                    + "PlatformHttpException.Create(response), which captures them. Rewrites:"
            );
            messages.WarnRange(rewrites);
        }

        // The rewrites leave the app compiling; anything left unresolved does need a human.
        if (unresolved.Count > 0)
        {
            messages.Todo(
                "These PlatformHttpException constructor calls could not be rewritten - the response argument's "
                    + "type is not determinable from syntax, and a wrong guess would not compile:"
            );
            messages.WarnRange(unresolved);
        }

        return new MigrationResult(messages);
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

            var migrated = first.WithExpression(replacement);
            if (migrated.NameColon is { } nameColon)
            {
                // v9's first parameter is `statusCode`; keeping the old `response:` label would not compile.
                migrated = migrated.WithNameColon(
                    nameColon.WithName(SyntaxFactory.IdentifierName(StatusCodeParameterName))
                );
            }

            var updatedArguments = argumentList.Arguments.Replace(first, migrated);
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
        /// Type is resolved from the enclosing member's parameters and locals rather than inferred from
        /// tokens appearing inside the expression. Token-sniffing gets both directions wrong: a v8
        /// <c>BuildResponse(HttpStatusCode.NotFound)</c> returning a response would look migrated, and an
        /// already-migrated bare <c>statusCode</c> identifier would look unresolved on a second pass.
        /// When the type cannot be established the call is left alone silently: a genuine v8 call that
        /// slips through fails to compile against v9, which is loud enough, whereas reporting every
        /// unclassifiable expression would flag already-migrated code on every re-run.
        /// </remarks>
        private static (ExpressionSyntax? Replacement, bool Reportable) ClassifyResponseArgument(
            ExpressionSyntax argument
        )
        {
            // A response constructed inline. Target-typed `new(status)` counts: it sits in the first
            // argument of a PlatformHttpException construction, and v8's first parameter is an
            // HttpResponseMessage, so that is what it constructs.
            if (argument is BaseObjectCreationExpressionSyntax creation && IsResponseCreation(creation))
            {
                var arguments = creation.ArgumentList?.Arguments;

                // v9 takes the status code directly, so the throwaway response is unwrapped to the status
                // it carried. This keeps the call site synchronous.
                if (arguments is { Count: 1 })
                {
                    return (arguments.Value[0].Expression, false);
                }

                // `new HttpResponseMessage()` carries no status to unwrap.
                return (null, true);
            }

            if (argument is IdentifierNameSyntax identifier)
            {
                return DeclaredTypeName(identifier) switch
                {
                    StatusCodeTypeName => (null, false),
                    HttpResponseMessageTypeName => (null, true),
                    _ => (null, false),
                };
            }

            // `HttpStatusCode.NotFound` and friends - already migrated, or written against v9.
            if (
                argument is MemberAccessExpressionSyntax memberAccess
                && TrailingName(memberAccess.Expression) == StatusCodeTypeName
            )
            {
                return (null, false);
            }

            return (null, false);
        }

        private static bool IsResponseCreation(BaseObjectCreationExpressionSyntax creation) =>
            creation switch
            {
                ObjectCreationExpressionSyntax explicitCreation => SimpleTypeName(explicitCreation.Type)
                    == HttpResponseMessageTypeName,
                ImplicitObjectCreationExpressionSyntax => true,
                _ => false,
            };

        /// <summary>
        /// The declared type of <paramref name="identifier"/>, resolved from the parameters and
        /// explicitly-typed locals of the enclosing member, or <c>null</c> when it cannot be determined.
        /// </summary>
        private static string? DeclaredTypeName(IdentifierNameSyntax identifier)
        {
            string name = identifier.Identifier.Text;

            for (SyntaxNode? node = identifier.Parent; node is not null; node = node.Parent)
            {
                var declarations = node.ChildNodes()
                    .Select(child =>
                        child switch
                        {
                            LocalDeclarationStatementSyntax local => local.Declaration,
                            VariableDeclarationSyntax variable => variable,
                            _ => null,
                        }
                    )
                    .OfType<VariableDeclarationSyntax>();

                foreach (var declaration in declarations)
                {
                    if (declaration.Variables.Any(variable => variable.Identifier.Text == name))
                    {
                        return SimpleTypeName(declaration.Type);
                    }
                }

                if (node is BaseMethodDeclarationSyntax method)
                {
                    var parameter = method.ParameterList.Parameters.FirstOrDefault(p => p.Identifier.Text == name);
                    return parameter is null ? null : SimpleTypeName(parameter.Type);
                }
            }

            return null;
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
