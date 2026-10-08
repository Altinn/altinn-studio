using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Renames app code that uses the SDK methods v9 dropped the <c>Async</c> suffix from: the options and
/// data list provider interfaces (<c>GetAppOptionsAsync</c> → <c>GetAppOptions</c>, …),
/// <c>IExternalApiClient</c>, <c>IProcessExclusiveGateway.FilterAsync</c>, <c>IAppOptionsService</c>,
/// <c>ISecretsClient</c>, <c>JsonSerializerPermissive</c>/<c>ModelDeserializer</c>, and
/// <c>LayoutEvaluator.RemoveHiddenDataAsync</c>. Only the SDK's own methods are renamed; .NET and
/// third-party methods of the same name (<c>JsonSerializer.DeserializeAsync</c>, the Azure Key Vault
/// <c>GetSecretAsync</c>, …) keep theirs.
/// </summary>
/// <remarks>
/// <p>Every rewrite is reported, the same contract as <see cref="MisspelledApiMigration"/>. With a
/// semantic model a token is renamed where it binds to an SDK method, or declares an app method that
/// implements one, so an implementation and the calls through the app's own type move together.</p>
/// <p>Without a semantic model (a resumed upgrade, or an app that does not compile against v8), the only
/// rewrite is the declaration of a method in a type that lists the SDK interface in its base list - an
/// app's <c>IAppOptionsProvider</c> or <c>IProcessExclusiveGateway</c>. Other occurrences in files that
/// reference the SDK type are listed for manual review: a name alone cannot tell an SDK call from a
/// library call, and a missed SDK call fails to compile against v9, which is loud enough.</p>
/// <p><c>LayoutEvaluator</c> also lost its obsolete two-parameter overloads, one of which was a blocking
/// synchronous <c>RemoveHiddenData</c> that would otherwise collide with the renamed method. A renamed
/// two-argument <c>RemoveHiddenDataAsync</c> call gets the <c>evaluateRemoveWhenHidden: false</c> argument
/// the obsolete overload passed; a synchronous call cannot be awaited mechanically and is reported.</p>
/// </remarks>
internal sealed class AsyncSuffixApiMigration
{
    private const string RemoveHiddenData = "RemoveHiddenData";
    private const string RemoveHiddenDataAsync = "RemoveHiddenDataAsync";
    private const string LayoutEvaluator = "LayoutEvaluator";

    private static readonly SdkRename _secretsClientRename = new(
        "",
        Interfaces: ["ISecretsClient"],
        Types: ["SecretsClient", "SecretsLocalClient"]
    );

    /// <summary>What the removed two-parameter <c>RemoveHiddenDataAsync</c> overload passed on.</summary>
    private static readonly ArgumentSyntax _evaluateRemoveWhenHidden = SyntaxFactory
        .ParseArgumentList("(evaluateRemoveWhenHidden: false)")
        .Arguments[0];

    /// <summary>The renamed SDK methods, keyed by their v8 name.</summary>
    private static readonly Dictionary<string, SdkRename> _renames = new(StringComparer.Ordinal)
    {
        ["DeserializeAsync"] = new("Deserialize", Types: ["JsonSerializerPermissive", "ModelDeserializer"]),
        ["FilterAsync"] = new("Filter", Interfaces: ["IProcessExclusiveGateway"]),
        ["GetAppOptionsAsync"] = new(
            "GetAppOptions",
            Interfaces: ["IAppOptionsProvider", "IAltinn3LibraryCodeListService"]
        ),
        ["GetCachedCodeListResponseAsync"] = new(
            "GetCachedCodeListResponse",
            Interfaces: ["IAltinn3LibraryCodeListService"]
        ),
        ["GetCertificateAsync"] = _secretsClientRename with { NewName = "GetCertificate" },
        ["GetDataListAsync"] = new("GetDataList", Interfaces: ["IDataListProvider", "IDataListsService"]),
        ["GetExternalApiDataAsync"] = new("GetExternalApiData", Interfaces: ["IExternalApiClient"]),
        ["GetInstanceAppOptionsAsync"] = new("GetInstanceAppOptions", Interfaces: ["IInstanceAppOptionsProvider"]),
        ["GetInstanceDataListAsync"] = new("GetInstanceDataList", Interfaces: ["IInstanceDataListProvider"]),
        ["GetKeyAsync"] = _secretsClientRename with { NewName = "GetKey" },
        ["GetOptionsAsync"] = new("GetOptions", Interfaces: ["IAppOptionsService"]),
        ["GetSecretAsync"] = _secretsClientRename with { NewName = "GetSecret" },
        ["ReadOptionsFromFileAsync"] = new("ReadOptionsFromFile", Interfaces: ["IAppOptionsFileHandler"]),
        [RemoveHiddenDataAsync] = new(RemoveHiddenData, Types: [LayoutEvaluator]),
    };

    private readonly CSharpSourceScanner _scanner;

    public AsyncSuffixApiMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var changes = new List<string>();
        var unverified = new List<string>();
        var syncRemoveHiddenData = new List<string>();

