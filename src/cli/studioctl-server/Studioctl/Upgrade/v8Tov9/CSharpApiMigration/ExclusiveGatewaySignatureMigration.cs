using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the three-parameter <c>IProcessExclusiveGateway.FilterAsync</c> that v9 removes. In v8 the
/// interface had two members: the obsolete <c>FilterAsync(outgoingFlows, instance, processGatewayInformation)</c>
/// every app had to implement, and the four-parameter one with an <c>IInstanceDataAccessor</c>, whose default
/// implementation called the first. v9 keeps only the four-parameter method, without a default, so an app that
/// implemented the three-parameter one alone no longer satisfies the interface (CS0535), and an explicit
/// implementation of it no longer compiles (CS0539).
/// </summary>
/// <remarks>
/// <p>An app whose only implementation is the three-parameter method gets the <c>dataAccessor</c> parameter
/// inserted, which is mechanical and gets the app compiling, with a warning suggesting the accessor over
/// <c>IDataClient</c>. An app that also implements the four-parameter method has a dead three-parameter one: an
/// explicit implementation, or one nothing in the app calls, is deleted, and one the app still calls stays as the
/// app's own method. Calls to a method whose signature changed are reported.</p>
/// <p>Runs before <see cref="AsyncSuffixApiMigration"/>, which then drops the <c>Async</c> suffix: with a
/// compilation, the rewritten method still implements the v8 four-parameter member, so the rename finds it.</p>
/// <p>With a semantic model the implementations are resolved exactly, through
/// <see cref="INamedTypeSymbol.FindImplementationForInterfaceMember"/>, so an implementation inherited from an
/// app base class is migrated once, and only calls that bind to the method count as its callers. Without one, a
/// type is an implementation when its own base list names the interface, a method matches by name and parameter
/// types, and any three-argument <c>FilterAsync</c> call in the app counts as a caller. A same-named interface
/// declared in the app makes that ambiguous, so such matches are reported instead of rewritten. A method that can
/// be overridden is reported too: its override family has to change together, and is not worth finding for a
/// member almost no app overrides.</p>
/// </remarks>
internal sealed class ExclusiveGatewaySignatureMigration
{
    private const string InterfaceNamespace = "Altinn.App.Core.Features";
    private const string InterfaceName = "IProcessExclusiveGateway";
    private const string ParameterTypeName = "IInstanceDataAccessor";
    private const string FullParameterTypeName = "Altinn.App.Core.Features." + ParameterTypeName;
    private const string ParameterName = "dataAccessor";
    private const int ParameterIndex = 2;

    /// <summary>The v8 name, and the v9 name for an app that was renamed by hand before this step existed.</summary>
    private static readonly HashSet<string> _methodNames = new(StringComparer.Ordinal) { "FilterAsync", "Filter" };

    private static readonly string[] _legacyParameterTypes = ["List", "Instance", "ProcessGatewayInformation"];
    private static readonly string[] _currentParameterTypes =
    [
        "List",
        "Instance",
        ParameterTypeName,
        "ProcessGatewayInformation",
    ];

    private enum Change
    {
        AddParameter,
        Remove,
    }

    private sealed record Rewrite(ScannedCSharpFile File, MethodDeclarationSyntax Method, Change Change);

    private readonly CSharpSourceScanner _scanner;

    public ExclusiveGatewaySignatureMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var messages = new List<UpgradeMessage>();
        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        var files = _scanner.Files.ToArray();

