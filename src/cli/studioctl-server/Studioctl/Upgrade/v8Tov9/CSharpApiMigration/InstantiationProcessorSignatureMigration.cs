using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the <c>IInstantiationProcessor.DataCreation(Instance instance, object data, prefill)</c> that
/// v9 removes. In v8 every app implemented that member, and the libraries' later
/// <c>DataCreation(IInstanceDataMutator instanceDataMutator, object data, prefill)</c> had a default implementation
/// that called it. v9 keeps only the mutator member, without a default, so an app that implemented the
/// <c>Instance</c> one alone no longer satisfies the interface (CS0535), and an explicit implementation of it no
/// longer compiles (CS0539).
/// </summary>
/// <remarks>
/// <p>An app whose only implementation is the <c>Instance</c> method gets its first parameter changed to the
/// mutator, and the body reads the instance from it into a local of the parameter's old name, so the body is left
/// as it was. The local is left out when the body never used the instance. A warning suggests adding data elements
/// through the mutator, since v9 rejects writes through <c>IDataClient</c> while the process moves into a task,
/// which is when <c>DataCreation</c> runs; a method that makes such writes gets a to-do instead. An app that also
/// implements the mutator method has a dead <c>Instance</c> one: an explicit implementation, or one nothing in the
/// app calls, is deleted, and one the app still calls stays as the app's own method, with a to-do when it writes
/// through <c>IDataClient</c>. Calls to a method whose signature changed are reported. An <c>Instance</c> method that
/// an app base class gives several processors is changed or deleted only when they all agree; otherwise it is
/// reported.</p>
/// <p>Released v8 libraries have only the <c>Instance</c> member, so a mutator method beside it is found among the
/// type's own methods as well as through the interface.</p>
/// <p>With a semantic model the implementations are resolved exactly, through
/// <see cref="INamedTypeSymbol.FindImplementationForInterfaceMember"/>, so an implementation inherited from an
/// app base class is migrated once, and only calls that bind to the method count as its callers. Without one, a
/// type is an implementation when its own base list names the interface, a method matches by name and parameter
/// types, and any three-argument <c>DataCreation</c> call in the app counts as a caller, unless it passes a
/// parameter declared as the mutator first, without naming arguments. A type that names the interface but declares
/// no <c>DataCreation</c>, and whose base classes in the app do not declare the mutator one, is reported, since what
/// it inherits cannot be resolved. A same-named interface declared in the app makes that ambiguous, so such
/// matches are reported instead of rewritten. A method that can be overridden is reported too: its override family
/// has to change together, and is not worth finding for a member almost no app overrides.</p>
/// </remarks>
internal sealed class InstantiationProcessorSignatureMigration
{
    private const string InterfaceNamespace = "Altinn.App.Core.Features";
    private const string InterfaceName = "IInstantiationProcessor";
    private const string MethodName = "DataCreation";
    private const string LegacyParameterTypeName = "Instance";
    private const string ParameterTypeName = "IInstanceDataMutator";
    private const string FullParameterTypeName = InterfaceNamespace + "." + ParameterTypeName;
    private const int ParameterCount = 3;

    /// <summary>The names the new parameter can take, in order of preference; the first the method does not use wins.</summary>
    private static readonly string[] _parameterNames = ["instanceDataMutator", "dataMutator", "mutator"];

    /// <summary>The v8 <c>IDataClient</c> and <c>IDataService</c> methods that write instance data.</summary>
    private static readonly HashSet<string> _dataClientWrites = new(StringComparer.Ordinal)
    {
        "InsertFormData",
        "InsertBinaryData",
        "UpdateData",
        "UpdateBinaryData",
        "DeleteData",
        "InsertJsonObject",
        "UpdateJsonObject",
        "DeleteJsonObject",
    };

    private static readonly HashSet<string> _dataClientTypes = new(StringComparer.Ordinal)
    {
        "IDataClient",
        "IDataService",
    };

    private enum Change
    {
        ChangeParameter,
        Remove,
    }

    private sealed record Rewrite(ScannedCSharpFile File, MethodDeclarationSyntax Method, Change Change);

    private readonly CSharpSourceScanner _scanner;