        // Every file is rewritten against the same compilation before any is written back: an Update
        // re-roots the compilation, after which a call in a later file to an app method this step has
        // already renamed would no longer bind, and would be left behind without a word.
        var rewrites = new List<(ScannedCSharpFile File, CompilationUnitSyntax Root)>();
        foreach (var file in _scanner.Files)
        {
            var rewriter = new Rewriter(file);
            var updated = rewriter.Visit(file.Root);
            unverified.AddRange(rewriter.Unverified);
            syncRemoveHiddenData.AddRange(rewriter.SyncRemoveHiddenData);
            if (rewriter.Changes.Count == 0)
            {
                continue;
            }

            rewrites.Add((file, (CompilationUnitSyntax)updated));
            changes.AddRange(rewriter.Changes);
        }

        foreach (var (file, root) in rewrites)
        {
            _scanner.Update(file, root);
        }

        var messages = new List<UpgradeMessage>();
        if (changes.Count > 0)
        {
            messages.Warn("Removed the Async suffix from SDK method names that v9 renamed. Rewrites:");
            messages.WarnRange(changes);
        }

        if (unverified.Count > 0)
        {
            messages.Warn(
                "These occurrences could not be verified without a compilation - if one calls the SDK, drop "
                    + "the Async suffix by hand (for example GetSecretAsync -> GetSecret); if it is the app's "
                    + "own, a .NET or a third-party method, leave it alone:"
            );
            messages.WarnRange(unverified);
        }