        // Detect everything before rewriting anything: an update refreshes the semantic models, and symbols
        // bound before the refresh do not compare equal to symbols bound after it.
        var rewrites = FindSemanticRewrites(files, messages, cancellationToken);
        var syntaxFiles = files.Where(static file => file.SemanticModel is null).ToArray();
        if (syntaxFiles.Length > 0)
        {
            var appDeclaresInterface = files
                .SelectMany(static file => file.Root.DescendantNodes().OfType<InterfaceDeclarationSyntax>())
                .Any(static declaration => declaration.Identifier.ValueText == InterfaceName);
            var threeArgumentCalls = files
                .SelectMany(file =>
                    file.Root.DescendantNodes()
                        .OfType<InvocationExpressionSyntax>()
                        .Where(static invocation =>
                            invocation.ArgumentList.Arguments.Count == _legacyParameterTypes.Length
                            && CSharpSemanticQueries.InvokedName(invocation) is { } name
                            && _methodNames.Contains(name.Identifier.ValueText)
                        )
                        .Select(invocation => $"{file.RelativePath}:{file.GetLine(invocation)}")
                )
                .ToList();
            foreach (var file in syntaxFiles)
            {
                cancellationToken.ThrowIfCancellationRequested();
                rewrites.AddRange(FindSyntacticRewrites(file, appDeclaresInterface, threeArgumentCalls, messages));
            }
        }

        foreach (var fileRewrites in rewrites.GroupBy(static rewrite => rewrite.File))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var file = fileRewrites.Key;
            var additions = fileRewrites.Where(static rewrite => rewrite.Change == Change.AddParameter).ToList();
            var removals = fileRewrites.Where(static rewrite => rewrite.Change == Change.Remove).ToList();
            var root = file.Root.TrackNodes(fileRewrites.Select(static rewrite => rewrite.Method));
            root = root.ReplaceNodes(
                root.GetCurrentNodes(additions.Select(static rewrite => rewrite.Method)),
                static (_, rewritten) => InsertDataAccessorParameter(rewritten)
            );
            root =
                root.RemoveNodes(
                    root.GetCurrentNodes(removals.Select(static rewrite => rewrite.Method)),
                    SyntaxRemoveOptions.KeepNoTrivia
                ) ?? root;
            _scanner.Update(file, root);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The implementations of the three-parameter member in files that carry a semantic model, resolved through
    /// the compilation, with every call in the app that binds to one of them.
    /// </summary>
    private static List<Rewrite> FindSemanticRewrites(
        ScannedCSharpFile[] files,
        List<UpgradeMessage> messages,
        CancellationToken cancellationToken
    )
    {
        var filesByTree = files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        var rewrites = new List<Rewrite>();
        var callers = FindCallers(files, cancellationToken);
        foreach (
            var (member, calls) in callers.Where(static pair =>
                pair.Key.ContainingType is { } contract && IsSdkGateway(contract)
            )
        )
        {
            foreach (var call in calls)
            {
                messages.Todo(
                    $"{call}: calls the removed three-parameter {InterfaceName}.{member.Name}; call the one with the "
                        + $"'{ParameterTypeName} {ParameterName}' parameter instead."
                );
            }
        }

        var handledTypes = new HashSet<INamedTypeSymbol>(SymbolEqualityComparer.Default);
        var handledMethods = new HashSet<IMethodSymbol>(SymbolEqualityComparer.Default);

        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (file.SemanticModel is not { } semanticModel)
            {
                continue;
            }

            foreach (var declaration in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (
                    semanticModel.GetDeclaredSymbol(declaration, cancellationToken) is not { } type
                    || !handledTypes.Add(type)
                    || type.AllInterfaces.FirstOrDefault(IsSdkGateway) is not { } contract
                )
                {
                    continue;
                }

                var legacyMember = FilterMember(contract, _legacyParameterTypes.Length);
                var currentMember = FilterMember(contract, _currentParameterTypes.Length);
                if (
                    legacyMember is null
                    || type.FindImplementationForInterfaceMember(legacyMember) is not IMethodSymbol legacy
                    || !handledMethods.Add(legacy.OriginalDefinition)
                )
                {
                    continue;
                }

                var hasCurrent =
                    currentMember is not null
                    && type.FindImplementationForInterfaceMember(currentMember) is IMethodSymbol current
                    && current.ContainingType.TypeKind != TypeKind.Interface;
                var calls = callers.GetValueOrDefault(legacy.OriginalDefinition) ?? [];

                if (Locate(legacy, filesByTree) is not { } found)
                {
                    messages.Todo(
                        $"{type.Name} implements the three-parameter {InterfaceName}.{legacy.Name} through "
                            + $"{legacy.ContainingType.Name}.{legacy.Name}, which is outside the app's source. v9 has no "
                            + $"such member: the app needs its own {legacy.Name} with the '{ParameterTypeName} "
                            + $"{ParameterName}' parameter."
                    );
                    continue;
                }

                var (declaringFile, method) = found;
                var location = Location(declaringFile, method);
                if (hasCurrent)
                {
                    rewrites.AddRange(RetireLegacy(declaringFile, method, location, calls, messages));
                }
                else if (CanTakeParameter(method, location, messages))
                {
                    rewrites.Add(new Rewrite(declaringFile, method, Change.AddParameter));
                    messages.Warn(AddedParameter(location));
                    ReportCallers(calls, method, messages);
                }
            }
        }