    public InstantiationProcessorSignatureMigration(CSharpSourceScanner scanner)
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
            var possibleCalls = files
                .SelectMany(file =>
                    file.Root.DescendantNodes()
                        .OfType<InvocationExpressionSyntax>()
                        .Where(MayCallLegacy)
                        .Select(invocation => Location(file, invocation))
                )
                .ToList();
            var typesByName = files
                .SelectMany(static file => file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
                .ToLookup(static type => type.Identifier.ValueText, StringComparer.Ordinal);
            foreach (var file in syntaxFiles)
            {
                cancellationToken.ThrowIfCancellationRequested();
                rewrites.AddRange(
                    FindSyntacticRewrites(file, appDeclaresInterface, possibleCalls, typesByName, messages)
                );
            }
        }

        foreach (var fileRewrites in rewrites.GroupBy(static rewrite => rewrite.File))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var file = fileRewrites.Key;
            var lineBreak = LineBreak(file.Root);
            var changes = fileRewrites.Where(static rewrite => rewrite.Change == Change.ChangeParameter).ToList();
            var removals = fileRewrites.Where(static rewrite => rewrite.Change == Change.Remove).ToList();
            var root = file.Root.TrackNodes(fileRewrites.Select(static rewrite => rewrite.Method));
            root = root.ReplaceNodes(
                root.GetCurrentNodes(changes.Select(static rewrite => rewrite.Method)),
                (_, rewritten) => ChangeParameter(rewritten, lineBreak)
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
    /// The implementations of the <c>Instance</c> member in files that carry a semantic model, resolved through the
    /// compilation, with every call in the app that binds to one of them.
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
            var (_, calls) in callers.Where(static pair =>
                pair.Key.ContainingType is { } contract && IsSdkProcessor(contract)
            )
        )
        {
            foreach (var call in calls)
            {
                messages.Todo(RemovedMemberCall(call));
            }
        }

