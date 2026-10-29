using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the <c>IProcessTask</c> lifecycle members v9 removes. In v8 a process task implemented
/// <c>Start</c>, <c>End</c> and <c>Abandon</c>, each <c>(string taskId, Instance instance)</c>, and the libraries
/// called them as the process moved. v9 has no such members: a task composes the work for each phase as stages with
/// <c>DefineStart</c>, <c>DefineEnd</c> and <c>DefineAbandon</c>, and the defaults compose nothing, so a v8
/// implementation would compile and then silently do nothing when the task starts, ends or is abandoned.
/// </summary>
/// <remarks>
/// <p>Each v8 method gets a <c>Define</c> member beside it that runs it as the phase's one stage, with the task id and
/// the instance read from the stage's context. The method's body is left as it is: the rewrite gets the app
/// behaving as before and compiling, and a warning points at the two things worth doing by hand, splitting the work
/// into stages and reading instance data through the stage's data mutator. An explicit implementation becomes a
/// private method, since v9 has no interface member for it to implement, under another name when the type also has
/// an implicit method of that signature. A type that already composes the phase keeps what it has; its v8 method
/// stays as the type's own method.</p>
/// <p>With a semantic model the implementations are resolved exactly, through
/// <see cref="INamedTypeSymbol.FindImplementationForInterfaceMember"/>, so a method inherited from a base class
/// gets the definition beside it, which the derived task then inherits, and an overload that only looks alike is
/// never mistaken for the implementation. Without one, a type is an implementation when its own base list names the
/// interface, or another declaration of the same partial type does, and the method is found by name and parameter
/// types in the type's own declaration. A same-named interface declared in the app makes that ambiguous, and a base
/// class may hold the methods, so both are reported instead of rewritten.</p>
/// </remarks>
internal sealed class ProcessTaskLifecycleMigration
{
    private const string InterfaceNamespace = "Altinn.App.Core.Internal.Process.ProcessTasks";
    private const string InterfaceName = "IProcessTask";
    private const string BuilderName = "PipelineBuilder";
    private const string PipelineTypeName = "Altinn.App.Core.Features.Process.ProcessTaskPipeline";
    private const string BuilderTypeName = "Altinn.App.Core.Features.Process." + BuilderName;
    private const string StageResultTypeName = "Altinn.App.Core.Features.Process.StageResult";

    private static readonly string[] _phases = ["Start", "End", "Abandon"];
    private static readonly string[] _legacyParameterTypes = ["string", "Instance"];

    /// <param name="CallName">The name the generated stage calls: the method's, or the private name it gets.</param>
    private sealed record Rewrite(
        ScannedCSharpFile File,
        MethodDeclarationSyntax Method,
        string Phase,
        string CallName,
        bool AddDefinition,
        bool ToPrivate
    );

    private readonly CSharpSourceScanner _scanner;

    public ProcessTaskLifecycleMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var messages = new List<UpgradeMessage>();
        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        var files = _scanner.Files.ToArray();
        var filesByTree = files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        var declarations = files
            .SelectMany(
                file => file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>(),
                (file, type) => (file, type)
            )
            .ToList();
        var appDeclaresInterface = files
            .SelectMany(static file => file.Root.DescendantNodes().OfType<InterfaceDeclarationSyntax>())
            .Any(static declaration => declaration.Identifier.ValueText == InterfaceName);
        // A partial type lists the interface in one declaration and may hold the methods in another.
        var partialImplementers = declarations
            .Where(static pair => pair.type.Modifiers.Any(SyntaxKind.PartialKeyword) && ListsInterface(pair.type))
            .Select(static pair => pair.type.Identifier.ValueText)
            .ToHashSet(StringComparer.Ordinal);

        var rewrites = new List<Rewrite>();
        var handled = new HashSet<MethodDeclarationSyntax>();
        foreach (var (file, type) in declarations)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (file.SemanticModel is { } semanticModel)
            {
                if (
                    semanticModel.GetDeclaredSymbol(type, cancellationToken) is { } symbol
                    && symbol.AllInterfaces.FirstOrDefault(IsSdkProcessTask) is { } contract
                )
                {
                    rewrites.AddRange(
                        FindSemanticRewrites(file, type, symbol, contract, filesByTree, handled, messages)
                    );
                }

                continue;
            }

