using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the Correspondence v9 breaks that have a mechanical, semantics-preserving rewrite:
/// the builder methods and properties that v8 already discarded, the singular-to-list recipient rename,
/// the removed builder step interface, and the two superseded payload constructors.
/// </summary>
/// <remarks>
/// <p>Every rewrite is reported, so a developer can review what changed — the same contract as
/// <see cref="EFormidlingReceiversSignatureMigration"/>. Anything this migration cannot rewrite safely is
/// left in place for <see cref="LegacyCorrespondenceCodeDetector"/> to report, which makes the detector
/// the fallback rather than a duplicate: a usage is either fixed here or warned about there, never both.</p>
/// <p>Two shapes are deliberately left alone because removing the call would produce code that does not
/// compile or would change control flow: a no-op invocation that forms the entire body of an
/// expression-bodied member or lambda (dropping to a bare receiver is not a valid statement), and a
/// null-conditional call (<c>builder?.WithSender(x)</c>). Both are rare in fluent code and both are
/// reported instead.</p>
/// </remarks>
internal sealed class CorrespondenceApiMigration
{
    /// <summary>
    /// Builder methods that v8 accepted and silently discarded, so deleting the call cannot change the
    /// request that is sent.
    /// </summary>
    private static readonly IReadOnlySet<string> _noOpBuilderMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "WithSender",
        "WithAllowSystemDeleteAfter",
        "WithRequestedSendTime",
        "WithDataLocationType",
    };

    /// <summary>
    /// Properties that were never mapped to any request, keyed by the type they are set on so the generic
    /// names cannot match an unrelated initializer.
    /// </summary>
    private static readonly Dictionary<string, IReadOnlySet<string>> _noOpProperties = new(StringComparer.Ordinal)
    {
        ["CorrespondenceRequest"] = new HashSet<string>(StringComparer.Ordinal) { "Sender", "AllowSystemDeleteAfter" },
        ["CorrespondenceNotification"] = new HashSet<string>(StringComparer.Ordinal) { "RequestedSendTime" },
        ["CorrespondenceAttachment"] = new HashSet<string>(StringComparer.Ordinal) { "DataLocationType" },
    };

    private const string NotificationType = "CorrespondenceNotification";
    private const string SingularRecipientProperty = "CustomRecipient";
    private const string PluralRecipientProperty = "CustomRecipients";

    private const string RemovedStepInterface = "ICorrespondenceRequestBuilderSender";
    private const string ReplacementStepInterface = "ICorrespondenceRequestBuilderSendersReference";

    private static readonly IReadOnlySet<string> _payloadTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "SendCorrespondencePayload",
        "GetCorrespondenceStatusPayload",
    };

    private const string AuthenticationMethodType = "CorrespondenceAuthenticationMethod";
    private const string LegacyAuthorisationType = "CorrespondenceAuthorisation";
    private const string AuthenticationMethodNamespace = "Altinn.App.Core.Features";

    private readonly CSharpSourceScanner _scanner;

    public CorrespondenceApiMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var warnings = new List<string>();

        foreach (var file in _scanner.Files)
        {
            var rewriter = new Rewriter(file);
            var updated = rewriter.Visit(file.Root);
            if (rewriter.Changes.Count == 0)
            {
                continue;
            }

            if (rewriter.NeedsAuthenticationMethodUsing && updated is CompilationUnitSyntax unit)
            {
                updated = AddUsingIfMissing(unit, AuthenticationMethodNamespace);
            }

            File.WriteAllText(file.Path, updated.ToFullString());
            warnings.AddRange(rewriter.Changes);
        }

        if (warnings.Count > 0)
        {
            warnings.Insert(
                0,
                "Migrated removed Correspondence APIs. Each rewrite is listed below - review them, especially any "
                    + "line noting a discarded argument, since the argument expression is no longer evaluated:"
            );
        }

        // Auto-migration: the app compiles again, so no manual action is required for these rewrites.
        return new MigrationResult(ManualActionRequired: false, warnings);
    }

    private static CompilationUnitSyntax AddUsingIfMissing(CompilationUnitSyntax unit, string namespaceName)
    {
        if (unit.Usings.Any(existing => existing.Name?.ToString() == namespaceName))
        {
            return unit;
        }

        // NormalizeWhitespace supplies the space after the `using` keyword; constructing the directive
        // without it emits `usingSome.Namespace;`.
        var directive = SyntaxFactory
            .UsingDirective(SyntaxFactory.ParseName(namespaceName))
            .NormalizeWhitespace()
            .WithTrailingTrivia(SyntaxFactory.ElasticCarriageReturnLineFeed);

        return unit.WithUsings(unit.Usings.Add(directive));
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;

        public Rewriter(ScannedCSharpFile file)
        {
            _file = file;
        }

        public List<string> Changes { get; } = [];

        public bool NeedsAuthenticationMethodUsing { get; private set; }

        private void Record(SyntaxNode original, string description) =>
            Changes.Add($"{_file.RelativePath}:{_file.GetLine(original)}: {description}");

        public override SyntaxNode? VisitExpressionStatement(ExpressionStatementSyntax node)
        {
            // `builder.WithSender(x);` standing alone: the value is discarded, so the statement goes.
            // Rewriting it to `builder;` would not compile.
            if (
                node.Expression is InvocationExpressionSyntax invocation
                && invocation.Expression is MemberAccessExpressionSyntax memberAccess
                && _noOpBuilderMethods.Contains(memberAccess.Name.Identifier.Text)
            )
            {
                Record(
                    node,
                    $"removed the no-op statement `{memberAccess.Name.Identifier.Text}(..)`"
                        + DiscardedArgumentNote(invocation)
                );
                return null;
            }

            return base.VisitExpressionStatement(node);
        }

        public override SyntaxNode? VisitInvocationExpression(InvocationExpressionSyntax node)
        {
            var visited = (InvocationExpressionSyntax)base.VisitInvocationExpression(node)!;

            if (
                visited.Expression is not MemberAccessExpressionSyntax memberAccess
                || !_noOpBuilderMethods.Contains(memberAccess.Name.Identifier.Text)
            )
            {
                return visited;
            }

            // Only unlink where the result is consumed as part of a larger expression. Elsewhere (an
            // expression-bodied member, a lambda body) a bare receiver is not valid, so leave it for the
            // detector.
            if (!IsSafeToUnlink(node))
            {
                return visited;
            }

            Record(
                node,
                $"removed the no-op builder call `.{memberAccess.Name.Identifier.Text}(..)`"
                    + DiscardedArgumentNote(visited)
            );
            return memberAccess.Expression.WithTriviaFrom(visited);
        }

        /// <summary>
        /// Whether the parent expression consumes this invocation's value in a position where a bare
        /// receiver is also valid. <see cref="VisitExpressionStatement"/> handles the statement case.
        /// </summary>
        private static bool IsSafeToUnlink(InvocationExpressionSyntax node) =>
            node.Parent switch
            {
                // The chain continues: `.WithSender(x).WithSendersReference(y)`.
                MemberAccessExpressionSyntax parentAccess => parentAccess.Expression == node,
                EqualsValueClauseSyntax => true,
                ReturnStatementSyntax => true,
                ArgumentSyntax => true,
                AssignmentExpressionSyntax assignment => assignment.Right == node,
                _ => false,
            };

        /// <summary>
        /// Notes when the discarded argument contains an invocation, since that call no longer runs.
        /// </summary>
        private static string DiscardedArgumentNote(InvocationExpressionSyntax invocation) =>
            invocation.ArgumentList.Arguments.Any(argument =>
                argument.Expression.DescendantNodesAndSelf().OfType<InvocationExpressionSyntax>().Any()
            )
                ? " - NOTE: the discarded argument contained a call, which is no longer evaluated"
                : string.Empty;

        public override SyntaxNode? VisitObjectCreationExpression(ObjectCreationExpressionSyntax node)
        {
            var visited = (ObjectCreationExpressionSyntax)base.VisitObjectCreationExpression(node)!;
            var typeName = TrailingTypeName(visited.Type);
            if (typeName is null)
            {
                return visited;
            }

            visited = RewritePayloadAuthentication(node, visited, typeName);
            visited = RewriteInitializer(node, visited, typeName);
            return visited;
        }

        /// <summary>
        /// Replaces the two superseded payload constructors: a bare token factory becomes
        /// <c>CorrespondenceAuthenticationMethod.Custom(factory)</c>, and the legacy authorisation enum
        /// becomes <c>CorrespondenceAuthenticationMethod.Default()</c>.
        /// </summary>
        private ObjectCreationExpressionSyntax RewritePayloadAuthentication(
            ObjectCreationExpressionSyntax original,
            ObjectCreationExpressionSyntax visited,
            string typeName
        )
        {
            const int authenticationArgumentIndex = 1;
            if (!_payloadTypes.Contains(typeName) || visited.ArgumentList is null)
            {
                return visited;
            }

            var arguments = visited.ArgumentList.Arguments;
            if (arguments.Count <= authenticationArgumentIndex)
            {
                return visited;
            }

            var argument = arguments[authenticationArgumentIndex];
            ExpressionSyntax? replacement = argument.Expression switch
            {
                // `() => GetToken()` - a delegate cannot bind to CorrespondenceAuthenticationMethod, so
                // this is unambiguously the removed token-factory overload.
                AnonymousFunctionExpressionSyntax => StaticCall(
                    AuthenticationMethodType,
                    "Custom",
                    argument.Expression
                ),
                // `CorrespondenceAuthorisation.Maskinporten` - the only member the enum ever had.
                MemberAccessExpressionSyntax enumAccess
                    when TrailingName(enumAccess.Expression) == LegacyAuthorisationType => StaticCall(
                    AuthenticationMethodType,
                    "Default"
                ),
                _ => null,
            };

            if (replacement is null)
            {
                return visited;
            }

            var isEnumForm = argument.Expression is MemberAccessExpressionSyntax;
            Record(
                original,
                isEnumForm
                    ? $"replaced `{LegacyAuthorisationType}.Maskinporten` with `{AuthenticationMethodType}.Default()` "
                        + "in the payload constructor - NOTE: Default() also requests "
                        + "altinn:serviceowner/instances.read and altinn:serviceowner/instances.write, so the "
                        + "Maskinporten client needs those scopes"
                    : $"wrapped the token factory in `{AuthenticationMethodType}.Custom(..)` in the payload constructor"
            );
            NeedsAuthenticationMethodUsing = true;

            return visited.WithArgumentList(
                visited.ArgumentList.WithArguments(arguments.Replace(argument, argument.WithExpression(replacement)))
            );
        }

        /// <summary>
        /// Drops initializer assignments that v8 discarded, and renames the singular recipient property to
        /// the v9 list.
        /// </summary>
        private ObjectCreationExpressionSyntax RewriteInitializer(
            ObjectCreationExpressionSyntax original,
            ObjectCreationExpressionSyntax visited,
            string typeName
        )
        {
            if (visited.Initializer is null)
            {
                return visited;
            }

            _noOpProperties.TryGetValue(typeName, out var removable);
            var expressions = visited.Initializer.Expressions;
            var kept = new List<ExpressionSyntax>();
            var changed = false;

            foreach (var expression in expressions)
            {
                if (
                    expression is not AssignmentExpressionSyntax assignment
                    || assignment.Left is not IdentifierNameSyntax member
                )
                {
                    kept.Add(expression);
                    continue;
                }

                var name = member.Identifier.Text;

                if (removable is not null && removable.Contains(name))
                {
                    Record(original, $"removed the no-op initializer `{typeName}.{name}`");
                    changed = true;
                    continue;
                }

                if (typeName == NotificationType && name == SingularRecipientProperty)
                {
                    Record(original, $"changed `{SingularRecipientProperty}` to the `{PluralRecipientProperty}` list");
                    changed = true;
                    kept.Add(
                        assignment
                            .WithLeft(SyntaxFactory.IdentifierName(PluralRecipientProperty).WithTriviaFrom(member))
                            .WithRight(CollectionOf(assignment.Right))
                    );
                    continue;
                }

                kept.Add(expression);
            }

            if (!changed)
            {
                return visited;
            }

            // Dropping every entry would leave `new T { }`, which is valid but pointless - drop the
            // initializer with it.
            var initializer =
                kept.Count == 0 ? null : visited.Initializer.WithExpressions(SyntaxFactory.SeparatedList(kept));

            return visited.WithInitializer(initializer);
        }

        public override SyntaxNode? VisitIdentifierName(IdentifierNameSyntax node)
        {
            if (node.Identifier.Text != RemovedStepInterface)
            {
                return base.VisitIdentifierName(node);
            }

            Record(node, $"renamed `{RemovedStepInterface}` to `{ReplacementStepInterface}`");
            return SyntaxFactory.IdentifierName(ReplacementStepInterface).WithTriviaFrom(node);
        }

        private static InvocationExpressionSyntax StaticCall(string type, string method, params ExpressionSyntax[] args)
        {
            var arguments = SyntaxFactory.ArgumentList(
                SyntaxFactory.SeparatedList(args.Select(SyntaxFactory.Argument))
            );

            return SyntaxFactory.InvocationExpression(
                SyntaxFactory.MemberAccessExpression(
                    SyntaxKind.SimpleMemberAccessExpression,
                    SyntaxFactory.IdentifierName(type),
                    SyntaxFactory.IdentifierName(method)
                ),
                arguments
            );
        }

        private static CollectionExpressionSyntax CollectionOf(ExpressionSyntax element) =>
            SyntaxFactory.CollectionExpression(
                SyntaxFactory.SingletonSeparatedList<CollectionElementSyntax>(
                    SyntaxFactory.ExpressionElement(element.WithoutLeadingTrivia())
                )
            );

        private static string? TrailingTypeName(TypeSyntax? type) =>
            type switch
            {
                IdentifierNameSyntax identifier => identifier.Identifier.Text,
                GenericNameSyntax generic => generic.Identifier.Text,
                QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
                AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
                NullableTypeSyntax nullable => TrailingTypeName(nullable.ElementType),
                _ => null,
            };

        private static string? TrailingName(ExpressionSyntax expression) =>
            expression switch
            {
                SimpleNameSyntax simple => simple.Identifier.Text,
                MemberAccessExpressionSyntax access => access.Name.Identifier.Text,
                AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
                _ => null,
            };
    }
}