        foreach (var location in syncRemoveHiddenData)
        {
            messages.Todo(
                $"{location}: the synchronous LayoutEvaluator.RemoveHiddenData(state, rowRemovalOption) was "
                    + "removed - await LayoutEvaluator.RemoveHiddenData(state, rowRemovalOption, "
                    + "evaluateRemoveWhenHidden: false) instead"
            );
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// A renamed SDK method. <paramref name="Interfaces"/> are the SDK interfaces declaring it, whose app
    /// implementations are renamed without a semantic model; together with <paramref name="Types"/>, the SDK
    /// classes declaring it, they mark a file worth listing for review.
    /// </summary>
    private sealed record SdkRename(string NewName, string[]? Interfaces = null, string[]? Types = null)
    {
        public IEnumerable<string> DeclaringTypes => [.. Interfaces ?? [], .. Types ?? []];
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;
        private readonly SemanticModel? _semanticModel;
        private readonly HashSet<string> _referencedNames;
        private readonly bool _importsLayoutEvaluatorStatically;

        public Rewriter(ScannedCSharpFile file)
        {
            _file = file;
            _semanticModel = file.SemanticModel;
            _referencedNames = ReferencedNames(file.Root);
            _importsLayoutEvaluatorStatically = file
                .Root.DescendantNodes()
                .OfType<UsingDirectiveSyntax>()
                .Any(directive =>
                    directive.StaticKeyword.IsKind(SyntaxKind.StaticKeyword)
                    && directive.Name is { } name
                    && TrailingName(name) == LayoutEvaluator
                );
        }

        public List<string> Changes { get; } = [];

        /// <summary>Occurrences that could not be classified for lack of a semantic model.</summary>
        public List<string> Unverified { get; } = [];

        /// <summary>Calls to the removed synchronous <c>LayoutEvaluator.RemoveHiddenData</c> overload.</summary>
        public List<string> SyncRemoveHiddenData { get; } = [];

        public override SyntaxNode? VisitInvocationExpression(InvocationExpressionSyntax node)
        {
            var invokedName = CSharpSemanticQueries.InvokedName(node)?.Identifier.ValueText;
            if (invokedName == RemoveHiddenData && IsTwoArgumentLayoutEvaluatorCall(node))
            {
                SyncRemoveHiddenData.Add($"{_file.RelativePath}:{_file.GetLine(node)}");
            }

            if (base.VisitInvocationExpression(node) is not InvocationExpressionSyntax visited)
            {
                return node;
            }

            var renamed =
                invokedName == RemoveHiddenDataAsync
                && CSharpSemanticQueries.InvokedName(visited)?.Identifier.ValueText == RemoveHiddenData;
            if (!renamed || node.ArgumentList.Arguments.Count != 2)
            {
                return visited;
            }

            Changes.Add(
                $"{_file.RelativePath}:{_file.GetLine(node)}: added evaluateRemoveWhenHidden: false to {RemoveHiddenData}"
            );
            return visited.WithArgumentList(
                visited.ArgumentList.WithArguments(
                    AppendLikeLast(visited.ArgumentList.Arguments, _evaluateRemoveWhenHidden)
                )
            );
        }

        public override SyntaxToken VisitToken(SyntaxToken token)
        {
            if (!token.IsKind(SyntaxKind.IdentifierToken) || token.Parent is not { } parent)
            {
                return token;
            }

            if (!_renames.TryGetValue(token.ValueText, out var rename))
            {
                return token;
            }

            if (_semanticModel is not null)
            {
                return CSharpSemanticQueries.NamesSdkMember(_semanticModel, token, parent)
                    ? Rename(token, parent, rename.NewName)
                    : token;
            }

            if (parent is MethodDeclarationSyntax method && ImplementsSdkInterface(method, rename))
            {
                return Rename(token, parent, rename.NewName);
            }

            if (rename.DeclaringTypes.Any(_referencedNames.Contains))
            {
                Unverified.Add(
                    $"{_file.RelativePath}:{_file.GetLine(parent)}: {token.ValueText}{UnverifiedHint(token, parent)}"
                );
            }

            return token;
        }

        private SyntaxToken Rename(SyntaxToken token, SyntaxNode parent, string replacement)
        {
            Changes.Add($"{_file.RelativePath}:{_file.GetLine(parent)}: {token.ValueText} -> {replacement}");
            return SyntaxFactory.Identifier(replacement).WithTriviaFrom(token);
        }

        private bool IsTwoArgumentLayoutEvaluatorCall(InvocationExpressionSyntax node)
        {
            if (node.ArgumentList.Arguments.Count != 2)
            {
                return false;
            }

            if (_semanticModel is not null)
            {
                var symbol = _semanticModel.GetSymbolInfo(node).Symbol;
                return CSharpSemanticQueries.IsAltinnAppSymbol(symbol)
                    && symbol?.ContainingType.Name == LayoutEvaluator;
            }

            return node.Expression switch
            {
                MemberAccessExpressionSyntax { Expression: var receiver } => receiver.ToString().Split('.')[^1]
                    == LayoutEvaluator,
                // `using static ...LayoutEvaluator;` makes an unqualified call the SDK's unless the app
                // declares a method of the same name, which then takes precedence.
                IdentifierNameSyntax => _importsLayoutEvaluatorStatically && !DeclaresMethod(node, RemoveHiddenData),
                _ => false,
            };
        }

        /// <summary>
        /// Appends <paramref name="argument"/> laid out like the existing last one: same separator, and the
        /// last argument's trivia, so a one-line call stays on one line and a one-argument-per-line call keeps
        /// that shape.
        /// </summary>
        private static SeparatedSyntaxList<ArgumentSyntax> AppendLikeLast(
            SeparatedSyntaxList<ArgumentSyntax> arguments,
            ArgumentSyntax argument
        )
        {
            var last = arguments[^1];
            var separator =
                arguments.SeparatorCount > 0
                    ? arguments.GetSeparator(arguments.SeparatorCount - 1)
                    : SyntaxFactory.Token(SyntaxKind.CommaToken).WithTrailingTrivia(SyntaxFactory.Space);
            return SyntaxFactory.SeparatedList<ArgumentSyntax>(
                arguments
                    .Replace(last, last.WithoutTrailingTrivia())
                    .GetWithSeparators()
                    .Add(separator)
                    .Add(
                        argument.WithLeadingTrivia(last.GetLeadingTrivia()).WithTrailingTrivia(last.GetTrailingTrivia())
                    )
            );
        }

        /// <summary>
        /// Extra advice for an occurrence where dropping the suffix alone would not compile: v9 has no
        /// two-parameter <c>RemoveHiddenData</c>.
        /// </summary>
        private static string UnverifiedHint(SyntaxToken token, SyntaxNode parent) =>
            token.ValueText == RemoveHiddenDataAsync
            && parent.FirstAncestorOrSelf<InvocationExpressionSyntax>() is { } invocation
            && CSharpSemanticQueries.InvokedName(invocation) == parent
            && invocation.ArgumentList.Arguments.Count == 2
                ? " (also pass evaluateRemoveWhenHidden: false)"
                : "";

        private static bool DeclaresMethod(SyntaxNode node, string name) =>
            node.FirstAncestorOrSelf<TypeDeclarationSyntax>() is { } type
            && type.Members.OfType<MethodDeclarationSyntax>().Any(method => method.Identifier.ValueText == name);

        private static bool ImplementsSdkInterface(MethodDeclarationSyntax method, SdkRename rename) =>
            method.Parent is TypeDeclarationSyntax { BaseList: { } baseList }
            && baseList.Types.Any(baseType => (rename.Interfaces ?? []).Contains(TrailingName(baseType.Type)));

        /// <summary>
        /// The names a file references: enough to tell whether it could be using an SDK member at all.
        /// </summary>
        private static HashSet<string> ReferencedNames(CompilationUnitSyntax root)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            foreach (var node in root.DescendantNodes())
            {
                if (node is IdentifierNameSyntax identifier)
                {
                    names.Add(identifier.Identifier.ValueText);
                }
            }

            return names;
        }

        private static string TrailingName(TypeSyntax type) =>
            type switch
            {
                QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
                AliasQualifiedNameSyntax aliased => aliased.Name.Identifier.ValueText,
                SimpleNameSyntax simple => simple.Identifier.ValueText,
                _ => type.ToString(),
            };
    }
}