            var implements =
                ListsInterface(type)
                || (
                    type.Modifiers.Any(SyntaxKind.PartialKeyword)
                    && partialImplementers.Contains(type.Identifier.ValueText)
                );
            if (!implements)
            {
                continue;
            }

            if (appDeclaresInterface)
            {
                messages.Todo(
                    $"{Location(file, type)}: {type.Identifier.Text} may implement the v9 {InterfaceName} or the "
                        + "app's own interface of that name, which cannot be told apart without a compilation of the "
                        + "app. If it implements the Altinn one, compose its Start, End and Abandon work with "
                        + "DefineStart, DefineEnd and DefineAbandon by hand."
                );
                continue;
            }

            rewrites.AddRange(FindSyntacticRewrites(file, type, handled, messages));
        }

        foreach (var fileRewrites in rewrites.GroupBy(static rewrite => rewrite.File))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var file = fileRewrites.Key;
            var byMethod = fileRewrites.ToDictionary(static rewrite => rewrite.Method);
            var root = file.Root.TrackNodes(byMethod.Keys);
            foreach (var (original, rewrite) in byMethod)
            {
                var current =
                    root.GetCurrentNode(original) ?? throw new InvalidOperationException("Tracked node lost.");
                var method = rewrite.ToPrivate ? MakePrivate(current, rewrite.CallName) : current;
                var replacements = rewrite.AddDefinition
                    ? new MemberDeclarationSyntax[] { method, Definition(rewrite.Phase, rewrite.CallName, current) }
                    : [method];
                root = root.ReplaceNode(current, replacements);
            }

            _scanner.Update(file, root);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The implementations of the v8 members for one type, resolved through the compilation: the method a phase binds
    /// to, wherever it is declared, with the definition added beside it. A phase whose v8 member the contract no
    /// longer has (the app compiled against v9) falls back to the type's own declaration, by syntax.
    /// </summary>
    private static IEnumerable<Rewrite> FindSemanticRewrites(
        ScannedCSharpFile file,
        TypeDeclarationSyntax type,
        INamedTypeSymbol symbol,
        INamedTypeSymbol contract,
        IReadOnlyDictionary<SyntaxTree, ScannedCSharpFile> filesByTree,
        HashSet<MethodDeclarationSyntax> handled,
        List<UpgradeMessage> messages
    )
    {
        foreach (var phase in _phases)
        {
            var member = contract
                .GetMembers(phase)
                .OfType<IMethodSymbol>()
                .FirstOrDefault(static member => member.Parameters.Length == _legacyParameterTypes.Length);
            if (member is null)
            {
                foreach (var fallback in FindSyntacticRewrites(file, type, handled, messages, phase))
                {
                    yield return fallback;
                }

                continue;
            }

            if (
                symbol.FindImplementationForInterfaceMember(member) is not IMethodSymbol implementation
                || implementation.ContainingType.TypeKind == TypeKind.Interface
            )
            {
                continue;
            }

            if (Locate(implementation, filesByTree) is not { } found)
            {
                messages.Todo(
                    $"{Location(file, type)}: {symbol.Name} implements {InterfaceName}.{phase} through "
                        + $"{implementation.ContainingType.Name}.{phase}, which is outside the app's source. v9 has no "
                        + $"such member: give {symbol.Name} a Define{phase} that runs that work as stages."
                );
                continue;
            }

            var (declaringFile, method) = found;
            if (!handled.Add(method))
            {
                continue;
            }

            var definitions = BaseTypes(symbol)
                .SelectMany(baseType => baseType.GetMembers("Define" + phase).OfType<IMethodSymbol>())
                .Where(static definition =>
                    definition.Parameters.Length == 1 && definition.Parameters[0].Type.Name == BuilderName
                )
                .ToList();
            var hasDefinition = definitions.Any(IsImplementation);
            if (!hasDefinition && definitions.Count > 0)
            {
                messages.Todo(NotAnImplementation(declaringFile, method, phase));
                continue;
            }
            var isExplicit = implementation.ExplicitInterfaceImplementations.Length > 0;
            var collides =
                isExplicit
                && implementation
                    .ContainingType.GetMembers(phase)
                    .OfType<IMethodSymbol>()
                    .Any(other => SameParameterTypes(other, implementation));
            var reservedNames = implementation
                .ContainingType.GetMembers()
                .Select(static other => other.Name)
                .ToHashSet(StringComparer.Ordinal);
            var inherited = !SymbolEqualityComparer.Default.Equals(implementation.ContainingType, symbol)
                ? $" {symbol.Name} implements {InterfaceName} through it."
                : "";

            if (
                Decide(
                    declaringFile,
                    method,
                    phase,
                    hasDefinition,
                    isExplicit,
                    collides,
                    reservedNames,
                    inherited,
                    messages
                ) is
                { } rewrite
            )
            {
                yield return rewrite;
            }
        }
    }

    /// <summary>
    /// The syntax fallback: the method by name and parameter types in the type's own declaration, an explicit
    /// implementation preferred over an implicit one of the same shape, which v8 then never called.
    /// </summary>
    private static IEnumerable<Rewrite> FindSyntacticRewrites(
        ScannedCSharpFile file,
        TypeDeclarationSyntax type,
        HashSet<MethodDeclarationSyntax> handled,
        List<UpgradeMessage> messages,
        string? onlyPhase = null
    )
    {
        var methods = type.Members.OfType<MethodDeclarationSyntax>().ToList();
        var reservedNames = type.Members.Select(MemberName).OfType<string>().ToHashSet(StringComparer.Ordinal);
        var found = false;
        foreach (var phase in onlyPhase is null ? _phases : [onlyPhase])
        {
            var candidates = methods
                .Where(method =>
                    method.Identifier.ValueText == phase
                    && HasParameterTypes(method, _legacyParameterTypes)
                    && (
                        method.ExplicitInterfaceSpecifier is null
                        || SimpleName(method.ExplicitInterfaceSpecifier.Name) == InterfaceName
                    )
                )
                .ToList();
            var method =
                candidates.FirstOrDefault(static candidate => candidate.ExplicitInterfaceSpecifier is not null)
                ?? candidates.FirstOrDefault();
            if (method is null || !handled.Add(method))
            {
                continue;
            }

            found = true;
            var isExplicit = method.ExplicitInterfaceSpecifier is not null;
            var definitions = methods
                .Where(other =>
                    other.Identifier.ValueText == "Define" + phase
                    && other.ParameterList.Parameters.Count == 1
                    && SimpleName(other.ParameterList.Parameters[0].Type) == BuilderName
                )
                .ToList();
            var hasDefinition = definitions.Any(IsImplementation);
            if (!hasDefinition && definitions.Count > 0)
            {
                messages.Todo(NotAnImplementation(file, method, phase));
                continue;
            }
            if (
                Decide(
                    file,
                    method,
                    phase,
                    hasDefinition,
                    isExplicit,
                    candidates.Count > 1,
                    reservedNames,
                    "",
                    messages
                ) is
                { } rewrite
            )
            {
                yield return rewrite;
            }
        }

        if (!found && onlyPhase is null && MayInheritMethods(type))
        {
            messages.Todo(
                $"{Location(file, type)}: {type.Identifier.Text} lists {InterfaceName} but declares none of Start, End "
                    + "and Abandon, so a base class may hold them, which cannot be followed without a compilation of "
                    + "the app. If it does, give the task a DefineStart, DefineEnd or DefineAbandon that runs that work "
                    + "as stages."
            );
        }
    }

    /// <summary>What becomes of one v8 method, and the message that says so.</summary>
    private static Rewrite? Decide(
        ScannedCSharpFile file,
        MethodDeclarationSyntax method,
        string phase,
        bool hasDefinition,
        bool isExplicit,
        bool collides,
        IReadOnlySet<string> reservedNames,
        string inherited,
        List<UpgradeMessage> messages
    )
    {
        var location = $"{Location(file, method)}: {MemberName(method)}";
        var definitionName = "Define" + phase;
        var callName = phase;
        if (collides)
        {
            callName = "Run" + phase;
            if (reservedNames.Contains(callName))
            {
                messages.Todo(
                    $"{location}(string taskId, Instance instance) is an explicit implementation of a member v9 "
                        + $"{InterfaceName} does not have, beside a method of the same signature, and the name "
                        + $"{callName} is taken too. Fold the two together by hand and compose the work with "
                        + $"{definitionName}."
                );
                return null;
            }
        }

        if (hasDefinition)
        {
            messages.Warn(
                $"{location}(string taskId, Instance instance) is no longer part of {InterfaceName}, and the app "
                    + $"libraries do not call it: the task composes {definitionName}, which runs instead."
                    + (isExplicit ? $" It stays as the type's own private {callName}." : "")
            );
            return isExplicit
                ? new Rewrite(file, method, phase, callName, AddDefinition: false, ToPrivate: true)
                : null;
        }

        messages.Warn(
            $"{location}(string taskId, Instance instance) is no longer part of {InterfaceName}; v9 runs the stages "
                + $"{definitionName} composes. Added a {definitionName} that runs {callName} as one stage.{inherited} "
                + "Split the work into stages that are saved and retried on their own, and read and change instance "
                + "data through context.InstanceDataMutator."
        );
        return new Rewrite(file, method, phase, callName, AddDefinition: true, ToPrivate: isExplicit);
    }

    /// <summary>
    /// The <c>Define</c> member that runs the v8 method as the phase's one stage, laid out below the method with its
    /// indentation. The task id is the instance's current task: for a start that is the task being entered, since
    /// the process state is moved in memory before the start stages run, and for an end or abandon the task being
    /// left. The type references are emitted qualified for the final pass against the upgraded project to simplify.
    /// </summary>
    private static MemberDeclarationSyntax Definition(string phase, string callName, MethodDeclarationSyntax method)
    {
        var indent = Indentation(method);
        var text = $$"""

            {{indent}}public global::{{PipelineTypeName}} Define{{phase}}(global::{{BuilderTypeName}} pipeline) =>
            {{indent}}    pipeline
            {{indent}}        .Stage(async context =>
            {{indent}}        {
            {{indent}}            await {{callName}}(
            {{indent}}                context.InstanceDataMutator.Instance.Process?.CurrentTask?.ElementId
            {{indent}}                    ?? throw new System.InvalidOperationException("The instance has no current task."),
            {{indent}}                context.InstanceDataMutator.Instance
            {{indent}}            );
            {{indent}}            return global::{{StageResultTypeName}}.Completed();
            {{indent}}        })
            {{indent}}        .Build();

            """;
        var member =
            SyntaxFactory.ParseMemberDeclaration(text)
            ?? throw new InvalidOperationException("The generated lifecycle definition did not parse.");
        return member.ReplaceNodes(
            member
                .DescendantNodes()
                .OfType<NameSyntax>()
                .Where(static name =>
                    name.Parent is not NameSyntax
                    && name.ToString()
                        is "global::" + PipelineTypeName
                            or "global::" + BuilderTypeName
                            or "global::" + StageResultTypeName
                ),
            static (original, _) =>
                GeneratedTypeReferenceFinalizer
                    .Reference(original.ToString()["global::".Length..])
                    .WithTriviaFrom(original)
        );
    }

    /// <summary>
    /// The explicit implementation as the type's own private method, under <paramref name="name"/>: v9 has no
    /// member for it to implement. The leading trivia, a doc comment included, moves from the return type to the
    /// new modifier.
    /// </summary>
    private static MethodDeclarationSyntax MakePrivate(MethodDeclarationSyntax method, string name)
    {
        var leading = method.GetLeadingTrivia();
        var modifiers = SyntaxFactory.TokenList(
            SyntaxFactory
                .Token(SyntaxKind.PrivateKeyword)
                .WithLeadingTrivia(leading)
                .WithTrailingTrivia(SyntaxFactory.Space)
        );
        return method
            .WithExplicitInterfaceSpecifier(null)
            .WithReturnType(method.ReturnType.WithoutLeadingTrivia())
            .WithModifiers(modifiers)
            .WithIdentifier(SyntaxFactory.Identifier(name).WithTriviaFrom(method.Identifier));
    }

    /// <summary>The whitespace the method's first token is indented with, so the new member lines up with it.</summary>
    private static string Indentation(MethodDeclarationSyntax method) =>
        method.GetLeadingTrivia().LastOrDefault(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia)).ToString();

    /// <summary>
    /// Whether the member can implement the v9 interface member: a public instance method, or an explicit
    /// implementation of the Altinn interface. A private or static helper of that signature cannot, and a generated
    /// public one would collide with it.
    /// </summary>
    private static bool IsImplementation(IMethodSymbol definition) =>
        definition.ExplicitInterfaceImplementations.Any(static member => IsSdkProcessTask(member.ContainingType))
        || (definition.DeclaredAccessibility == Accessibility.Public && !definition.IsStatic);

    private static bool IsImplementation(MethodDeclarationSyntax definition) =>
        definition.ExplicitInterfaceSpecifier is { } explicitInterface
            ? SimpleName(explicitInterface.Name) == InterfaceName
            : definition.Modifiers.Any(SyntaxKind.PublicKeyword) && !definition.Modifiers.Any(SyntaxKind.StaticKeyword);

    private static string NotAnImplementation(ScannedCSharpFile file, MethodDeclarationSyntax method, string phase) =>
        $"{Location(file, method)}: {MemberName(method)}(string taskId, Instance instance) is no longer part of "
        + $"{InterfaceName}, and the type's Define{phase}({BuilderName}) cannot take its place: v9 calls only a public "
        + $"instance method of that signature, or an explicit implementation. Make it one, and run the {phase} work "
        + "from it.";

    private static bool IsSdkProcessTask(INamedTypeSymbol contract) =>
        contract.Name == InterfaceName
        && contract.ContainingNamespace.ToDisplayString() == InterfaceNamespace
        && CSharpSemanticQueries.IsAltinnAppSymbol(contract);

    private static IEnumerable<INamedTypeSymbol> BaseTypes(INamedTypeSymbol type)
    {
        for (var current = type; current is not null; current = current.BaseType)
        {
            yield return current;
        }
    }

    private static bool SameParameterTypes(IMethodSymbol a, IMethodSymbol b) =>
        a.Parameters.Length == b.Parameters.Length
        && a.Parameters.Zip(b.Parameters)
            .All(pair => SymbolEqualityComparer.Default.Equals(pair.First.Type, pair.Second.Type));

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

    private static bool ListsInterface(TypeDeclarationSyntax type) =>
        (type.BaseList?.Types ?? default).Any(static baseType => SimpleName(baseType.Type) == InterfaceName);

    /// <summary>Whether the base list names something that is not written like an interface, so may be a base class.</summary>
    private static bool MayInheritMethods(TypeDeclarationSyntax type) =>
        (type.BaseList?.Types ?? default).Any(static baseType =>
            SimpleName(baseType.Type) is { } name && !(name.Length > 1 && name[0] == 'I' && char.IsUpper(name[1]))
        );

    private static string Location(ScannedCSharpFile file, SyntaxNode node) =>
        $"{file.RelativePath}:{file.GetLine(node)}";

    private static string MemberName(MethodDeclarationSyntax method) =>
        method.Parent is TypeDeclarationSyntax type
            ? $"{type.Identifier.Text}.{method.Identifier.Text}"
            : method.Identifier.Text;

    private static string? MemberName(MemberDeclarationSyntax member) =>
        member switch
        {
            MethodDeclarationSyntax method => method.Identifier.ValueText,
            PropertyDeclarationSyntax property => property.Identifier.ValueText,
            FieldDeclarationSyntax field => field.Declaration.Variables.FirstOrDefault()?.Identifier.ValueText,
            EventDeclarationSyntax @event => @event.Identifier.ValueText,
            BaseTypeDeclarationSyntax type => type.Identifier.ValueText,
            _ => null,
        };

    /// <summary>Whether the method's parameters have exactly the given simple type names, in order.</summary>
    private static bool HasParameterTypes(MethodDeclarationSyntax method, string[] typeNames)
    {
        var parameters = method.ParameterList.Parameters;
        return parameters.Count == typeNames.Length
            && parameters.Zip(typeNames).All(pair => SimpleName(pair.First.Type) == pair.Second);
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
            PredefinedTypeSyntax predefined => predefined.Keyword.Text,
            _ => null,
        };
}