        // The processors that implement each Instance method, collected before anything is decided: processors
        // that share a method inherited from an app base class have to agree on what becomes of it.
        var handledTypes = new HashSet<INamedTypeSymbol>(SymbolEqualityComparer.Default);
        var implementers = new Dictionary<IMethodSymbol, List<(INamedTypeSymbol Type, bool HasCurrent)>>(
            SymbolEqualityComparer.Default
        );
        var legacies = new List<IMethodSymbol>();

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
                    || type.AllInterfaces.FirstOrDefault(IsSdkProcessor) is not { } contract
                )
                {
                    continue;
                }

                var legacyMember = contract.GetMembers(MethodName).OfType<IMethodSymbol>().FirstOrDefault(IsLegacy);
                if (
                    legacyMember is null
                    || type.FindImplementationForInterfaceMember(legacyMember) is not IMethodSymbol legacy
                    || legacy.ContainingType.TypeKind == TypeKind.Interface
                )
                {
                    continue;
                }

                var currentMember = contract.GetMembers(MethodName).OfType<IMethodSymbol>().FirstOrDefault(IsCurrent);
                var hasCurrent =
                    (
                        currentMember is not null
                        && type.FindImplementationForInterfaceMember(currentMember) is IMethodSymbol current
                        && current.ContainingType.TypeKind != TypeKind.Interface
                    ) || DeclaresCurrent(type);

                var key = legacy.OriginalDefinition;
                if (!implementers.TryGetValue(key, out var types))
                {
                    implementers[key] = types = [];
                    legacies.Add(key);
                }

                types.Add((type, hasCurrent));
            }
        }

        foreach (var legacy in legacies)
        {
            var types = implementers[legacy];
            var calls = callers.GetValueOrDefault(legacy) ?? [];
            if (Locate(legacy, filesByTree) is not { } found)
            {
                foreach (var (type, _) in types)
                {
                    messages.Todo(
                        $"{type.Name} implements {InterfaceName}.{MethodName}(Instance, object, Dictionary<string, "
                            + $"string>?) through {legacy.ContainingType.Name}.{legacy.Name}, which is outside the app's "
                            + $"source. v9 has no such member: the app needs its own {MethodName} with the "
                            + $"'{ParameterTypeName}' parameter."
                    );
                }

                continue;
            }

            var (declaringFile, method) = found;
            var location = Location(declaringFile, method);
            if (types.All(static entry => entry.HasCurrent))
            {
                rewrites.AddRange(RetireLegacy(declaringFile, method, location, calls, messages));
            }
            else if (types.Any(static entry => entry.HasCurrent))
            {
                // Removing the method leaves the processors without a mutator method unimplemented, and changing
                // its parameter gives the others two; which is right depends on the app.
                var without = string.Join(", ", types.Where(static e => !e.HasCurrent).Select(static e => e.Type.Name));
                var with = string.Join(", ", types.Where(static e => e.HasCurrent).Select(static e => e.Type.Name));
                messages.Todo(
                    $"{location} implements {InterfaceName} for {without}, which have no {MethodName} with the "
                        + $"'{ParameterTypeName}' parameter, and for {with}, which have one. Give {without} their own "
                        + $"{MethodName} with the '{ParameterTypeName}' parameter, then remove this method, by hand."
                );
            }
            else if (CanChangeParameter(method, location, messages))
            {
                rewrites.Add(new Rewrite(declaringFile, method, Change.ChangeParameter));
                ReportChange(declaringFile, method, location, messages);
                ReportCallers(calls, method, messages);
            }
        }

        return rewrites;
    }

    /// <summary>
    /// The calls that bind to each <c>Instance</c> method, keyed by the method. A <c>nameof</c> counts: it breaks
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
                .Where(static name => name.Identifier.ValueText == MethodName);
            foreach (var name in names)
            {
                var info = semanticModel.GetSymbolInfo(name, cancellationToken);
                var symbol = info.Symbol ?? info.CandidateSymbols.FirstOrDefault();
                if (
                    symbol is IMethodSymbol method
                    && IsLegacy(method)
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
    /// The syntax fallback for a file without a semantic model: the <c>Instance</c> method, by name and parameter
    /// types, on types whose own base list names the interface, or explicit implementations naming it.
    /// </summary>
    private static IEnumerable<Rewrite> FindSyntacticRewrites(
        ScannedCSharpFile file,
        bool appDeclaresInterface,
        IReadOnlyList<string> possibleCalls,
        ILookup<string, TypeDeclarationSyntax> typesByName,
        List<UpgradeMessage> messages
    )
    {
        foreach (var type in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            var listsInterface = (type.BaseList?.Types ?? default).Any(static baseType =>
                SimpleName(baseType.Type) == InterfaceName
            );
            var methods = type
                .Members.OfType<MethodDeclarationSyntax>()
                .Where(static method => method.Identifier.ValueText == MethodName)
                .ToList();
            var hasCurrent = methods.Any(IsCurrentImplementation);
            var legacies = methods
                .Where(method =>
                    HasFirstParameterType(method, LegacyParameterTypeName)
                    && (listsInterface || SimpleName(method.ExplicitInterfaceSpecifier?.Name) == InterfaceName)
                )
                .ToList();
            if (
                listsInterface
                && !hasCurrent
                && legacies.Count == 0
                && !appDeclaresInterface
                && !BaseClassDeclaresCurrent(type, typesByName)
            )
            {
                messages.Todo(
                    $"{Location(file, type)}: {type.Identifier.Text} implements {InterfaceName} without a "
                        + $"{MethodName} of its own, and its base classes cannot be resolved without a compilation of "
                        + $"the app. If it inherits {MethodName}(Instance, object, Dictionary<string, string>?), change "
                        + $"that method's 'Instance' parameter to an '{ParameterTypeName}' and read the instance from "
                        + "its Instance property, by hand."
                );
                continue;
            }

            foreach (var method in legacies)
            {
                var location = Location(file, method);
                if (appDeclaresInterface)
                {
                    messages.Todo(
                        $"{location} may implement the v9 {InterfaceName} or the app's own interface of that name, "
                            + "which cannot be told apart without a compilation of the app. If it implements the "
                            + $"Altinn one, change its 'Instance' parameter to an '{ParameterTypeName}' and read the "
                            + "instance from its Instance property, by hand."
                    );
                    continue;
                }

                if (hasCurrent)
                {
                    foreach (var rewrite in RetireLegacy(file, method, location, possibleCalls, messages))
                    {
                        yield return rewrite;
                    }
                }
                else if (CanChangeParameter(method, location, messages))
                {
                    yield return new Rewrite(file, method, Change.ChangeParameter);
                    ReportChange(file, method, location, messages);
                    ReportCallers(possibleCalls, method, messages);
                }
            }
        }
    }

    /// <summary>
    /// What becomes of an <c>Instance</c> method beside a mutator one: v9 never calls it. An explicit
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
            var kept =
                $"{location} is no longer part of {InterfaceName}; the app libraries call the {MethodName} with the "
                + $"'{ParameterTypeName}' parameter. It stays as the app's own method, since the app calls it at "
                + $"{string.Join(", ", calls)}.";
            var writes = DataClientWrites(file, method);
            if (writes.Count > 0)
            {
                messages.Todo(
                    $"{kept} It writes instance data through IDataClient at {string.Join(", ", writes)}, which v9 "
                        + $"rejects while the process moves into a task, when {MethodName} runs. Add and change data "
                        + $"elements through the '{ParameterTypeName}' instead."
                );
                yield break;
            }

            messages.Warn(kept);
            yield break;
        }

        yield return new Rewrite(file, method, Change.Remove);
        messages.Warn(
            $"{location}: removed. v9 {InterfaceName} has no {MethodName} with an 'Instance' parameter; the app "
                + $"libraries call the one with the '{ParameterTypeName}' parameter."
        );
        foreach (var call in calls)
        {
            messages.Todo(RemovedMemberCall(call));
        }
    }

    /// <summary>Whether the parameter can be changed mechanically; reports the shapes where it cannot.</summary>
    private static bool CanChangeParameter(
        MethodDeclarationSyntax method,
        string location,
        List<UpgradeMessage> messages
    )
    {
        if (
            method.Modifiers.Any(SyntaxKind.VirtualKeyword)
            || method.Modifiers.Any(SyntaxKind.AbstractKeyword)
            || method.Modifiers.Any(SyntaxKind.OverrideKeyword)
        )
        {
            messages.Todo(
                $"{location} is part of an override family; change its 'Instance' parameter to the "
                    + $"'{ParameterTypeName}' the v9 {InterfaceName} requires in every declaration in it by hand."
            );
            return false;
        }

        if (method.Modifiers.Any(SyntaxKind.PartialKeyword) || (method.Body is null && method.ExpressionBody is null))
        {
            messages.Todo(
                $"{location} is a partial or bodiless method; change its 'Instance' parameter to the "
                    + $"'{ParameterTypeName}' the v9 {InterfaceName} requires by hand."
            );
            return false;
        }

        // A mutator method that cannot implement the interface, such as a private one, already has the
        // signature the change would give this method.
        if (
            method.Parent is TypeDeclarationSyntax type
            && type.Members.OfType<MethodDeclarationSyntax>()
                .Any(other =>
                    other != method
                    && other.Identifier.ValueText == MethodName
                    && other.ExplicitInterfaceSpecifier is null
                    && HasFirstParameterType(other, ParameterTypeName)
                    && SameType(other.ParameterList.Parameters[1].Type, method.ParameterList.Parameters[1].Type)
                    && SameType(other.ParameterList.Parameters[2].Type, method.ParameterList.Parameters[2].Type)
                )
        )
        {
            messages.Todo(
                $"{location}: its type already has a {MethodName} with the '{ParameterTypeName}' parameter that "
                    + $"cannot implement the v9 {InterfaceName}. Move this method's code into a public one with that "
                    + "signature, and remove this method, by hand."
            );
            return false;
        }

        return true;
    }

    /// <summary>Whether two written types are the same text, ignoring whitespace and a nullable annotation.</summary>
    private static bool SameType(TypeSyntax? left, TypeSyntax? right)
    {
        static string Text(TypeSyntax? type) =>
            string.Concat(
                (type is NullableTypeSyntax nullable ? nullable.ElementType : type)
                    ?.DescendantTokens()
                    .Select(static token => token.Text)
                    ?? []
            );

        return Text(left) == Text(right);
    }

    /// <summary>
    /// A warning for the changed method, or a to-do when it writes instance data through <c>IDataClient</c>, which
    /// v9 rejects at the point <c>DataCreation</c> runs.
    /// </summary>
    private static void ReportChange(
        ScannedCSharpFile file,
        MethodDeclarationSyntax method,
        string location,
        List<UpgradeMessage> messages
    )
    {
        var parameterName = NewParameterName(method);
        var changed =
            $"{location}: changed the 'Instance {method.ParameterList.Parameters[0].Identifier.Text}' parameter to "
            + $"the '{ParameterTypeName} {parameterName}' the v9 {InterfaceName} requires.";
        var writes = DataClientWrites(file, method);
        if (writes.Count > 0)
        {
            messages.Todo(
                $"{changed} It writes instance data through IDataClient at {string.Join(", ", writes)}, which v9 "
                    + $"rejects while the process moves into a task, when {MethodName} runs. Add and change data "
                    + $"elements through '{parameterName}' instead."
            );
            return;
        }

        messages.Warn(
            $"{changed} Add data elements through it rather than IDataClient, which v9 rejects while the process "
                + $"moves into a task, when {MethodName} runs."
        );
    }

    private static void ReportCallers(
        IReadOnlyList<string> calls,
        MethodDeclarationSyntax method,
        List<UpgradeMessage> messages
    )
    {
        foreach (var call in calls)
        {
            messages.Todo($"{call}: calls {MemberName(method)} with an Instance; pass an {ParameterTypeName} instead.");
        }
    }

    private static string RemovedMemberCall(string call) =>
        $"{call}: calls the removed {InterfaceName}.{MethodName}(Instance, object, Dictionary<string, string>?); call "
        + $"the one with the '{ParameterTypeName}' parameter instead.";

    /// <summary>
    /// The calls in the method to the <c>IDataClient</c> and <c>IDataService</c> methods that write instance data.
    /// With a semantic model a call counts when it binds to one of those Altinn.App types, or does not bind at all.
    /// </summary>
    private static List<string> DataClientWrites(ScannedCSharpFile file, MethodDeclarationSyntax method)
    {
        var semanticModel = file.SemanticModel;
        return method
            .DescendantNodes()
            .OfType<InvocationExpressionSyntax>()
            .Where(invocation =>
                CSharpSemanticQueries.InvokedName(invocation) is { } name
                && _dataClientWrites.Contains(name.Identifier.ValueText)
                && (
                    semanticModel?.GetSymbolInfo(invocation).Symbol is not IMethodSymbol bound
                    || (
                        CSharpSemanticQueries.IsAltinnAppSymbol(bound.ReducedFrom ?? bound)
                        && _dataClientTypes.Contains(bound.ContainingType.Name)
                    )
                )
            )
            .Select(invocation => Location(file, invocation))
            .ToList();
    }

    private static bool IsSdkProcessor(INamedTypeSymbol contract) =>
        contract.Name == InterfaceName
        && contract.ContainingNamespace.ToDisplayString() == InterfaceNamespace
        && CSharpSemanticQueries.IsAltinnAppSymbol(contract);

    private static bool IsLegacy(IMethodSymbol method) => HasFirstParameterType(method, LegacyParameterTypeName);

    private static bool IsCurrent(IMethodSymbol method) => HasFirstParameterType(method, ParameterTypeName);

    /// <summary>
    /// Whether the method has the parameters of the v9 member, taken by value: the Altinn.App mutator,
    /// <c>object</c> and <c>Dictionary&lt;string, string&gt;</c>, and no type parameters.
    /// </summary>
    private static bool IsCurrentSignature(IMethodSymbol method) =>
        method.Parameters.Length == ParameterCount
        && method.TypeParameters.IsEmpty
        && method.Parameters.All(static parameter => parameter.RefKind == RefKind.None)
        && method.Parameters[0].Type is INamedTypeSymbol { Name: ParameterTypeName } mutator
        && mutator.ContainingNamespace.ToDisplayString() == InterfaceNamespace
        && method.Parameters[1].Type.SpecialType == SpecialType.System_Object
        && method.Parameters[2].Type
            is INamedTypeSymbol
            {
                Name: "Dictionary",
                TypeArguments: [{ SpecialType: SpecialType.System_String }, { SpecialType: SpecialType.System_String }],
            } dictionary
        && dictionary.ContainingNamespace.ToDisplayString() == "System.Collections.Generic";

    private static bool HasFirstParameterType(IMethodSymbol method, string typeName) =>
        method.Name == MethodName
        && method.Parameters.Length == ParameterCount
        && method.Parameters[0].Type.Name == typeName;

    /// <summary>Whether the method has the three parameters, the first of the given simple type name.</summary>
    private static bool HasFirstParameterType(MethodDeclarationSyntax method, string typeName)
    {
        var parameters = method.ParameterList.Parameters;
        return parameters.Count == ParameterCount && SimpleName(parameters[0].Type) == typeName;
    }

    /// <summary>
    /// Whether the declaration can implement the v9 member, as far as syntax tells: the mutator, <c>object</c> and
    /// <c>Dictionary</c> parameters, on a public instance method or an explicit implementation.
    /// </summary>
    private static bool IsCurrentImplementation(MethodDeclarationSyntax method)
    {
        var parameters = method.ParameterList.Parameters;
        return method.Identifier.ValueText == MethodName
            && HasFirstParameterType(method, ParameterTypeName)
            && (parameters[1].Type is NullableTypeSyntax nullable ? nullable.ElementType : parameters[1].Type)
                is PredefinedTypeSyntax { Keyword.RawKind: (int)SyntaxKind.ObjectKeyword }
            && SimpleName(parameters[2].Type) == "Dictionary"
            && parameters.All(static parameter => parameter.Modifiers.Count == 0)
            && method.TypeParameterList is null
            && !method.Modifiers.Any(SyntaxKind.StaticKeyword)
            && (
                SimpleName(method.ExplicitInterfaceSpecifier?.Name) == InterfaceName
                || (method.ExplicitInterfaceSpecifier is null && method.Modifiers.Any(SyntaxKind.PublicKeyword))
            );
    }

    /// <summary>
    /// Whether a base class, found by name among the app's types, declares a method that can implement the v9
    /// member. A base class that cannot be found, or is found more than once, counts as not declaring one.
    /// </summary>
    private static bool BaseClassDeclaresCurrent(
        TypeDeclarationSyntax type,
        ILookup<string, TypeDeclarationSyntax> typesByName
    )
    {
        var visited = new HashSet<TypeDeclarationSyntax>();
        for (TypeDeclarationSyntax? current = type; current is not null && visited.Add(current); )
        {
            var baseName = current.BaseList?.Types.FirstOrDefault() is { } first ? SimpleName(first.Type) : null;
            var candidates = baseName is null ? [] : typesByName[baseName].ToList();
            if (candidates.Count != 1 || candidates[0] is not ClassDeclarationSyntax baseClass)
            {
                return false;
            }

            if (baseClass.Members.OfType<MethodDeclarationSyntax>().Any(IsCurrentImplementation))
            {
                return true;
            }

            current = baseClass;
        }

        return false;
    }

    /// <summary>
    /// Whether the type or a base class declares a mutator method that can implement the v9 member: a public
    /// instance method, or an explicit implementation.
    /// </summary>
    private static bool DeclaresCurrent(INamedTypeSymbol type)
    {
        for (INamedTypeSymbol? current = type; current is not null; current = current.BaseType)
        {
            if (
                current
                    .GetMembers()
                    .OfType<IMethodSymbol>()
                    .Any(static method =>
                        IsCurrentSignature(method)
                        && !method.IsStatic
                        && (
                            method.ExplicitInterfaceImplementations.Any(static member =>
                                member.Name == MethodName && IsSdkProcessor(member.ContainingType)
                            ) || (method.Name == MethodName && method.DeclaredAccessibility == Accessibility.Public)
                        )
                    )
            )
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// A call that may bind to an <c>Instance</c> method: three arguments, and the first not a parameter the
    /// enclosing method declares as the mutator.
    /// </summary>
    private static bool MayCallLegacy(InvocationExpressionSyntax invocation)
    {
        if (
            invocation.ArgumentList.Arguments.Count != ParameterCount
            || CSharpSemanticQueries.InvokedName(invocation)?.Identifier.ValueText != MethodName
        )
        {
            return false;
        }

        // Named arguments can put the mutator anywhere; such a call is taken to bind to the Instance method,
        // which keeps the method rather than risk deleting one the app calls.
        if (invocation.ArgumentList.Arguments.Any(static argument => argument.NameColon is not null))
        {
            return true;
        }

        return invocation.ArgumentList.Arguments[0].Expression is not IdentifierNameSyntax argument
            || invocation.FirstAncestorOrSelf<BaseMethodDeclarationSyntax>() is not { } enclosing
            || !enclosing.ParameterList.Parameters.Any(parameter =>
                parameter.Identifier.ValueText == argument.Identifier.ValueText
                && SimpleName(parameter.Type) == ParameterTypeName
            );
    }

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

    /// <summary>
    /// The name for the mutator parameter: the first of <see cref="_parameterNames"/> that occurs nowhere in the
    /// method, so it neither collides with a local nor hides a member the method uses. The old parameter's own name
    /// counts, since the body keeps it as a local.
    /// </summary>
    private static string NewParameterName(MethodDeclarationSyntax method)
    {
        var used = method
            .DescendantTokens()
            .Where(static token => token.IsKind(SyntaxKind.IdentifierToken))
            .Select(static token => token.ValueText)
            .ToHashSet(StringComparer.Ordinal);
        if (_parameterNames.FirstOrDefault(name => !used.Contains(name)) is { } free)
        {
            return free;
        }

        var index = 2;
        while (used.Contains(_parameterNames[0] + index))
        {
            index++;
        }

        return _parameterNames[0] + index;
    }

    /// <summary>
    /// Changes the first parameter from <c>Instance name</c> to <c>IInstanceDataMutator instanceDataMutator</c>, and
    /// keeps the body compiling by declaring <c>var name = instanceDataMutator.Instance;</c> first, when the body
    /// uses the name. An expression body becomes a block body for that. A <c>param</c> or <c>paramref</c> naming the
    /// parameter in the doc comment follows the rename. The type is emitted as an annotated qualified reference for
    /// the final pass against the upgraded project to simplify.
    /// </summary>
    private static MethodDeclarationSyntax ChangeParameter(MethodDeclarationSyntax method, SyntaxTrivia lineBreak)
    {
        var oldParameter = method.ParameterList.Parameters[0];
        var oldName = oldParameter.Identifier.ValueText;
        var newName = NewParameterName(method);
        var usesInstance = UsesParameter(method, oldName);

        method = RenameDocumentedParameter(method, oldName, newName);
        var parameter = oldParameter
            .WithType(
                GeneratedTypeReferenceFinalizer
                    .Reference(FullParameterTypeName)
                    .WithTriviaFrom(oldParameter.Type ?? (SyntaxNode)oldParameter)
            )
            .WithIdentifier(SyntaxFactory.Identifier(newName).WithTriviaFrom(oldParameter.Identifier));
        var parameters = method.ParameterList.Parameters;
        method = method.WithParameterList(
            method.ParameterList.WithParameters(parameters.Replace(parameters[0], parameter))
        );
        if (!usesInstance)
        {
            return method;
        }

        var local = $"var {oldParameter.Identifier.Text} = {newName}.Instance;";
        return method switch
        {
            { Body: { } body } => method.WithBody(PrependStatement(body, local, lineBreak)),
            { ExpressionBody: { } arrow } => ToBlockBody(method, arrow, local, lineBreak),
            _ => method,
        };
    }

    /// <summary>
    /// Whether the body refers to the parameter: a simple name that is not a member name or argument name, or the
    /// name anywhere in a branch the preprocessor leaves out, which another configuration may compile.
    /// </summary>
    private static bool UsesParameter(MethodDeclarationSyntax method, string name)
    {
        if (((SyntaxNode?)method.Body ?? method.ExpressionBody) is not { } body)
        {
            return false;
        }

        return body.DescendantNodes()
                .OfType<IdentifierNameSyntax>()
                .Any(identifier => identifier.Identifier.ValueText == name && !IsMemberOrArgumentName(identifier))
            || body.DescendantTrivia()
                .Where(static trivia => trivia.IsKind(SyntaxKind.DisabledTextTrivia))
                .Any(trivia =>
                    SyntaxFactory
                        .ParseTokens(trivia.ToString())
                        .Any(token => token.IsKind(SyntaxKind.IdentifierToken) && token.ValueText == name)
                );
    }

    private static bool IsMemberOrArgumentName(IdentifierNameSyntax identifier) =>
        identifier.Parent switch
        {
            MemberAccessExpressionSyntax access => access.Name == identifier,
            MemberBindingExpressionSyntax or NameColonSyntax or NameEqualsSyntax => true,
            _ => false,
        };

    private static MethodDeclarationSyntax RenameDocumentedParameter(
        MethodDeclarationSyntax method,
        string oldName,
        string newName
    ) =>
        method.ReplaceNodes(
            method
                .DescendantNodes(descendIntoTrivia: true)
                .OfType<XmlNameAttributeSyntax>()
                .Where(attribute =>
                    attribute.Identifier.Identifier.ValueText == oldName
                    && attribute.Parent
                        is XmlElementStartTagSyntax { Name.LocalName.ValueText: "param" or "paramref" }
                            or XmlEmptyElementSyntax { Name.LocalName.ValueText: "param" or "paramref" }
                ),
            (_, rewritten) =>
                rewritten.WithIdentifier(SyntaxFactory.IdentifierName(newName).WithTriviaFrom(rewritten.Identifier))
        );

    /// <summary>
    /// The block with the statement first, laid out like the statement it goes before: on its own line with that
    /// statement's indentation, or on the brace's line when the block is written on one line.
    /// </summary>
    private static BlockSyntax PrependStatement(BlockSyntax body, string text, SyntaxTrivia lineBreak)
    {
        var onOneLine = !body.OpenBraceToken.TrailingTrivia.Any(SyntaxKind.EndOfLineTrivia);
        var first = body.Statements.FirstOrDefault();
        var indentation = first is null
            ? Indentation(body.CloseBraceToken.LeadingTrivia) + "    "
            : Indentation(first.GetLeadingTrivia());
        var statement = onOneLine
            ? Statement(text).WithTrailingTrivia(SyntaxFactory.Space)
            : Statement(text).WithLeadingTrivia(SyntaxFactory.Whitespace(indentation)).WithTrailingTrivia(lineBreak);
        return body.WithStatements(body.Statements.Insert(0, statement));
    }

    /// <summary>
    /// The expression-bodied method as a block-bodied one that declares the local and then returns, awaits or throws
    /// what the expression did, laid out at the method's indentation. An <c>async</c> method has nothing to return,
    /// so its expression becomes a statement.
    /// </summary>
    private static MethodDeclarationSyntax ToBlockBody(
        MethodDeclarationSyntax method,
        ArrowExpressionClauseSyntax arrow,
        string localText,
        SyntaxTrivia lineBreak
    )
    {
        var expression = arrow.Expression.WithoutLeadingTrivia().WithoutTrailingTrivia();
        StatementSyntax last = expression switch
        {
            ThrowExpressionSyntax thrown => SyntaxFactory.ThrowStatement(
                thrown.ThrowKeyword.WithTrailingTrivia(SyntaxFactory.Space),
                thrown.Expression,
                SyntaxFactory.Token(SyntaxKind.SemicolonToken)
            ),
            _ when !method.Modifiers.Any(SyntaxKind.AsyncKeyword) => SyntaxFactory.ReturnStatement(
                SyntaxFactory.Token(SyntaxKind.ReturnKeyword).WithTrailingTrivia(SyntaxFactory.Space),
                expression,
                SyntaxFactory.Token(SyntaxKind.SemicolonToken)
            ),
            _ when IsStatementExpression(expression) => SyntaxFactory.ExpressionStatement(expression),
            _ => Statement($"_ = {expression.ToFullString()};"),
        };

        var indentation = Indentation(method.GetLeadingTrivia());
        var inner = SyntaxFactory.Whitespace(indentation + "    ");
        var outer = SyntaxFactory.Whitespace(indentation);
        var body = SyntaxFactory.Block(
            SyntaxFactory.Token(SyntaxKind.OpenBraceToken).WithLeadingTrivia(outer).WithTrailingTrivia(lineBreak),
            SyntaxFactory.List([
                Statement(localText).WithLeadingTrivia(inner).WithTrailingTrivia(lineBreak),
                last.WithLeadingTrivia(inner).WithTrailingTrivia(lineBreak),
            ]),
            SyntaxFactory
                .Token(SyntaxKind.CloseBraceToken)
                .WithLeadingTrivia(outer)
                .WithTrailingTrivia(method.SemicolonToken.TrailingTrivia)
        );
        var parameterList = method.ParameterList.WithCloseParenToken(
            method.ParameterList.CloseParenToken.WithTrailingTrivia(lineBreak)
        );
        return method
            .WithParameterList(parameterList)
            .WithExpressionBody(null)
            .WithSemicolonToken(default)
            .WithBody(body);
    }

    private static bool IsStatementExpression(ExpressionSyntax expression) =>
        expression
            is AwaitExpressionSyntax
                or InvocationExpressionSyntax
                or AssignmentExpressionSyntax
                or ObjectCreationExpressionSyntax
                or PostfixUnaryExpressionSyntax { RawKind: (int)SyntaxKind.PostIncrementExpression }
                or PostfixUnaryExpressionSyntax { RawKind: (int)SyntaxKind.PostDecrementExpression }
                or PrefixUnaryExpressionSyntax { RawKind: (int)SyntaxKind.PreIncrementExpression }
                or PrefixUnaryExpressionSyntax { RawKind: (int)SyntaxKind.PreDecrementExpression };

    private static StatementSyntax Statement(string text) => SyntaxFactory.ParseStatement(text);

    /// <summary>The whitespace a line is indented with: the last whitespace in a token's leading trivia.</summary>
    private static string Indentation(SyntaxTriviaList leading) =>
        leading.LastOrDefault(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia)).ToString();

    /// <summary>The line break the file uses, so generated lines match it.</summary>
    private static SyntaxTrivia LineBreak(SyntaxNode root)
    {
        var existing = root.DescendantTrivia()
            .FirstOrDefault(static trivia => trivia.IsKind(SyntaxKind.EndOfLineTrivia));
        return existing == default ? SyntaxFactory.LineFeed : existing;
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
