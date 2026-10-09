using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for app-implemented interfaces whose methods gained a parameter in v9. An app implementing the
/// v8 shape no longer satisfies the interface (CS0535). Adding the parameter is mechanical and gets the app
/// compiling, so it is applied automatically, with a warning saying what the developer should do with it. The
/// type is emitted as an annotated qualified reference for the final pass against the upgraded project to simplify.
/// </summary>
/// <remarks>
/// <p>With a semantic model the implementations are resolved exactly: the interface by its full name and each
/// method through <see cref="INamedTypeSymbol.FindImplementationForInterfaceMember"/>, so a private overload or an
/// app interface that happens to share the name is never touched, and an implementation inherited from an app
/// base class is migrated together with all of its overrides. Without one, a type is an implementation when its
/// own base list names the interface and a method matches when its name and parameter types match the v8 shape;
/// a same-named interface declared in the app makes that ambiguous, so such matches are reported instead of
/// rewritten, as are overrides of a virtual implementation, which syntax alone cannot find.</p>
/// <p>Some shapes have no mechanical fix and are reported for a manual one: a method that also implements another
/// interface with the same signature (the parameter would break that interface), a partial method (both
/// declarations must change), a method used as a delegate, an implementation outside the app's source, and a
/// method that already uses the parameter's name.</p>
/// <p>A type can already implement the v9 shape next to the v8 one, where v8 offered both. Its v8 method is then
/// left over: an explicit implementation of it no longer compiles and is removed, and a public one is reported
/// for the developer to remove.</p>
/// </remarks>
internal sealed class InterfaceParameterMigration
{
    /// <summary>A changed interface, with the simple parameter type names of each changed method's v8 shape.</summary>
    internal sealed record ChangedInterface(
        string Namespace,
        string Name,
        IReadOnlyDictionary<string, string[]> MethodParameterTypes
    );

    /// <summary>
    /// The parameter v9 added: its simple and full type name, its name, its position (<c>null</c> appends it),
    /// whether it is optional (<c>= default</c>), and the advice that ends the warning for each rewritten method.
    /// </summary>
    internal sealed record AddedParameter(
        string TypeName,
        string FullTypeName,
        string Name,
        int? Position,
        bool IsOptional,
        string Advice
    );

    /// <summary>A method declaration to rewrite or remove, and the interface it implements (for the report).</summary>
    private sealed record Rewrite(ScannedCSharpFile File, MethodDeclarationSyntax Method, string InterfaceName)
    {
        /// <summary>A left-over explicit implementation of the v8 shape, which is removed instead of rewritten.</summary>
        public bool Remove { get; init; }
    }

    private readonly CSharpSourceScanner _scanner;
    private readonly ChangedInterface[] _changedInterfaces;
    private readonly AddedParameter _parameter;

    /// <summary>The v8 parameter types of every changed method; the method names are distinct across the interfaces.</summary>
    private readonly IReadOnlyDictionary<string, string[]> _v8Signatures;

    public InterfaceParameterMigration(
        CSharpSourceScanner scanner,
        ChangedInterface[] changedInterfaces,
        AddedParameter parameter
    )
    {
        _scanner = scanner;
        _changedInterfaces = changedInterfaces;
        _parameter = parameter;
        _v8Signatures = changedInterfaces
            .SelectMany(static changed => changed.MethodParameterTypes)
            .ToDictionary(static pair => pair.Key, static pair => pair.Value, StringComparer.Ordinal);
    }

    private string ParameterDeclaration => $"'{_parameter.TypeName} {_parameter.Name}'";

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
            var appInterfaces = new AppInterfaces(files, _changedInterfaces, _v8Signatures);
            var possibleMethodGroups = files
                .SelectMany(static file => file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
                .Where(name =>
                    _v8Signatures.ContainsKey(name.Identifier.ValueText) && MethodGroupExpression(name) is not null
                )
                .Select(static name => name.Identifier.ValueText)
                .ToHashSet(StringComparer.Ordinal);
            foreach (var file in syntaxFiles)
            {
                cancellationToken.ThrowIfCancellationRequested();
                rewrites.AddRange(FindSyntacticRewrites(file, appInterfaces, possibleMethodGroups, messages));
            }
        }

