using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Rewrites reads of the app's configuration through <c>IAppMetadata</c> to the v9 properties: the files are in
/// memory, so <c>await appMetadata.GetApplicationMetadata()</c> becomes <c>appMetadata.ApplicationMetadata</c>,
/// <c>await GetApplicationXACMLPolicy()</c> becomes <c>XacmlPolicy</c> and <c>await GetApplicationBPMNProcess()</c>
/// becomes <c>ProcessDefinition</c>. A call blocked on with <c>.Result</c> and one followed by
/// <c>.ConfigureAwait(..)</c> are rewritten the same way.
/// </summary>
/// <remarks>
/// The old methods still exist in v9 as obsolete default implementations, so a call this migration leaves alone -
/// a task handed on without an await, say - keeps compiling. Receivers are matched by their declared type within
/// the file, as a field, parameter, property or local typed <c>IAppMetadata</c>, and through the semantic model
/// when the scanner has one, so an unrelated <c>GetApplicationMetadata</c> on the app's own type is not touched.
/// A method whose only await was rewritten is left <c>async</c>; apps generated from the template silence the
/// warning for that (CS1998), and the code runs synchronously either way.
/// </remarks>
internal sealed class AppMetadataPropertyMigration
{
    private const string InterfaceName = "IAppMetadata";

