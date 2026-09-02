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

    private const string WithDataMethod = "WithData";

    /// <summary>Expressions that can only be a byte payload, so wrapping them is provably correct.</summary>
    private static readonly IReadOnlySet<string> _byteProducingMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "GetBytes",
        "FromBase64String",
        "ReadAllBytes",
        "ReadAllBytesAsync",
        "GetDataBytes",
    };

    /// <summary>
    /// Written-out types that mean "memory payload" when a declaration names one: the type is settled,
    /// but no mechanical rewrite compiles (the <c>MemoryStream</c> constructor takes an array).
    /// </summary>
    private static readonly IReadOnlySet<string> _memoryTypeNames = new HashSet<string>(StringComparer.Ordinal)
    {
        "ReadOnlyMemory<byte>",
        "Memory<byte>",
        "ReadOnlyMemory<byte>?",
        "Memory<byte>?",
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
        var rewrites = new List<string>();
        var unresolved = new List<string>();
        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        var files = _scanner.Files.ToArray();

        foreach (var file in files)
        {
            var rewriter = new Rewriter(file, files);
            var updated = rewriter.Visit(file.Root);
            unresolved.AddRange(rewriter.Unresolved);
            if (rewriter.Changes.Count == 0)
            {
                continue;
            }

            if (rewriter.NeedsAuthenticationMethodUsing && updated is CompilationUnitSyntax unit)
            {
                updated = AddUsingIfMissing(unit, AuthenticationMethodNamespace);
            }

            _scanner.Update(file, (CompilationUnitSyntax)updated);
            rewrites.AddRange(rewriter.Changes);
        }

        var messages = new List<UpgradeMessage>();
        if (rewrites.Count > 0)
        {
            messages.Warn(
                "Migrated removed Correspondence APIs. Each rewrite is listed below - review them, especially any "
                    + "line noting a discarded argument, since the argument expression is no longer evaluated:"
            );
            messages.WarnRange(rewrites);
        }

        // Auto-migration: the rewrites leave the app compiling. Unclassifiable WithData sites do need a
        // human, so they leave a to-do behind - the app will not build until they are resolved.
        if (unresolved.Count > 0)
        {
            messages.Todo(
                "These `WithData` call sites could not be rewritten automatically - the removed "
                    + "ReadOnlyMemory<byte> overload and the surviving Stream overload share a name and an arity, "
                    + "so rewriting blindly could break working code:"
            );
            messages.WarnRange(unresolved);
        }

        return new MigrationResult(messages);
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

        // Inserted in sorted position rather than appended, so the app's using order survives a
        // `dotnet format` / CSharpier gate.
        var insertAt = unit.Usings.IndexOf(existing =>
            string.CompareOrdinal(existing.Name?.ToString(), namespaceName) > 0
        );

        return unit.WithUsings(insertAt < 0 ? unit.Usings.Add(directive) : unit.Usings.Insert(insertAt, directive));
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;
        private readonly IReadOnlyList<ScannedCSharpFile> _allFiles;
        private readonly SemanticModel? _semanticModel;

        public Rewriter(ScannedCSharpFile file, IReadOnlyList<ScannedCSharpFile> allFiles)
        {
            _file = file;
            _allFiles = allFiles;
            _semanticModel = file.SemanticModel;
        }

        public List<string> Changes { get; } = [];

        /// <summary>Call sites this migration could not classify, for the developer to resolve.</summary>
        public List<string> Unresolved { get; } = [];

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
                // Only when the no-op IS the whole statement. If the receiver is itself a call, as in
                // `builder.WithResourceId("x").WithSender(y);`, deleting the statement would take
                // WithResourceId with it - the unlinking path below keeps the rest of the chain.
                && memberAccess.Expression is not InvocationExpressionSyntax
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
            var rewritten = base.VisitInvocationExpression(node);
            if (rewritten is not InvocationExpressionSyntax visited)
            {
                return rewritten;
            }

            if (visited.Expression is not MemberAccessExpressionSyntax memberAccess)
            {
                return visited;
            }

            var dataRewrite = RewriteWithData(node, visited, memberAccess.Name);
            if (dataRewrite is not null)
            {
                return dataRewrite;
            }

            if (!_noOpBuilderMethods.Contains(memberAccess.Name.Identifier.Text))
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
        /// `WithData(ReadOnlyMemory&lt;byte&gt;)` is gone; only `WithData(Stream)` survives. The two overloads
        /// share a name and an arity, so an argument can only be classified when the syntax settles it:
        /// a provable byte payload is wrapped in a `MemoryStream`, a provable stream is left alone, and
        /// anything else is reported rather than guessed at — wrapping a stream would not compile.
        /// </summary>
        private InvocationExpressionSyntax? RewriteWithData(
            InvocationExpressionSyntax original,
            InvocationExpressionSyntax visited,
            SimpleNameSyntax name
        )
        {
            if (name.Identifier.Text != WithDataMethod || visited.ArgumentList.Arguments.Count != 1)
            {
                return null;
            }

            var argument = visited.ArgumentList.Arguments[0];

            // With the v8 compilation, overload resolution already answered the question: the call
            // bound to either WithData(ReadOnlyMemory<byte>) or WithData(Stream), and the chosen
            // parameter type says which. A semantic verdict is authoritative - falling through to the
            // syntax heuristics could wrap an argument the semantic model proved unwrappable.
            // Classification runs on `original` - the pristine tree node the semantic model knows;
            // `visited` may contain rewritten descendants it does not.
            var kind =
                ClassifyBoundWithData(original, original.ArgumentList.Arguments[0].Expression)
                ?? ClassifyDataArgument(argument.Expression);

            switch (kind)
            {
                case DataKind.Stream:
                    return null;

                case DataKind.Bytes:
                    Record(original, "wrapped the byte payload passed to `WithData` in a `MemoryStream`");
                    return visited.WithArgumentList(
                        visited.ArgumentList.WithArguments(
                            visited.ArgumentList.Arguments.Replace(
                                argument,
                                argument.WithExpression(
                                    NewObject("MemoryStream", argument.Expression.WithoutTrivia())
                                        .WithTriviaFrom(argument.Expression)
                                )
                            )
                        )
                    );

                case DataKind.ProvenMemory:
                    // The type is settled (bound overload or written-out declaration); only the fix
                    // needs a human, because the MemoryStream constructor takes an array, not a
                    // ReadOnlyMemory/Memory value.
                    Unresolved.Add(
                        $"{_file.RelativePath}:{_file.GetLine(original)}: `WithData({argument.Expression})` - "
                            + "WithData(ReadOnlyMemory<byte>) is removed and this argument is a "
                            + "ReadOnlyMemory/Memory value, which cannot be wrapped in a MemoryStream directly. "
                            + "Pass a Stream instead, or wrap as `new MemoryStream(x.ToArray())` (copies the payload)."
                    );
                    return null;

                default:
                    // `original` for the location: `name` comes off `visited`, which is detached from
                    // the file's tree when an inner rewrite happened in the same chain, and measuring
                    // a detached node reports a line number relative to the fragment.
                    Unresolved.Add(
                        $"{_file.RelativePath}:{_file.GetLine(original)}: `WithData({argument.Expression})` - "
                            + "WithData(ReadOnlyMemory<byte>) is removed. If this argument is a byte payload, wrap it "
                            + "as `new MemoryStream(..)`; if it is already a Stream, nothing needs to change. Its type "
                            + "could not be determined here."
                    );
                    return null;
            }
        }

        private enum DataKind
        {
            Unknown,
            Bytes,
            Stream,

            /// <summary>
            /// Proven <c>ReadOnlyMemory&lt;byte&gt;</c>/<c>Memory&lt;byte&gt;</c> — by overload
            /// resolution or a written-out declaration: the type is known, but no mechanical
            /// rewrite compiles.
            /// </summary>
            ProvenMemory,
        }

        /// <summary>
        /// The kind implied by which v8 <c>WithData</c> overload the call bound to. Returns
        /// <c>null</c> when there is no semantic model or the call did not bind to the SDK's
        /// <c>WithData</c>, letting the syntax classification take over. A call bound to the removed
        /// <c>ReadOnlyMemory&lt;byte&gt;</c> overload only classifies as bytes when the argument itself
        /// is a byte array: a genuine <c>ReadOnlyMemory</c>/<c>Memory</c> value cannot be wrapped in a
        /// <c>MemoryStream</c> mechanically (the constructor takes an array), so it is reported as
        /// <see cref="DataKind.ProvenMemory"/> instead of rewritten into code that does not compile.
        /// </summary>
        private DataKind? ClassifyBoundWithData(InvocationExpressionSyntax original, ExpressionSyntax originalArgument)
        {
            if (_semanticModel?.GetSymbolInfo(original).Symbol is not IMethodSymbol method)
            {
                return null;
            }

            var unreduced = method.ReducedFrom ?? method;
            if (!CSharpSemanticQueries.IsAltinnAppSymbol(unreduced) || unreduced.Parameters.Length == 0)
            {
                return null;
            }

            switch (unreduced.Parameters[^1].Type)
            {
                case INamedTypeSymbol { Name: "Stream", ContainingNamespace.Name: "IO" }:
                    return DataKind.Stream;

                case INamedTypeSymbol { Name: "ReadOnlyMemory" }:
                    var argumentType = _semanticModel.GetTypeInfo(originalArgument).Type;
                    return argumentType is IArrayTypeSymbol { ElementType.SpecialType: SpecialType.System_Byte }
                        ? DataKind.Bytes
                        : DataKind.ProvenMemory;

                default:
                    return null;
            }
        }

        private DataKind ClassifyDataArgument(ExpressionSyntax expression) => ClassifyDataArgument(expression, 0);

        private DataKind ClassifyDataArgument(ExpressionSyntax expression, int depth) =>
            // Bounded because following `var` to its initializer can chain, and pathological source could
            // make it cycle.
            depth > 4
                ? DataKind.Unknown
                : expression switch
                {
                    // `new MemoryStream(..)` / `new byte[..]` settle it outright.
                    ObjectCreationExpressionSyntax creation => TypeNameKind(creation.Type.ToString()),
                    ArrayCreationExpressionSyntax array => TypeNameKind(array.Type.ToString()),
                    ImplicitArrayCreationExpressionSyntax => DataKind.Bytes,
                    // `Encoding.UTF8.GetBytes(..)`, `"x"u8.ToArray()`, `File.ReadAllBytes(..)`.
                    InvocationExpressionSyntax invocation => InvokedNameKind(invocation),
                    AwaitExpressionSyntax awaited => ClassifyDataArgument(awaited.Expression, depth + 1),
                    // A name resolves only if some declaration in the app writes its type out.
                    IdentifierNameSyntax identifier => DeclaredTypeKind(identifier.Identifier.Text, depth, identifier),
                    MemberAccessExpressionSyntax member => DeclaredTypeKind(member.Name.Identifier.Text, depth, member),
                    _ => DataKind.Unknown,
                };

        private DataKind InvokedNameKind(InvocationExpressionSyntax invocation)
        {
            var invoked = invocation.Expression switch
            {
                MemberAccessExpressionSyntax invokedAccess => invokedAccess.Name.Identifier.Text,
                MemberBindingExpressionSyntax binding => binding.Name.Identifier.Text,
                SimpleNameSyntax simple => simple.Identifier.Text,
                _ => null,
            };
            if (invoked is null)
            {
                return DataKind.Unknown;
            }

            if (_byteProducingMethods.Contains(invoked))
            {
                return DataKind.Bytes;
            }

            // `"literal"u8.ToArray()` is a byte array; any other `ToArray()` is not knowable.
            if (
                invoked == "ToArray"
                && invocation.Expression is MemberAccessExpressionSyntax access
                && access.Expression is LiteralExpressionSyntax literal
                && literal.Token.Text.EndsWith("u8", StringComparison.Ordinal)
            )
            {
                return DataKind.Bytes;
            }

            return DeclaredTypeKind(invoked, 0, invocation);
        }

        private static DataKind TypeNameKind(string typeName)
        {
            if (typeName.EndsWith("Stream", StringComparison.Ordinal))
            {
                return DataKind.Stream;
            }

            if (typeName.StartsWith("byte[", StringComparison.Ordinal))
            {
                return DataKind.Bytes;
            }

            if (_memoryTypeNames.Contains(typeName))
            {
                return DataKind.ProvenMemory;
            }

            return DataKind.Unknown;
        }

        /// <summary>
        /// The kind implied by any declaration of <paramref name="name"/> anywhere in the scanned app —
        /// a local with a written-out type, a field, a property, a record parameter or a method return
        /// type. `var` declarations carry no type and stay Unknown.
        /// </summary>
        private DataKind DeclaredTypeKind(string name, int depth, SyntaxNode? origin)
        {
            // Nearest scope wins: the enclosing member, then the enclosing type. Only if neither
            // declares the name do we look app-wide, and then a name declared with conflicting kinds is
            // treated as unknown - guessing would emit `new MemoryStream(stream)`, which does not
            // compile, and the syntax check cannot catch that because the result still parses.
            for (SyntaxNode? scope = origin?.Parent; scope is not null; scope = scope.Parent)
            {
                if (scope is not (MemberDeclarationSyntax or TypeDeclarationSyntax))
                {
                    continue;
                }

                var local = KindsDeclaredWithin(scope, name, depth);
                if (local.Count == 1)
                {
                    return local.Single();
                }

                if (local.Count > 1)
                {
                    return DataKind.Unknown;
                }
            }

            var kinds = new HashSet<DataKind>();
            foreach (var file in _allFiles)
            {
                kinds.UnionWith(KindsDeclaredWithin(file.Root, name, depth));
                if (kinds.Count > 1)
                {
                    return DataKind.Unknown;
                }
            }

            return kinds.Count == 1 ? kinds.Single() : DataKind.Unknown;
        }

        /// <summary>
        /// Every kind implied by a declaration of <paramref name="name"/> inside <paramref name="scope"/> —
        /// a local with a written-out type, a field, a property, a parameter, or a method return type. More
        /// than one kind means the name is ambiguous.
        /// </summary>
        private HashSet<DataKind> KindsDeclaredWithin(SyntaxNode scope, string name, int depth)
        {
            var kinds = new HashSet<DataKind>();

            foreach (var node in scope.DescendantNodesAndSelf())
            {
                // `var payload = await GetBytes(..)` writes out no type, but its initializer often
                // settles the question - the common shape for a byte payload fetched from a client.
                if (
                    node is VariableDeclaratorSyntax declarator
                    && declarator.Identifier.Text == name
                    && declarator.Parent is VariableDeclarationSyntax { Type.IsVar: true }
                    && declarator.Initializer is not null
                )
                {
                    var fromInitializer = ClassifyDataArgument(declarator.Initializer.Value, depth + 1);
                    if (fromInitializer != DataKind.Unknown)
                    {
                        kinds.Add(fromInitializer);
                    }

                    continue;
                }

                var typeName = node switch
                {
                    VariableDeclaratorSyntax v
                        when v.Identifier.Text == name && v.Parent is VariableDeclarationSyntax d => d.Type.ToString(),
                    PropertyDeclarationSyntax prop when prop.Identifier.Text == name => prop.Type.ToString(),
                    ParameterSyntax param when param.Identifier.Text == name => param.Type?.ToString(),
                    MethodDeclarationSyntax method when method.Identifier.Text == name => UnwrapTask(
                        method.ReturnType.ToString()
                    ),
                    _ => null,
                };

                if (typeName is null)
                {
                    continue;
                }

                var kind = TypeNameKind(typeName);
                if (kind != DataKind.Unknown)
                {
                    kinds.Add(kind);
                }
            }

            return kinds;
        }

        private static string UnwrapTask(string returnType) =>
            returnType.StartsWith("Task<", StringComparison.Ordinal) && returnType.EndsWith('>')
                ? returnType[5..^1]
                : returnType;

        private static ObjectCreationExpressionSyntax NewObject(string type, ExpressionSyntax argument) =>
            SyntaxFactory
                .ObjectCreationExpression(SyntaxFactory.IdentifierName(type))
                .WithArgumentList(
                    SyntaxFactory.ArgumentList(SyntaxFactory.SingletonSeparatedList(SyntaxFactory.Argument(argument)))
                )
                .WithNewKeyword(SyntaxFactory.Token(SyntaxKind.NewKeyword).WithTrailingTrivia(SyntaxFactory.Space));

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
                // `builder.WithResourceId("x").WithSender(y);` - unlinking leaves a call, which is a
                // valid statement. A non-invocation receiver would leave a bare `builder;`, which is not,
                // so VisitExpressionStatement deletes that whole statement instead.
                ExpressionStatementSyntax => node.Expression
                    is MemberAccessExpressionSyntax { Expression: InvocationExpressionSyntax },
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

        public override SyntaxNode? VisitObjectCreationExpression(ObjectCreationExpressionSyntax node) =>
            RewriteCreation(node, base.VisitObjectCreationExpression(node));

        // A target-typed `T x = new() { .. }` is a distinct node kind, so it needs its own override or
        // the rewrites above never see it.
        public override SyntaxNode? VisitImplicitObjectCreationExpression(
            ImplicitObjectCreationExpressionSyntax node
        ) => RewriteCreation(node, base.VisitImplicitObjectCreationExpression(node));

        private SyntaxNode? RewriteCreation(BaseObjectCreationExpressionSyntax original, SyntaxNode? rewritten)
        {
            if (rewritten is not BaseObjectCreationExpressionSyntax visited)
            {
                return rewritten;
            }

            // Resolved from the ORIGINAL node: a rewritten node is detached from the declaration that
            // gives a target-typed `new()` its type.
            var typeName = CSharpSyntaxQueries.ConstructedTypeName(original);
            if (typeName is null)
            {
                return visited;
            }

            visited = RewritePayloadAuthentication(original, visited, typeName);
            return RewriteInitializer(original, visited, typeName);
        }

        /// <summary>
        /// Replaces the two superseded payload constructors: a bare token factory becomes
        /// <c>CorrespondenceAuthenticationMethod.Custom(factory)</c>, and the legacy authorisation enum
        /// becomes <c>CorrespondenceAuthenticationMethod.Default()</c>.
        /// </summary>
        private BaseObjectCreationExpressionSyntax RewritePayloadAuthentication(
            BaseObjectCreationExpressionSyntax original,
            BaseObjectCreationExpressionSyntax visited,
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
                    argument.Expression.WithoutTrivia()
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
                visited.ArgumentList.WithArguments(
                    arguments.Replace(
                        argument,
                        argument.WithExpression(replacement.WithTriviaFrom(argument.Expression))
                    )
                )
            );
        }

        /// <summary>
        /// Drops initializer assignments that v8 discarded, and renames the singular recipient property to
        /// the v9 list.
        /// </summary>
        private BaseObjectCreationExpressionSyntax RewriteInitializer(
            BaseObjectCreationExpressionSyntax original,
            BaseObjectCreationExpressionSyntax visited,
            string typeName
        )
        {
            if (visited.Initializer is null)
            {
                return visited;
            }

            _noOpProperties.TryGetValue(typeName, out var removable);
            var toRemove = new List<ExpressionSyntax>();
            AssignmentExpressionSyntax? toRename = null;

            foreach (var expression in visited.Initializer.Expressions)
            {
                if (
                    expression is not AssignmentExpressionSyntax assignment
                    || assignment.Left is not IdentifierNameSyntax member
                )
                {
                    continue;
                }

                var name = member.Identifier.Text;

                if (removable is not null && removable.Contains(name))
                {
                    Record(original, $"removed the no-op initializer `{typeName}.{name}`");
                    toRemove.Add(expression);
                }
                else if (typeName == NotificationType && name == SingularRecipientProperty)
                {
                    Record(original, $"changed `{SingularRecipientProperty}` to the `{PluralRecipientProperty}` list");
                    toRename = assignment;
                }
            }

            if (toRemove.Count == 0 && toRename is null)
            {
                return visited;
            }

            // One RemoveNodes call for every removal: removing them one at a time does not work, because
            // each edit re-parents the surviving nodes and the next lookup would be a stale reference.
            // RemoveNodes also handles the separator tokens, whose trivia carries the line breaks.
            var initializer = visited.Initializer;
            if (toRemove.Count > 0)
            {
                initializer = initializer.RemoveNodes(toRemove, SyntaxRemoveOptions.KeepNoTrivia) ?? initializer;
            }

            if (toRename is not null)
            {
                // Re-found by name, since the removals above invalidated the original reference.
                var target = initializer
                    .Expressions.OfType<AssignmentExpressionSyntax>()
                    .FirstOrDefault(a =>
                        a.Left is IdentifierNameSyntax n && n.Identifier.Text == SingularRecipientProperty
                    );

                if (target is not null)
                {
                    initializer = initializer.ReplaceNode(
                        target,
                        target
                            .WithLeft(SyntaxFactory.IdentifierName(PluralRecipientProperty).WithTriviaFrom(target.Left))
                            .WithRight(CollectionOf(target.Right))
                    );
                }
            }

            return visited.WithInitializer(initializer.Expressions.Count == 0 ? null : initializer);
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