        foreach (var fileRewrites in rewrites.GroupBy(static rewrite => rewrite.File))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var file = fileRewrites.Key;
            var methods = new List<MethodDeclarationSyntax>();
            var removals = new List<MethodDeclarationSyntax>();
            foreach (var rewrite in fileRewrites)
            {
                var (_, method, interfaceName) = rewrite;
                var location = $"{file.RelativePath}:{file.GetLine(method)}: {MemberName(method)}";
                if (rewrite.Remove)
                {
                    removals.Add(method);
                    messages.Warn(
                        $"{location}: removed this implementation of the v8 {interfaceName}.{method.Identifier.Text}, "
                            + $"which v9 no longer has. The type already implements the one with the "
                            + $"{ParameterDeclaration} parameter."
                    );
                    continue;
                }

                if (UsesIdentifier(method, _parameter.Name))
                {
                    messages.Todo(
                        $"{location} already uses the name '{_parameter.Name}', so the {ParameterDeclaration} "
                            + $"parameter the v9 {interfaceName} requires was not added. Add it by hand, renaming the "
                            + "existing symbol or choosing another parameter name."
                    );
                    continue;
                }

                methods.Add(method);
                messages.Warn(
                    $"{location}: added the '{_parameter.Name}' parameter to satisfy the v9 {interfaceName}. "
                        + _parameter.Advice
                );
            }

            if (methods.Count > 0 || removals.Count > 0)
            {
                var tracked = file.Root.TrackNodes(methods.Concat(removals));
                var rewritten = tracked.ReplaceNodes(
                    methods.Select(method => Current(tracked, method)),
                    (original, _) => AddParameter(original)
                );
                var updatedRoot =
                    rewritten.RemoveNodes(
                        removals.Select(method => Current(rewritten, method)),
                        SyntaxRemoveOptions.KeepNoTrivia
                    ) ?? throw new InvalidOperationException("Failed to remove the left-over v8 overloads");
                _scanner.Update(file, updatedRoot);
            }
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The implementations of the changed interface members in files that carry a semantic model, resolved
    /// through the compilation. An implementation is rewritten together with its whole override family (the
    /// methods it overrides and every override of those, which the interface map does not point at), since the
    /// signatures must stay in step; a family with a member that cannot be changed is reported instead.
    /// </summary>
    private List<Rewrite> FindSemanticRewrites(
        ScannedCSharpFile[] files,
        List<UpgradeMessage> messages,
        CancellationToken cancellationToken
    )
    {
        var filesByTree = files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        var rewrites = new List<Rewrite>();
        var candidates = new List<(IMethodSymbol Implementation, IMethodSymbol Contract)>();
        var methodGroups = FindMethodGroups(files, cancellationToken);
        // Implementations that also satisfy an interface member this migration does not change, keyed to that
        // member: the parameter would break that other interface.
        var shared = new Dictionary<IMethodSymbol, ISymbol>(SymbolEqualityComparer.Default);
        // Every override declared in the app, by the method it overrides.
        var overrides = new Dictionary<IMethodSymbol, List<IMethodSymbol>>(SymbolEqualityComparer.Default);
        var handled = new HashSet<IMethodSymbol>(SymbolEqualityComparer.Default);

        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (file.SemanticModel is not { } semanticModel)
            {
                continue;
            }

            foreach (var declaration in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (semanticModel.GetDeclaredSymbol(declaration, cancellationToken) is not { } type)
                {
                    continue;
                }

                foreach (var contract in type.AllInterfaces)
                {
                    var changed = _changedInterfaces.FirstOrDefault(candidate =>
                        contract.Name == candidate.Name
                        && contract.ContainingNamespace.ToDisplayString() == candidate.Namespace
                        && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
                    );
                    var members = contract
                        .GetMembers()
                        .OfType<IMethodSymbol>()
                        .Where(member => _v8Signatures.ContainsKey(member.Name));
                    foreach (var member in members)
                    {
                        // A changed interface can offer the v9 shape next to the v8 one; only the v8 one changes.
                        if (changed is not null && !HasParameterTypes(member, _v8Signatures[member.Name]))
                        {
                            continue;
                        }

                        if (type.FindImplementationForInterfaceMember(member) is not IMethodSymbol implementation)
                        {
                            continue;
                        }

                        if (changed is not null)
                        {
                            candidates.Add((implementation, member));
                        }
                        else
                        {
                            shared.TryAdd(implementation, member);
                        }
                    }
                }
            }

            var overrideDeclarations = file
                .Root.DescendantNodes()
                .OfType<MethodDeclarationSyntax>()
                .Where(static method => method.Modifiers.Any(SyntaxKind.OverrideKeyword));
            foreach (var declaration in overrideDeclarations)
            {
                if (
                    semanticModel.GetDeclaredSymbol(declaration, cancellationToken)
                        is { OverriddenMethod: { } overridden } method
                    && !overrides.TryAdd(overridden, [method])
                )
                {
                    overrides[overridden].Add(method);
                }
            }
        }