        return rewrites;
    }

    /// <summary>
    /// The calls that bind to each three-parameter method, keyed by the method. A <c>nameof</c> counts: it breaks
    /// with the method.
    /// </summary>
    private static Dictionary<IMethodSymbol, List<string>> FindCallers(
        IEnumerable<ScannedCSharpFile> files,
        CancellationToken cancellationToken
    )
    {
        var callers = new Dictionary<IMethodSymbol, List<string>>(SymbolEqualityComparer.Default);
        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (file.SemanticModel is not { } semanticModel)
            {
                continue;
            }

            var names = file
                .Root.DescendantNodes()
                .OfType<SimpleNameSyntax>()
                .Where(static name => _methodNames.Contains(name.Identifier.ValueText));
            foreach (var name in names)
            {
                var info = semanticModel.GetSymbolInfo(name, cancellationToken);
                var symbol = info.Symbol ?? info.CandidateSymbols.FirstOrDefault();
                if (
                    symbol is IMethodSymbol { Parameters.Length: 3 } method
                    && !callers.TryAdd(method.OriginalDefinition, [Location(file, name)])
                )
                {
                    callers[method.OriginalDefinition].Add(Location(file, name));
                }
            }
        }

        return callers;
    }

    /// <summary>
    /// The syntax fallback for a file without a semantic model: the three-parameter method, by name and parameter
    /// types, on types whose own base list names the interface, or explicit implementations naming it.
    /// </summary>
    private static IEnumerable<Rewrite> FindSyntacticRewrites(
        ScannedCSharpFile file,
        bool appDeclaresInterface,
        IReadOnlyList<string> threeArgumentCalls,
        List<UpgradeMessage> messages
    )
    {
        foreach (var type in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            var listsInterface = (type.BaseList?.Types ?? default).Any(static baseType =>
                SimpleName(baseType.Type) == InterfaceName
            );
            var methods = type.Members.OfType<MethodDeclarationSyntax>().Where(IsFilterMethod).ToList();
            var hasCurrent = methods.Any(static method => HasParameterTypes(method, _currentParameterTypes));
            var legacies = methods.Where(method =>
                HasParameterTypes(method, _legacyParameterTypes)
                && (listsInterface || SimpleName(method.ExplicitInterfaceSpecifier?.Name) == InterfaceName)
            );
            foreach (var method in legacies)
            {
                var location = Location(file, method);
                if (appDeclaresInterface)
                {
                    messages.Todo(
                        $"{location} may implement the v9 {InterfaceName} or the app's own interface of that name, "
                            + "which cannot be told apart without a compilation of the app. If it implements the "
                            + $"Altinn one, add the '{ParameterTypeName} {ParameterName}' parameter by hand."
                    );
                    continue;
                }

                if (hasCurrent)
                {
                    foreach (var rewrite in RetireLegacy(file, method, location, threeArgumentCalls, messages))
                    {
                        yield return rewrite;
                    }
                }
                else if (CanTakeParameter(method, location, messages))
                {
                    yield return new Rewrite(file, method, Change.AddParameter);
                    messages.Warn(AddedParameter(location));
                    ReportCallers(threeArgumentCalls, method, messages);
                }
            }
        }
    }

    /// <summary>
    /// What becomes of a three-parameter method beside a four-parameter one: v9 never calls it. An explicit
    /// implementation cannot stay, and an implicit one is only worth keeping while the app calls it.
    /// </summary>
    private static IEnumerable<Rewrite> RetireLegacy(
        ScannedCSharpFile file,
        MethodDeclarationSyntax method,
        string location,
        IReadOnlyList<string> calls,
        List<UpgradeMessage> messages
    )
    {
        if (method.ExplicitInterfaceSpecifier is null && calls.Count > 0)
        {
            messages.Warn(
                $"{location} is no longer part of {InterfaceName}; the app libraries call the one with the "
                    + $"'{ParameterTypeName} {ParameterName}' parameter. It stays as the app's own method, since the app "
                    + $"calls it at {string.Join(", ", calls)}."
            );
            yield break;
        }

        yield return new Rewrite(file, method, Change.Remove);
        messages.Warn(
            $"{location}: removed. v9 {InterfaceName} has no three-parameter {method.Identifier.ValueText}; the "
                + $"app libraries call the one with the '{ParameterTypeName} {ParameterName}' parameter."
        );
        foreach (var call in calls)
        {
            messages.Todo(
                $"{call}: calls the removed three-parameter {InterfaceName}.{method.Identifier.ValueText}; call the "
                    + $"one with the '{ParameterTypeName} {ParameterName}' parameter instead."
            );
        }
    }

    /// <summary>Whether the parameter can be inserted mechanically; reports the shapes where it cannot.</summary>
    private static bool CanTakeParameter(MethodDeclarationSyntax method, string location, List<UpgradeMessage> messages)
    {
        if (
            method.Modifiers.Any(SyntaxKind.VirtualKeyword)
            || method.Modifiers.Any(SyntaxKind.AbstractKeyword)
            || method.Modifiers.Any(SyntaxKind.OverrideKeyword)
        )
        {
            messages.Todo(
                $"{location} is part of an override family; add the '{ParameterTypeName} {ParameterName}' parameter "
                    + $"the v9 {InterfaceName} requires to every declaration in it by hand."
            );
            return false;
        }

        if (method.Modifiers.Any(SyntaxKind.PartialKeyword))
        {
            messages.Todo(
                $"{location} is a partial method; add the '{ParameterTypeName} {ParameterName}' parameter the v9 "
                    + $"{InterfaceName} requires to both of its declarations by hand."
            );
            return false;
        }

        if (UsesIdentifier(method, ParameterName))
        {
            messages.Todo(
                $"{location} already uses the name '{ParameterName}', so the '{ParameterTypeName} {ParameterName}' "
                    + $"parameter the v9 {InterfaceName} requires was not added. Add it by hand, renaming the existing "
                    + "symbol or choosing another parameter name."
            );
            return false;
        }

        return true;
    }

    private static string AddedParameter(string location) =>
        $"{location}: added the '{ParameterName}' parameter the v9 {InterfaceName} requires. Read instance data "
        + "through it instead of IDataClient.";

    private static void ReportCallers(
        IReadOnlyList<string> calls,
        MethodDeclarationSyntax method,
        List<UpgradeMessage> messages
    )
    {
        foreach (var call in calls)
        {
            messages.Todo(
                $"{call}: calls {MemberName(method)} with three arguments; pass an {ParameterTypeName} as the third."
            );
        }
    }

    private static bool IsSdkGateway(INamedTypeSymbol contract) =>
        contract.Name == InterfaceName
        && contract.ContainingNamespace.ToDisplayString() == InterfaceNamespace
        && CSharpSemanticQueries.IsAltinnAppSymbol(contract);

    private static IMethodSymbol? FilterMember(INamedTypeSymbol contract, int parameterCount) =>
        contract
            .GetMembers()
            .OfType<IMethodSymbol>()
            .FirstOrDefault(member => _methodNames.Contains(member.Name) && member.Parameters.Length == parameterCount);

    private static bool IsFilterMethod(MethodDeclarationSyntax method) =>
        _methodNames.Contains(method.Identifier.ValueText);

    /// <summary>The declaration of <paramref name="method"/> in the scanned files, or <c>null</c> when it has none there.</summary>
    private static (ScannedCSharpFile File, MethodDeclarationSyntax Method)? Locate(
        IMethodSymbol method,
        IReadOnlyDictionary<SyntaxTree, ScannedCSharpFile> filesByTree
    )
    {
        foreach (var reference in method.DeclaringSyntaxReferences)
        {
            if (
                filesByTree.TryGetValue(reference.SyntaxTree, out var file)
                && file.Root.FindNode(reference.Span) is MethodDeclarationSyntax declaration
            )
            {
                return (file, declaration);
            }
        }

        return null;
    }

    private static string Location(ScannedCSharpFile file, MethodDeclarationSyntax method) =>
        $"{Location(file, (SyntaxNode)method)}: {MemberName(method)}";

    private static string Location(ScannedCSharpFile file, SyntaxNode node) =>
        $"{file.RelativePath}:{file.GetLine(node)}";

    private static string MemberName(MethodDeclarationSyntax method) =>
        method.Parent is TypeDeclarationSyntax type
            ? $"{type.Identifier.Text}.{method.Identifier.Text}"
            : method.Identifier.Text;

    /// <summary>Whether the method's parameters have exactly the given simple type names, in order.</summary>
    private static bool HasParameterTypes(MethodDeclarationSyntax method, string[] typeNames)
    {
        var parameters = method.ParameterList.Parameters;
        return parameters.Count == typeNames.Length
            && parameters.Zip(typeNames).All(pair => SimpleName(pair.First.Type) == pair.Second);
    }

    /// <summary>Whether the identifier occurs anywhere in the method: a parameter, local, lambda parameter, or a use of an outer member.</summary>
    private static bool UsesIdentifier(MethodDeclarationSyntax method, string identifier) =>
        method
            .DescendantTokens()
            .Any(token => token.IsKind(SyntaxKind.IdentifierToken) && token.ValueText == identifier);

    /// <summary>
    /// Inserts the parameter before the third one, laid out like its neighbors: the new parameter takes the third
    /// one's indentation and is followed by a comma that ends the line the way the second parameter's does, or by
    /// a space, so a one-per-line list stays one-per-line and a single-line list stays on its line. A comment after
    /// the second parameter stays there. The type is emitted as an annotated qualified reference for the final pass
    /// against the upgraded project to simplify.
    /// </summary>
    private static MethodDeclarationSyntax InsertDataAccessorParameter(MethodDeclarationSyntax method)
    {
        var parameters = method.ParameterList.Parameters;
        var next = parameters[ParameterIndex];
        var separator = parameters.GetSeparator(ParameterIndex - 1);
        var lineBreak = separator.TrailingTrivia.LastOrDefault(static trivia =>
            trivia.IsKind(SyntaxKind.EndOfLineTrivia)
        );
        var comma = SyntaxFactory
            .Token(SyntaxKind.CommaToken)
            .WithTrailingTrivia(lineBreak == default ? SyntaxFactory.Space : lineBreak);
        var parameter = SyntaxFactory
            .Parameter(SyntaxFactory.Identifier(ParameterName))
            .WithType(
                GeneratedTypeReferenceFinalizer.Reference(FullParameterTypeName).WithTrailingTrivia(SyntaxFactory.Space)
            )
            .WithLeadingTrivia(next.GetLeadingTrivia());

        var nodesAndTokens = parameters.GetWithSeparators();
        var index = nodesAndTokens.IndexOf(next);
        nodesAndTokens = nodesAndTokens.Insert(index, parameter).Insert(index + 1, comma);
        return method.WithParameterList(
            method.ParameterList.WithParameters(SyntaxFactory.SeparatedList<ParameterSyntax>(nodesAndTokens))
        );
    }

    /// <summary>The simple name of a written type: the identifier of a generic or qualified name, without a nullable annotation.</summary>
    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            NullableTypeSyntax nullable => SimpleName(nullable.ElementType),
            _ => null,
        };
}