    private static readonly IReadOnlyDictionary<string, string> _propertyByMethod = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["GetApplicationMetadata"] = "ApplicationMetadata",
        ["GetApplicationXACMLPolicy"] = "XacmlPolicy",
        ["GetApplicationBPMNProcess"] = "ProcessDefinition",
    };

    private const string RewriteSummary =
        "Migrated IAppMetadata reads to the v9 properties, since the app files are in memory: GetApplicationMetadata() "
        + "is ApplicationMetadata, GetApplicationXACMLPolicy() is XacmlPolicy and GetApplicationBPMNProcess() is "
        + "ProcessDefinition. A method whose only await was one of these still compiles; remove its async keyword "
        + "when you touch it next. Rewrites:";

    private const string LeftoverSummary =
        "These IAppMetadata calls are not awaited where they are made, so they were left alone. They still work "
        + "in v9 as obsolete methods that return the property; read the property instead when you touch them next:";

    private readonly CSharpSourceScanner _scanner;

    public AppMetadataPropertyMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var rewrites = new List<string>();
        var leftovers = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var receivers = new DeclaredTypeReceiverClassifier(file, InterfaceName);
            var rewriter = new Rewriter(file, receivers);
            var updated = (CompilationUnitSyntax?)rewriter.Visit(file.Root);
            leftovers.AddRange(rewriter.Leftovers);
            if (updated is null || rewriter.Changes.Count == 0)
            {
                continue;
            }

            _scanner.Update(file, updated);
            rewrites.AddRange(rewriter.Changes);
        }

        var messages = new List<UpgradeMessage>();
        if (rewrites.Count > 0)
        {
            messages.Warn(RewriteSummary);
            messages.WarnRange(rewrites);
        }

        if (leftovers.Count > 0)
        {
            messages.Warn(LeftoverSummary);
            messages.WarnRange(leftovers);
        }

        return new MigrationResult(messages);
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;
        private readonly DeclaredTypeReceiverClassifier _receivers;

        public Rewriter(ScannedCSharpFile file, DeclaredTypeReceiverClassifier receivers)
        {
            _file = file;
            _receivers = receivers;
        }

        public List<string> Changes { get; } = [];

        public List<string> Leftovers { get; } = [];

        public override SyntaxNode? VisitAwaitExpression(AwaitExpressionSyntax node)
        {
            // `await x.Get..()`, `await (x.Get..())` and `await x.Get..().ConfigureAwait(..)`
            if (Call(Unwrap(node.Expression)) is { } call)
            {
                return Property(call, node);
            }

            return base.VisitAwaitExpression(node);
        }

        public override SyntaxNode? VisitMemberAccessExpression(MemberAccessExpressionSyntax node)
        {
            // `x.Get..().Result`
            if (node.Name.Identifier.Text == "Result" && Call(node.Expression) is { } call)
            {
                return Property(call, node);
            }

            return base.VisitMemberAccessExpression(node);
        }

        public override SyntaxNode? VisitInvocationExpression(InvocationExpressionSyntax node)
        {
            // Reached only for a call that is neither awaited nor blocked on, since the two visitors above
            // return before visiting their children. Such a call is handed on as a task and still works.
            if (Call(node) is { } call && !IsInsideRewrittenShape(node))
            {
                Leftovers.Add($"{_file.RelativePath}:{_file.GetLine(node)}: {call.Receiver}.{call.Method}()");
            }

            return base.VisitInvocationExpression(node);
        }

        private SyntaxNode Property(AppMetadataCall call, SyntaxNode replaced)
        {
            Changes.Add(
                $"{_file.RelativePath}:{_file.GetLine(replaced)}: {call.Receiver}.{call.Method}() -> "
                    + $"{call.Receiver}.{call.Property}"
            );

            return SyntaxFactory
                .MemberAccessExpression(
                    SyntaxKind.SimpleMemberAccessExpression,
                    call.ReceiverExpression.WithoutTrivia(),
                    SyntaxFactory.IdentifierName(call.Property)
                )
                .WithTriviaFrom(replaced);
        }

        /// <summary>The call when <paramref name="expression"/> is one of the three methods on an IAppMetadata.</summary>
        private AppMetadataCall? Call(ExpressionSyntax expression)
        {
            if (
                expression is not InvocationExpressionSyntax { ArgumentList.Arguments.Count: 0 } invocation
                || invocation.Expression is not MemberAccessExpressionSyntax memberAccess
                || !_propertyByMethod.TryGetValue(memberAccess.Name.Identifier.Text, out var property)
                || !_receivers.IsOfType(memberAccess.Expression)
            )
            {
                return null;
            }

            return new AppMetadataCall(
                memberAccess.Expression,
                memberAccess.Expression.WithoutTrivia().ToString(),
                memberAccess.Name.Identifier.Text,
                property
            );
        }

        /// <summary>Strips parentheses and a trailing <c>.ConfigureAwait(..)</c>.</summary>
        private static ExpressionSyntax Unwrap(ExpressionSyntax expression)
        {
            while (true)
            {
                switch (expression)
                {
                    case ParenthesizedExpressionSyntax parenthesized:
                        expression = parenthesized.Expression;
                        continue;
                    case InvocationExpressionSyntax
                    {
                        Expression: MemberAccessExpressionSyntax
                        {
                            Name.Identifier.Text: "ConfigureAwait"
                        } configureAwait,
                    }:
                        expression = configureAwait.Expression;
                        continue;
                    default:
                        return expression;
                }
            }
        }

        private static bool IsInsideRewrittenShape(InvocationExpressionSyntax invocation)
        {
            for (SyntaxNode? current = invocation.Parent; current is not null; current = current.Parent)
            {
                switch (current)
                {
                    case AwaitExpressionSyntax:
                        return true;
                    case MemberAccessExpressionSyntax { Name.Identifier.Text: "Result" }:
                        return true;
                    case ParenthesizedExpressionSyntax:
                    case InvocationExpressionSyntax
                    {
                        Expression: MemberAccessExpressionSyntax { Name.Identifier.Text: "ConfigureAwait" }
                    }:
                    case MemberAccessExpressionSyntax { Name.Identifier.Text: "ConfigureAwait" }:
                        continue;
                    default:
                        return false;
                }
            }

            return false;
        }

        private readonly record struct AppMetadataCall(
            ExpressionSyntax ReceiverExpression,
            string Receiver,
            string Method,
            string Property
        );
    }
}