        foreach (var (implementation, contract) in candidates)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var interfaceName = contract.ContainingType.Name;
            // Already carrying the parameter (bound against v9, or migrated by hand) means done.
            if (handled.Contains(implementation) || implementation.Parameters.Any(HasAddedParameterType))
            {
                continue;
            }

            if (ImplementsV9Shape(implementation, contract))
            {
                handled.Add(implementation);
                if (Locate(implementation, filesByTree) is { } leftOver)
                {
                    ReportOrRemoveLeftOver(leftOver.File, leftOver.Method, interfaceName, rewrites, messages);
                }

                continue;
            }

            var family = OverrideFamily(implementation, overrides);
            handled.UnionWith(family);
            var declarations = family.Select(method => Locate(method, filesByTree)).ToList();
            var location = declarations[0] is { } own
                ? $"{own.File.RelativePath}:{own.File.GetLine(own.Method)}: {MemberName(own.Method)}"
                : $"{implementation.ContainingType.Name}.{implementation.Name}";

            var methodGroup = family
                .Append(contract)
                .Select(method => methodGroups.GetValueOrDefault(method.OriginalDefinition))
                .FirstOrDefault(static usage => usage is not null);
            if (methodGroup is not null)
            {
                messages.Todo(
                    $"{location} is used as a method group at {methodGroup}; adding the {ParameterDeclaration} "
                        + $"parameter the v9 {interfaceName} requires would break the delegate conversion. Update "
                        + "the signature, its overrides, and the delegate usage by hand."
                );
                continue;
            }

            var sharedMember = family
                .Select(shared.GetValueOrDefault)
                .FirstOrDefault(static member => member is not null);
            if (sharedMember is not null)
            {
                messages.Todo(
                    $"{location} also implements {sharedMember.ContainingType.Name}.{sharedMember.Name}, which this "
                        + $"upgrade does not change, so adding the {ParameterDeclaration} parameter the v9 "
                        + $"{interfaceName} requires would break that interface. Add it by hand, to both interfaces "
                        + "or through a separate method."
                );
                continue;
            }

            if (family.Any(IsPartial))
            {
                messages.Todo(
                    $"{location} is a partial method; add the {ParameterDeclaration} parameter the v9 "
                        + $"{interfaceName} requires to both of its declarations by hand."
                );
                continue;
            }

            var missing = declarations.IndexOf(null);
            if (missing >= 0)
            {
                var outside = family[missing];
                messages.Todo(
                    $"{location} implements the v9 {interfaceName} through "
                        + $"{outside.ContainingType.Name}.{outside.Name}, which is outside the app's source and could "
                        + $"not be updated; the app needs its own implementation with the {ParameterDeclaration} "
                        + "parameter."
                );
                continue;
            }

            // The name has to be free in every declaration or in none: rewriting only the declarations that
            // can take the parameter would leave the rest of the family behind with a signature that no
            // longer matches, which does not compile.
            var blocked = declarations.FirstOrDefault(found =>
                found is { } declaration && UsesIdentifier(declaration.Method, _parameter.Name)
            );
            if (blocked is { } usingTheName)
            {
                var isOwnDeclaration = declarations[0] is { } first && first.Method == usingTheName.Method;
                var inMember = isOwnDeclaration ? "" : $" in {MemberName(usingTheName.Method)}";
                var andOverrides = declarations.Count > 1 ? " or to the rest of its override family" : "";
                messages.Todo(
                    $"{location} already uses the name '{_parameter.Name}'{inMember}, so the "
                        + $"{ParameterDeclaration} parameter the v9 {interfaceName} requires was not "
                        + $"added{andOverrides}. Add it by hand to every declaration, renaming the existing symbol or "
                        + "choosing another parameter name."
                );
                continue;
            }

            foreach (var found in declarations)
            {
                if (found is { } declaration)
                {
                    rewrites.Add(new Rewrite(declaration.File, declaration.Method, interfaceName));
                }
            }
        }

        return rewrites;
    }

    /// <summary>
    /// A v8 implementation the type has already replaced with the v9 shape. An explicit implementation of the v8
    /// member no longer compiles once that member is gone, and nothing can call it any other way, so it is
    /// removed; a public method still compiles and may have callers of its own, so it is left for the developer.
    /// </summary>
    private void ReportOrRemoveLeftOver(
        ScannedCSharpFile file,
        MethodDeclarationSyntax method,
        string interfaceName,
        List<Rewrite> rewrites,
        List<UpgradeMessage> messages
    )
    {
        if (method.ExplicitInterfaceSpecifier is not null)
        {
            rewrites.Add(new Rewrite(file, method, interfaceName) { Remove = true });
            return;
        }

        messages.Warn(
            $"{file.RelativePath}:{file.GetLine(method)}: {MemberName(method)} implements the v8 "
                + $"{interfaceName}.{method.Identifier.Text}, which v9 no longer has, and the type already "
                + $"implements the one with the {ParameterDeclaration} parameter. Remove it unless the app calls it "
                + "itself."
        );
    }

    /// <summary>
    /// Whether the method's type also declares the v9 shape of <paramref name="contract"/>: the same parameters plus
    /// the added one. An explicit implementation's symbol is named after the interface as well, so methods are
    /// matched on the member they are named for.
    /// </summary>
    private bool ImplementsV9Shape(IMethodSymbol implementation, IMethodSymbol contract) =>
        implementation
            .ContainingType.GetMembers()
            .OfType<IMethodSymbol>()
            .Any(method =>
                (
                    method.Name == contract.Name
                    || method.ExplicitInterfaceImplementations.Any(implemented => implemented.Name == contract.Name)
                )
                && method.Parameters.Length == implementation.Parameters.Length + 1
                && HasAddedParameterType(method.Parameters[AddedParameterIndex(implementation.Parameters.Length)])
                && method
                    .Parameters.RemoveAt(AddedParameterIndex(implementation.Parameters.Length))
                    .Select(static parameter => parameter.Type)
                    .SequenceEqual(
                        implementation.Parameters.Select(static parameter => parameter.Type),
                        SymbolEqualityComparer.Default
                    )
            );

    /// <summary>Where the added parameter goes in a method that has <paramref name="count"/> parameters before it.</summary>
    private int AddedParameterIndex(int count) => _parameter.Position ?? count;

    /// <summary>Delegate conversions must be updated along with the signature, even for an optional parameter.</summary>
    private Dictionary<IMethodSymbol, string> FindMethodGroups(
        IEnumerable<ScannedCSharpFile> files,
        CancellationToken cancellationToken
    )
    {
        var uses = new Dictionary<IMethodSymbol, string>(SymbolEqualityComparer.Default);
        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (file.SemanticModel is not { } semanticModel)
            {
                continue;
            }

            foreach (var name in file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
            {
                if (
                    _v8Signatures.ContainsKey(name.Identifier.ValueText)
                    && MethodGroupExpression(name) is { } expression
                    && semanticModel.GetSymbolInfo(expression, cancellationToken).Symbol is IMethodSymbol method
                )
                {
                    uses.TryAdd(method.OriginalDefinition, $"{file.RelativePath}:{file.GetLine(expression)}");
                }
            }
        }

        return uses;
    }

    private static ExpressionSyntax? MethodGroupExpression(SimpleNameSyntax name)
    {
        ExpressionSyntax expression = name.Parent switch
        {
            MemberAccessExpressionSyntax member when member.Name == name => member,
            MemberBindingExpressionSyntax member when member.Name == name => member,
            _ => name,
        };
        if (
            expression.Parent is InvocationExpressionSyntax invocation && invocation.Expression == expression
            || expression
                .Ancestors()
                .OfType<InvocationExpressionSyntax>()
                .Any(static ancestor => ancestor.Expression is IdentifierNameSyntax { Identifier.ValueText: "nameof" })
        )
        {
            return null;
        }

        return expression;
    }

    /// <summary>
    /// The method, every method it overrides, and every override of any of those: the signatures that have to
    /// change together. The implementation itself comes first.
    /// </summary>
    private static List<IMethodSymbol> OverrideFamily(
        IMethodSymbol implementation,
        IReadOnlyDictionary<IMethodSymbol, List<IMethodSymbol>> overrides
    )
    {
        var family = new List<IMethodSymbol>();
        for (var method = implementation; method is not null; method = method.OverriddenMethod)
        {
            family.Add(method);
        }

        for (var i = 0; i < family.Count; i++)
        {
            if (!overrides.TryGetValue(family[i], out var derived))
            {
                continue;
            }

            foreach (var method in derived)
            {
                if (!family.Contains(method, SymbolEqualityComparer.Default))
                {
                    family.Add(method);
                }
            }
        }

        return family;
    }

    private bool HasAddedParameterType(IParameterSymbol parameter) =>
        parameter.Type.ToDisplayString() == _parameter.FullTypeName;

    private static MethodDeclarationSyntax Current(CompilationUnitSyntax tracked, MethodDeclarationSyntax original) =>
        tracked.GetCurrentNode(original) ?? throw new InvalidOperationException("Failed to track method declaration");

    private static bool IsPartial(IMethodSymbol method) =>
        method.IsPartialDefinition || method.PartialDefinitionPart is not null;

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

    /// <summary>
    /// What the app's own interface declarations say, for the syntax fallback: which of them share a name with a
    /// changed interface (an implementation of that name is then ambiguous), and which declare a method with the
    /// same v8 signature as a changed one (an implementation of both cannot gain the parameter).
    /// </summary>
    private sealed class AppInterfaces
    {
        private readonly HashSet<string> _sameNamed = new(StringComparer.Ordinal);
        private readonly Dictionary<string, HashSet<string>> _sameSignature = new(StringComparer.Ordinal);

        public AppInterfaces(
            IEnumerable<ScannedCSharpFile> files,
            ChangedInterface[] changedInterfaces,
            IReadOnlyDictionary<string, string[]> v8Signatures
        )
        {
            var declarations = files.SelectMany(static file =>
                file.Root.DescendantNodes().OfType<InterfaceDeclarationSyntax>()
            );
            foreach (var declaration in declarations)
            {
                var name = declaration.Identifier.Text;
                if (changedInterfaces.Any(changed => changed.Name == name))
                {
                    _sameNamed.Add(name);
                    continue;
                }

                var methods = declaration
                    .Members.OfType<MethodDeclarationSyntax>()
                    .Where(method =>
                        v8Signatures.TryGetValue(method.Identifier.Text, out var v8Types)
                        && HasParameterTypes(method, v8Types)
                    );
                foreach (var method in methods)
                {
                    if (!_sameSignature.TryAdd(method.Identifier.Text, [name]))
                    {
                        _sameSignature[method.Identifier.Text].Add(name);
                    }
                }
            }
        }

        public bool IsAmbiguous(string interfaceName) => _sameNamed.Contains(interfaceName);

        /// <summary>An interface in <paramref name="baseNames"/> that declares <paramref name="methodName"/> with the v8 signature, if any.</summary>
        public string? SharedWith(string methodName, IEnumerable<string> baseNames) =>
            _sameSignature.TryGetValue(methodName, out var interfaces)
                ? baseNames.FirstOrDefault(interfaces.Contains)
                : null;
    }

    /// <summary>
    /// The syntax fallback for a file without a semantic model: the changed methods, by v8 name and parameter
    /// types, on types whose own base list names a changed interface (or explicit implementations naming it).
    /// </summary>
    private IEnumerable<Rewrite> FindSyntacticRewrites(
        ScannedCSharpFile file,
        AppInterfaces appInterfaces,
        IReadOnlySet<string> possibleMethodGroups,
        List<UpgradeMessage> messages
    )
    {
        var rewrites = new List<Rewrite>();
        foreach (var type in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            var baseNames = (type.BaseList?.Types ?? default)
                .Select(static baseType => SimpleName(baseType.Type))
                .OfType<string>()
                .ToList();
            var implementedInterfaces = baseNames
                .Where(name => _changedInterfaces.Any(changed => changed.Name == name))
                .ToHashSet(StringComparer.Ordinal);

            foreach (var method in type.Members.OfType<MethodDeclarationSyntax>())
            {
                var explicitInterface = SimpleName(method.ExplicitInterfaceSpecifier?.Name);
                var candidateInterfaces = explicitInterface is not null
                    ? [explicitInterface]
                    : implementedInterfaces.AsEnumerable();
                var changed = candidateInterfaces
                    .Select(name => _changedInterfaces.FirstOrDefault(candidate => candidate.Name == name))
                    .FirstOrDefault(candidate =>
                        candidate is not null
                        && candidate.MethodParameterTypes.TryGetValue(method.Identifier.Text, out var v8Types)
                        && HasParameterTypes(method, v8Types)
                    );
                if (changed is null)
                {
                    continue;
                }

                var location = $"{file.RelativePath}:{file.GetLine(method)}: {MemberName(method)}";
                if (appInterfaces.IsAmbiguous(changed.Name))
                {
                    messages.Todo(
                        $"{location} may implement the v9 {changed.Name} or the app's own interface of that name, "
                            + "which cannot be told apart without a compilation of the app. If it implements the "
                            + $"Altinn one, add the {ParameterDeclaration} parameter by hand."
                    );
                    continue;
                }

                if (DeclaresV9Shape(type, method))
                {
                    ReportOrRemoveLeftOver(file, method, changed.Name, rewrites, messages);
                    continue;
                }

                if (method.Modifiers.Any(SyntaxKind.PartialKeyword))
                {
                    messages.Todo(
                        $"{location} is a partial method; add the {ParameterDeclaration} parameter the v9 "
                            + $"{changed.Name} requires to both of its declarations by hand."
                    );
                    continue;
                }

                if (appInterfaces.SharedWith(method.Identifier.Text, baseNames) is { } sharedInterface)
                {
                    messages.Todo(
                        $"{location} also implements {sharedInterface}.{method.Identifier.Text}, which this upgrade "
                            + $"does not change, so adding the {ParameterDeclaration} parameter the v9 {changed.Name} "
                            + "requires would break that interface. Add it by hand, to both interfaces or through a "
                            + "separate method."
                    );
                    continue;
                }

                if (possibleMethodGroups.Contains(method.Identifier.ValueText))
                {
                    messages.Todo(
                        $"{location} may be used as a method group; without a compilation, that usage cannot be "
                            + $"bound to a particular overload. Add the {ParameterDeclaration} parameter the v9 "
                            + $"{changed.Name} requires and update any affected delegate conversions by hand."
                    );
                    continue;
                }

                rewrites.Add(new Rewrite(file, method, changed.Name));

                if (method.Modifiers.Any(SyntaxKind.VirtualKeyword) || method.Modifiers.Any(SyntaxKind.AbstractKeyword))
                {
                    messages.Todo(
                        $"{location} can be overridden, and every override needs the {ParameterDeclaration} "
                            + "parameter as well; overrides cannot be found without a compilation of the app, so add "
                            + "it to them by hand."
                    );
                }
            }
        }

        return rewrites;
    }

    /// <summary>
    /// Whether <paramref name="type"/> declares the v9 shape of <paramref name="method"/> next to it: the same name
    /// and parameter types, plus the added parameter.
    /// </summary>
    private bool DeclaresV9Shape(TypeDeclarationSyntax type, MethodDeclarationSyntax method)
    {
        var v8Types = method.ParameterList.Parameters.Select(static parameter => SimpleName(parameter.Type)).ToList();
        var v9Types = v8Types.ToList();
        v9Types.Insert(AddedParameterIndex(v8Types.Count), _parameter.TypeName);
        return type
            .Members.OfType<MethodDeclarationSyntax>()
            .Any(other =>
                other != method
                && other.Identifier.Text == method.Identifier.Text
                && other
                    .ParameterList.Parameters.Select(static parameter => SimpleName(parameter.Type))
                    .SequenceEqual(v9Types)
            );
    }

    /// <summary>Whether the method's parameters have exactly the given simple type names, in order.</summary>
    private static bool HasParameterTypes(IMethodSymbol method, string[] typeNames) =>
        method.Parameters.Length == typeNames.Length
        && method.Parameters.Zip(typeNames).All(static pair => SimpleName(pair.First.Type) == pair.Second);

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

    private static string MemberName(MethodDeclarationSyntax method) =>
        method.Parent is TypeDeclarationSyntax type
            ? $"{type.Identifier.Text}.{method.Identifier.Text}"
            : method.Identifier.Text;

    private MethodDeclarationSyntax AddParameter(MethodDeclarationSyntax method)
    {
        var parameters = method.ParameterList.Parameters;
        var newParameter = SyntaxFactory
            .Parameter(SyntaxFactory.Identifier(_parameter.Name))
            .WithType(
                GeneratedTypeReferenceFinalizer
                    .Reference(_parameter.FullTypeName)
                    .WithTrailingTrivia(SyntaxFactory.Space)
            );

        // A default on an explicit interface implementation has no effect and raises CS1066.
        if (_parameter.IsOptional && method.ExplicitInterfaceSpecifier is null)
        {
            var equalsToken = SyntaxFactory.Token(
                SyntaxFactory.TriviaList(SyntaxFactory.Space),
                SyntaxKind.EqualsToken,
                SyntaxFactory.TriviaList(SyntaxFactory.Space)
            );
            newParameter = newParameter.WithDefault(
                SyntaxFactory.EqualsValueClause(
                    equalsToken,
                    SyntaxFactory.LiteralExpression(SyntaxKind.DefaultLiteralExpression)
                )
            );
        }

        var index = AddedParameterIndex(parameters.Count);
        var updated =
            index >= parameters.Count
                ? AppendParameter(parameters, newParameter)
                : InsertParameter(parameters, index, newParameter);
        return method.WithParameterList(method.ParameterList.WithParameters(updated));
    }

    /// <summary>
    /// Inserts before the parameter at <paramref name="index"/>: the new parameter takes that parameter's leading
    /// trivia (its indentation in a one-per-line list) and is followed by a copy of the comma before it, so the
    /// layout of the list carries over.
    /// </summary>
    private static SeparatedSyntaxList<ParameterSyntax> InsertParameter(
        SeparatedSyntaxList<ParameterSyntax> parameters,
        int index,
        ParameterSyntax newParameter
    )
    {
        var next = parameters[index];
        var separator =
            index > 0
                ? parameters.GetSeparator(index - 1)
                : SyntaxFactory.Token(SyntaxKind.CommaToken).WithTrailingTrivia(SyntaxFactory.Space);
        var nodesAndTokens = parameters.GetWithSeparators();
        var position = nodesAndTokens.IndexOf(next);
        return SyntaxFactory.SeparatedList<ParameterSyntax>(
            nodesAndTokens.InsertRange(position, [newParameter.WithLeadingTrivia(next.GetLeadingTrivia()), separator])
        );
    }

    private static SeparatedSyntaxList<ParameterSyntax> AppendParameter(
        SeparatedSyntaxList<ParameterSyntax> parameters,
        ParameterSyntax newParameter
    )
    {
        var last = parameters.Last();
        var lastTrailingTrivia = last.GetTrailingTrivia();
        var isMultiLine = lastTrailingTrivia.Any(SyntaxKind.EndOfLineTrivia);

        // Whatever followed the last parameter (a trailing comment, the line break) now follows the comma, so a
        // comment stays on its line and is not duplicated. In a one-per-line list the new parameter takes the
        // previous parameter's indentation and ends the line the same way, so the closing parenthesis stays put.
        // On a single line the new parameter supplies its own separating space, so trailing whitespace is dropped.
        var commaTrailingTrivia = isMultiLine
            ? lastTrailingTrivia
            : SyntaxFactory.TriviaList(
                lastTrailingTrivia.Reverse().SkipWhile(trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia)).Reverse()
            );
        var comma = SyntaxFactory.Token(SyntaxKind.CommaToken).WithTrailingTrivia(commaTrailingTrivia);
        if (isMultiLine)
        {
            var indentation = last.GetLeadingTrivia()
                .LastOrDefault(trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia));
            newParameter = newParameter
                .WithLeadingTrivia(
                    indentation == default ? SyntaxFactory.TriviaList() : SyntaxFactory.TriviaList(indentation)
                )
                .WithTrailingTrivia(lastTrailingTrivia.Last());
        }
        else
        {
            newParameter = newParameter.WithLeadingTrivia(SyntaxFactory.Space);
        }

        var nodesAndTokens = parameters
            .Replace(last, last.WithoutTrailingTrivia())
            .GetWithSeparators()
            .Add(comma)
            .Add(newParameter);

        return SyntaxFactory.SeparatedList<ParameterSyntax>(nodesAndTokens);
    }

    /// <summary>The simple name of a parameter type, as <see cref="SimpleName(TypeSyntax?)"/> reads a written one.</summary>
    private static string SimpleName(ITypeSymbol type) =>
        type.SpecialType is SpecialType.System_String or SpecialType.System_Decimal
            ? type.WithNullableAnnotation(NullableAnnotation.NotAnnotated).ToDisplayString()
            : type.Name;

    /// <summary>
    /// The simple name of a written type, with a nullable annotation stripped and the framework aliases of the
    /// changed methods' parameter types normalized, so <c>string?</c>, <c>String</c> and <c>System.String</c> agree.
    /// </summary>
    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => NormalizeAlias(identifier.Identifier.Text),
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => NormalizeAlias(qualified.Right.Identifier.Text),
            AliasQualifiedNameSyntax alias => NormalizeAlias(alias.Name.Identifier.Text),
            PredefinedTypeSyntax predefined => predefined.Keyword.Text,
            NullableTypeSyntax nullable => SimpleName(nullable.ElementType),
            _ => null,
        };

    private static string NormalizeAlias(string name) =>
        name switch
        {
            "String" => "string",
            "Decimal" => "decimal",
            _ => name,
        };
}
