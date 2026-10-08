using System.Xml.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the two eFormidling interfaces apps implement, which take the instance's data accessor
/// instead of the instance in v9: <c>IEFormidlingMetadata.GenerateEFormidlingMetadata(Instance)</c> and
/// <c>IEFormidlingReceivers.GetEFormidlingReceivers(Instance)</c>. v9 also folds the receivers' two v8 overloads
/// into one with a <c>string? receiverFromConfig</c> parameter (the receiver org number configured on the
/// eFormidling BPMN service task). An app implementing the v8 shape no longer satisfies the interface (CS0535).
/// The fix is mechanical, so it is applied: the parameter becomes <c>IInstanceDataAccessor dataAccessor</c>, and
/// the method reads the instance into a local under the old parameter's name
/// (<c>var instance = dataAccessor.Instance;</c>), so the body compiles and behaves as before.
/// </summary>
/// <remarks>
/// <p>With a semantic model the implementations are resolved exactly: the interfaces by their full names and each
/// method through <see cref="INamedTypeSymbol.FindImplementationForInterfaceMember"/>, so an app interface or
/// method that happens to share a name is never touched. Without one, a type is an implementation when its own
/// base list names the interface (or a method names it explicitly) and a method matches when its name and
/// parameter types match the v8 shape; a same-named interface declared in the app makes that ambiguous, so such
/// matches are reported instead of rewritten.</p>
/// <p>A type that implements both receivers overloads gets only the two-parameter one rewritten: that is the one
/// the library called, and v9 has no counterpart to the other. Shapes with no mechanical fix are reported for a
/// manual one: a partial, virtual, abstract or overriding method (its other declarations must change too) and a
/// method that already uses the name <c>dataAccessor</c>. Calls to a rewritten method in app code are reported
/// too, since they pass an instance where v9 takes the data accessor.</p>
/// <p>This runs before the eFormidling namespace rewrite: that rewrite moves the receivers' <c>Receiver</c> type
/// to a namespace the v8 compilation cannot bind, which would hide the implementations from the semantic
/// lookup.</p>
/// </remarks>
internal sealed class EFormidlingHookSignatureMigration
{
    private const string InterfaceNamespace = "Altinn.App.Core.EFormidling.Interface";
    private const string MetadataInterfaceName = "IEFormidlingMetadata";
    private const string MetadataMethodName = "GenerateEFormidlingMetadata";
    private const string ReceiversInterfaceName = "IEFormidlingReceivers";
    private const string ReceiversMethodName = "GetEFormidlingReceivers";
    private const string InstanceTypeName = "Instance";
    private const string AccessorTypeName = "Altinn.App.Core.Features.IInstanceDataAccessor";
    private const string AccessorParameterName = "dataAccessor";
    private const string ReceiverParameterName = "receiverFromConfig";

    /// <summary>The interface each changed method belongs to.</summary>
    private static readonly IReadOnlyDictionary<string, string> _interfaceByMethod = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        [MetadataMethodName] = MetadataInterfaceName,
        [ReceiversMethodName] = ReceiversInterfaceName,
    };

    /// <summary>
    /// A method declaration to rewrite. <paramref name="AddsReceiverParameter"/> is set for the single-parameter
    /// receivers overload, which gains the <c>receiverFromConfig</c> parameter.
    /// </summary>
    private sealed record Rewrite(
        ScannedCSharpFile File,
        MethodDeclarationSyntax Method,
        string InterfaceName,
        bool AddsReceiverParameter
    );

    private readonly CSharpSourceScanner _scanner;
    private readonly bool _projectNullableAnnotationsEnabled;

    public EFormidlingHookSignatureMigration(CSharpSourceScanner scanner, bool projectNullableAnnotationsEnabled)
    {
        _scanner = scanner;
        _projectNullableAnnotationsEnabled = projectNullableAnnotationsEnabled;
    }

    /// <summary>The interfaces this migration covers, for step summaries.</summary>
    public static IEnumerable<string> InterfaceNames => [MetadataInterfaceName, ReceiversInterfaceName];

    /// <summary>
    /// Whether the project enables nullable reference type <em>annotations</em> (<c>enable</c> or
    /// <c>annotations</c>; <c>warnings</c> enables only the warning context, where <c>string?</c>
    /// would still raise CS8632). Reads the project file first (its properties evaluate after the
    /// auto-imported props and win), then falls back to the nearest <c>Directory.Build.props</c> up
    /// the directory tree - the two places an app realistically sets <c>&lt;Nullable&gt;</c>. This is
    /// not full MSBuild evaluation (conditional property groups and explicit imports are not
    /// followed); per-file <c>#nullable</c> directives override the project default either way.
    /// </summary>
    public static bool ProjectEnablesNullableAnnotations(string projectFile)
    {
        if (ReadNullableProperty(projectFile) is { } fromProject)
        {
            return IsAnnotationsEnabled(fromProject);
        }

        for (
            var directory = Path.GetDirectoryName(Path.GetFullPath(projectFile));
            directory is not null;
            directory = Path.GetDirectoryName(directory)
        )
        {
            var propsFile = Path.Combine(directory, "Directory.Build.props");
            if (File.Exists(propsFile))
            {
                // MSBuild auto-imports only the nearest Directory.Build.props; stop at the first hit.
                return ReadNullableProperty(propsFile) is { } fromProps && IsAnnotationsEnabled(fromProps);
            }
        }

        return false;
    }

    private static string? ReadNullableProperty(string msbuildFile)
    {
        try
        {
            return XDocument.Load(msbuildFile).Descendants("Nullable").LastOrDefault()?.Value.Trim();
        }
        catch (Exception ex) when (ex is System.Xml.XmlException or IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static bool IsAnnotationsEnabled(string nullableValue) =>
        string.Equals(nullableValue, "enable", StringComparison.OrdinalIgnoreCase)
        || string.Equals(nullableValue, "annotations", StringComparison.OrdinalIgnoreCase);

    public MigrationResult Migrate(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var messages = new List<UpgradeMessage>();
        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        var files = _scanner.Files.ToArray();

        // Find everything before rewriting anything: an update refreshes the semantic models, and symbols
        // bound before the refresh do not compare equal to symbols bound after it.
        var rewrites = FindSemanticRewrites(files, messages, cancellationToken);
        var appDeclaredInterfaces = files
            .SelectMany(static file => file.Root.DescendantNodes().OfType<InterfaceDeclarationSyntax>())
            .Select(static declaration => declaration.Identifier.Text)
            .Where(static name => name is MetadataInterfaceName or ReceiversInterfaceName)
            .ToHashSet(StringComparer.Ordinal);
        foreach (var file in files.Where(static file => file.SemanticModel is null))
        {
            cancellationToken.ThrowIfCancellationRequested();
            rewrites.AddRange(FindSyntacticRewrites(file, appDeclaredInterfaces, messages));
        }

        ReportSyntacticCalls(files, rewrites, messages);

        foreach (var fileRewrites in rewrites.GroupBy(static rewrite => rewrite.File))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var file = fileRewrites.Key;
            var byMethod = fileRewrites.ToDictionary(static rewrite => rewrite.Method);
            var lineEnding = LineEnding(file.Root);
            foreach (var rewrite in fileRewrites)
            {
                messages.Warn(RewriteMessage(rewrite));
            }

            var updatedRoot = file.Root.ReplaceNodes(
                byMethod.Keys,
                (original, _) =>
                    RewriteMethod(
                        original,
                        byMethod[original].AddsReceiverParameter,
                        NullableAnnotationsActiveAt(file.Root, original, _projectNullableAnnotationsEnabled),
                        lineEnding
                    )
            );
            _scanner.Update(file, updatedRoot);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The implementations of the changed interface members in files that carry a semantic model, resolved through
    /// the compilation, along with a to-do for every call that binds to one of them or to the v8 interface member.
    /// </summary>
    private static List<Rewrite> FindSemanticRewrites(
        ScannedCSharpFile[] files,
        List<UpgradeMessage> messages,
        CancellationToken cancellationToken
    )
    {
        var filesByTree = files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        var implementations = new Dictionary<IMethodSymbol, string>(SymbolEqualityComparer.Default);

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

                foreach (var member in type.AllInterfaces.Where(IsChangedInterface).SelectMany(V8Members))
                {
                    // A default interface method (the v8 two-parameter receivers overload) implements itself.
                    if (
                        type.FindImplementationForInterfaceMember(member) is IMethodSymbol implementation
                        && implementation.ContainingType.TypeKind != TypeKind.Interface
                    )
                    {
                        implementations.TryAdd(implementation, member.ContainingType.Name);
                    }
                }
            }
        }

        var rewrites = new List<Rewrite>();
        var rewritten = new HashSet<IMethodSymbol>(SymbolEqualityComparer.Default);
        foreach (var (implementation, interfaceName) in implementations)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (Locate(implementation, filesByTree) is not { } located)
            {
                // Inherited from a library type. The Altinn one (DefaultEFormidlingReceivers) is internal in v9 and
                // reported by the internalized type detector; anything else is out of this upgrade's reach.
                if (!CSharpSemanticQueries.IsAltinnAppSymbol(implementation))
                {
                    messages.Todo(
                        $"{implementation.ContainingType.Name}.{implementation.Name} implements the v9 {interfaceName} "
                            + "outside the app's source and could not be updated; the app needs its own implementation "
                            + $"that takes '{AccessorTypeName} {AccessorParameterName}'."
                    );
                }

                continue;
            }

            var (file, method) = located;
            var isSingleParameterReceivers =
                interfaceName == ReceiversInterfaceName && implementation.Parameters.Length == 1;
            if (isSingleParameterReceivers && HasTwoParameterReceivers(implementation.ContainingType, implementations))
            {
                messages.Warn(UnusedOverloadMessage(file, method));
                continue;
            }

            if (ManualFixReason(method) is { } reason)
            {
                messages.Todo(ManualFixMessage(file, method, interfaceName, reason));
                continue;
            }

            rewrites.Add(new Rewrite(file, method, interfaceName, isSingleParameterReceivers));
            rewritten.Add(implementation);
        }

        ReportSemanticCalls(files, rewritten, messages, cancellationToken);
        return rewrites;
    }

    private static bool IsChangedInterface(INamedTypeSymbol contract) =>
        contract.Name is MetadataInterfaceName or ReceiversInterfaceName
        && contract.ContainingNamespace.ToDisplayString() == InterfaceNamespace
        && CSharpSemanticQueries.IsAltinnAppSymbol(contract);

    /// <summary>The interface's members in their v8 shape: the changed method, taking the instance first.</summary>
    private static IEnumerable<IMethodSymbol> V8Members(INamedTypeSymbol contract) =>
        contract
            .GetMembers()
            .OfType<IMethodSymbol>()
            .Where(static member =>
                _interfaceByMethod.ContainsKey(member.Name)
                && member.Parameters.Length > 0
                && member.Parameters[0].Type.Name == InstanceTypeName
            );

    private static bool HasTwoParameterReceivers(
        INamedTypeSymbol type,
        IReadOnlyDictionary<IMethodSymbol, string> implementations
    ) =>
        implementations.Keys.Any(other =>
            other.Name == ReceiversMethodName
            && other.Parameters.Length == 2
            && SymbolEqualityComparer.Default.Equals(other.ContainingType, type)
        );

    /// <summary>
    /// Calls that bind to a rewritten method or to a v8 interface member: both pass an instance where v9 takes the
    /// data accessor, and neither can be rewritten without knowing where the caller gets one.
    /// </summary>
    private static void ReportSemanticCalls(
        ScannedCSharpFile[] files,
        IReadOnlySet<IMethodSymbol> rewritten,
        List<UpgradeMessage> messages,
        CancellationToken cancellationToken
    )
    {
        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (file.SemanticModel is not { } semanticModel)
            {
                continue;
            }

            foreach (var name in file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
            {
                if (!_interfaceByMethod.TryGetValue(name.Identifier.ValueText, out var interfaceName))
                {
                    continue;
                }

                var expression = UsageExpression(name);
                if (
                    expression is not null
                    && semanticModel.GetSymbolInfo(expression, cancellationToken).Symbol is IMethodSymbol method
                    && (
                        rewritten.Contains(method.OriginalDefinition)
                        || (
                            IsChangedInterface(method.ContainingType)
                            && V8Members(method.ContainingType)
                                .Contains(method.OriginalDefinition, SymbolEqualityComparer.Default)
                        )
                    )
                )
                {
                    messages.Todo(CallMessage(file, expression, interfaceName));
                }
            }
        }
    }

    /// <summary>
    /// The syntax fallback's view of the same calls: invocations, in files without a semantic model, of a rewritten
    /// method's name with the number of arguments it had before.
    /// </summary>
    private static void ReportSyntacticCalls(
        ScannedCSharpFile[] files,
        IReadOnlyList<Rewrite> rewrites,
        List<UpgradeMessage> messages
    )
    {
        var rewrittenArities = rewrites
            .Select(static rewrite =>
                (rewrite.Method.Identifier.ValueText, rewrite.Method.ParameterList.Parameters.Count)
            )
            .ToHashSet();
        if (rewrittenArities.Count == 0)
        {
            return;
        }

        foreach (var file in files.Where(static file => file.SemanticModel is null))
        {
            foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (
                    CSharpSemanticQueries.InvokedName(invocation) is { } name
                    && rewrittenArities.Contains((name.Identifier.ValueText, invocation.ArgumentList.Arguments.Count))
                )
                {
                    messages.Todo(
                        CallMessage(file, invocation.Expression, _interfaceByMethod[name.Identifier.ValueText])
                    );
                }
            }
        }
    }

    /// <summary>
    /// The expression a method name is used through: the member access around it, or the name itself. <c>null</c>
    /// for a <c>nameof</c> operand, which keeps compiling whatever the parameters are.
    /// </summary>
    private static ExpressionSyntax? UsageExpression(SimpleNameSyntax name)
    {
        ExpressionSyntax expression = name.Parent switch
        {
            MemberAccessExpressionSyntax member when member.Name == name => member,
            MemberBindingExpressionSyntax member when member.Name == name => member,
            _ => name,
        };
        var isNameofOperand = expression
            .Ancestors()
            .OfType<InvocationExpressionSyntax>()
            .Any(static ancestor => ancestor.Expression is IdentifierNameSyntax { Identifier.ValueText: "nameof" });
        return isNameofOperand ? null : expression;
    }

    /// <summary>
    /// The syntax fallback for a file without a semantic model: the changed methods, by v8 name and parameter types,
    /// on types whose own base list names the changed interface (or explicit implementations naming it).
    /// </summary>
    private static IEnumerable<Rewrite> FindSyntacticRewrites(
        ScannedCSharpFile file,
        IReadOnlySet<string> appDeclaredInterfaces,
        List<UpgradeMessage> messages
    )
    {
        foreach (var type in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            var baseNames = (type.BaseList?.Types ?? default)
                .Select(static baseType => SimpleName(baseType.Type))
                .OfType<string>()
                .ToHashSet(StringComparer.Ordinal);
            var candidates = type
                .Members.OfType<MethodDeclarationSyntax>()
                .Where(method =>
                    _interfaceByMethod.TryGetValue(method.Identifier.ValueText, out var interfaceName)
                    && (
                        SimpleName(method.ExplicitInterfaceSpecifier?.Name) == interfaceName
                        || method.ExplicitInterfaceSpecifier is null && baseNames.Contains(interfaceName)
                    )
                    && HasV8Parameters(method)
                )
                .ToList();
            var hasTwoParameterReceivers = candidates.Any(static method =>
                method.Identifier.ValueText == ReceiversMethodName && method.ParameterList.Parameters.Count == 2
            );

            foreach (var method in candidates)
            {
                var interfaceName = _interfaceByMethod[method.Identifier.ValueText];
                var isSingleParameterReceivers =
                    interfaceName == ReceiversInterfaceName && method.ParameterList.Parameters.Count == 1;
                if (isSingleParameterReceivers && hasTwoParameterReceivers)
                {
                    messages.Warn(UnusedOverloadMessage(file, method));
                    continue;
                }

                if (appDeclaredInterfaces.Contains(interfaceName))
                {
                    messages.Todo(
                        $"{Location(file, method)} may implement the v9 {interfaceName} or the app's own interface of "
                            + "that name, which cannot be told apart without a compilation of the app. If it implements "
                            + $"the Altinn one, change its first parameter to '{AccessorTypeName} {AccessorParameterName}' "
                            + "by hand."
                    );
                    continue;
                }

                if (ManualFixReason(method) is { } reason)
                {
                    messages.Todo(ManualFixMessage(file, method, interfaceName, reason));
                    continue;
                }

                yield return new Rewrite(file, method, interfaceName, isSingleParameterReceivers);
            }
        }
    }

    /// <summary>
    /// Whether the method has the v8 parameters of its interface: the instance alone, or, for the receivers, the
    /// instance and the configured receiver.
    /// </summary>
    private static bool HasV8Parameters(MethodDeclarationSyntax method)
    {
        var parameters = method.ParameterList.Parameters;
        if (parameters.Count == 0 || SimpleName(parameters[0].Type) != InstanceTypeName)
        {
            return false;
        }

        return parameters.Count == 1
            || (
                parameters.Count == 2
                && method.Identifier.ValueText == ReceiversMethodName
                && SimpleName(parameters[1].Type) is "string" or "String"
            );
    }

    /// <summary>Why the method needs a manual fix, or <c>null</c> when it can be rewritten.</summary>
    private static string? ManualFixReason(MethodDeclarationSyntax method)
    {
        if (method.Modifiers.Any(SyntaxKind.PartialKeyword))
        {
            return "is a partial method, and both of its declarations must change";
        }

        if (
            method.Modifiers.Any(SyntaxKind.VirtualKeyword)
            || method.Modifiers.Any(SyntaxKind.AbstractKeyword)
            || method.Modifiers.Any(SyntaxKind.OverrideKeyword)
        )
        {
            return "is virtual, abstract or an override, and the methods it overrides or is overridden by must change with it";
        }

        return UsesIdentifier(method, AccessorParameterName)
            ? $"already uses the name '{AccessorParameterName}'"
            : null;
    }

    private static string ManualFixMessage(
        ScannedCSharpFile file,
        MethodDeclarationSyntax method,
        string interfaceName,
        string reason
    ) =>
        $"{Location(file, method)} {reason}, so it was not rewritten. Change its first parameter to "
        + $"'{AccessorTypeName} {AccessorParameterName}' by hand, as the v9 {interfaceName} requires, and read the "
        + $"instance from {AccessorParameterName}.Instance.";

    private static string RewriteMessage(Rewrite rewrite)
    {
        var location = Location(rewrite.File, rewrite.Method);
        var instanceNote =
            $"The method reads the instance from {AccessorParameterName}.Instance, so the rest of its body is unchanged.";
        return rewrite.AddsReceiverParameter
            ? $"{location}: changed the parameters to '{AccessorTypeName} {AccessorParameterName}, string? "
                + $"{ReceiverParameterName}' for the v9 {rewrite.InterfaceName}. {instanceNote} Review whether the "
                + $"implementation should use {ReceiverParameterName} (the receiver org number configured on the "
                + "eFormidling service task) instead of ignoring it."
            : $"{location}: changed the first parameter to '{AccessorTypeName} {AccessorParameterName}' for the v9 "
                + $"{rewrite.InterfaceName}. {instanceNote}";
    }

    private static string UnusedOverloadMessage(ScannedCSharpFile file, MethodDeclarationSyntax method) =>
        $"{Location(file, method)}: the v9 {ReceiversInterfaceName} only has the overload with "
        + $"'{ReceiverParameterName}', which was migrated instead, so this one is no longer called by the library. "
        + "Remove it unless the app calls it itself.";

    private static string CallMessage(ScannedCSharpFile file, SyntaxNode usage, string interfaceName)
    {
        var method = usage switch
        {
            MemberAccessExpressionSyntax member => member.Name.Identifier.ValueText,
            MemberBindingExpressionSyntax member => member.Name.Identifier.ValueText,
            _ => usage.ToString(),
        };
        return $"{file.RelativePath}:{file.GetLine(usage)}: {method} takes '{AccessorTypeName}' instead of an instance "
            + $"in the v9 {interfaceName}. Update this call by hand.";
    }

    private static string Location(ScannedCSharpFile file, MethodDeclarationSyntax method) =>
        $"{file.RelativePath}:{file.GetLine(method)}: {MemberName(method)}";

    private static string MemberName(MethodDeclarationSyntax method) =>
        method.Parent is TypeDeclarationSyntax type
            ? $"{type.Identifier.Text}.{method.Identifier.Text}"
            : method.Identifier.Text;

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
    /// The method with its first parameter replaced by the data accessor, the receiver parameter appended where
    /// the v8 overload lacked it, and the instance read into a local under the old parameter's name wherever the
    /// body refers to that name.
    /// </summary>
    private static MethodDeclarationSyntax RewriteMethod(
        MethodDeclarationSyntax method,
        bool addReceiverParameter,
        bool nullableAnnotations,
        string lineEnding
    )
    {
        var oldParameter = method.ParameterList.Parameters[0];
        var oldName = oldParameter.Identifier.ValueText;
        if (oldName != "_" && BodyUses(method, oldName))
        {
            method = WithInstanceLocal(method, oldParameter.Identifier.Text, lineEnding);
        }

        var accessorType = GeneratedTypeReferenceFinalizer.Reference(AccessorTypeName);
        if (oldParameter.Type is { } oldType)
        {
            accessorType = accessorType.WithTriviaFrom(oldType);
        }

        var accessorParameter = method
            .ParameterList.Parameters[0]
            .WithType(accessorType)
            .WithIdentifier(SyntaxFactory.Identifier(AccessorParameterName).WithTriviaFrom(oldParameter.Identifier));
        var parameterList = method.ParameterList.ReplaceNode(method.ParameterList.Parameters[0], accessorParameter);
        if (addReceiverParameter)
        {
            var receiverParameter = SyntaxFactory
                .Parameter(SyntaxFactory.Identifier(ReceiverParameterName))
                .WithType(
                    SyntaxFactory
                        .ParseTypeName(nullableAnnotations ? "string?" : "string")
                        .WithTrailingTrivia(SyntaxFactory.Space)
                )
                .WithLeadingTrivia(SyntaxFactory.Space);
            parameterList = parameterList.AddParameters(receiverParameter);
        }

        return method.WithParameterList(parameterList);
    }

    private static bool BodyUses(MethodDeclarationSyntax method, string identifier) =>
        ((SyntaxNode?)method.Body ?? method.ExpressionBody) is { } body
        && body.DescendantTokens()
            .Any(token => token.IsKind(SyntaxKind.IdentifierToken) && token.ValueText == identifier);

    /// <summary>
    /// The method with <c>var {name} = dataAccessor.Instance;</c> as its first statement. An expression body becomes
    /// a block that declares the local and then returns (or throws) the expression.
    /// </summary>
    private static MethodDeclarationSyntax WithInstanceLocal(
        MethodDeclarationSyntax method,
        string name,
        string lineEnding
    )
    {
        var local = SyntaxFactory.ParseStatement($"var {name} = {AccessorParameterName}.Instance;");
        if (method.Body is { } body)
        {
            var first = body.Statements[0];
            var indentation = first.GetLeadingTrivia().LastOrDefault(static t => t.IsKind(SyntaxKind.WhitespaceTrivia));
            var onItsOwnLine =
                body.OpenBraceToken.TrailingTrivia.Any(SyntaxKind.EndOfLineTrivia)
                || first.GetLeadingTrivia().Any(SyntaxKind.EndOfLineTrivia);
            local = local
                .WithLeadingTrivia(
                    indentation == default ? SyntaxFactory.TriviaList() : SyntaxFactory.TriviaList(indentation)
                )
                .WithTrailingTrivia(
                    onItsOwnLine
                        ? SyntaxFactory.TriviaList(SyntaxFactory.EndOfLine(lineEnding))
                        : SyntaxFactory.TriviaList()
                );
            return method.WithBody(body.WithStatements(body.Statements.Insert(0, local)));
        }

        if (method.ExpressionBody is not { } arrow)
        {
            return method;
        }

        var methodIndentation = Indentation(method);
        var bodyIndentation = methodIndentation + (methodIndentation.Contains('\t') ? "\t" : "    ");
        var semicolon = SyntaxFactory.Token(SyntaxKind.SemicolonToken);
        StatementSyntax result = arrow.Expression is ThrowExpressionSyntax thrown
            ? SyntaxFactory.ThrowStatement(
                SyntaxFactory.Token(SyntaxKind.ThrowKeyword).WithTrailingTrivia(SyntaxFactory.Space),
                thrown.Expression.WithoutLeadingTrivia(),
                semicolon
            )
            : SyntaxFactory.ReturnStatement(
                SyntaxFactory.Token(SyntaxKind.ReturnKeyword).WithTrailingTrivia(SyntaxFactory.Space),
                arrow.Expression.WithoutLeadingTrivia(),
                semicolon
            );
        var statements = new[] { local, result }.Select(statement =>
            statement
                .WithLeadingTrivia(SyntaxFactory.Whitespace(bodyIndentation))
                .WithTrailingTrivia(SyntaxFactory.EndOfLine(lineEnding))
        );
        var block = SyntaxFactory.Block(
            SyntaxFactory.Token(
                SyntaxFactory.TriviaList(
                    SyntaxFactory.EndOfLine(lineEnding),
                    SyntaxFactory.Whitespace(methodIndentation)
                ),
                SyntaxKind.OpenBraceToken,
                SyntaxFactory.TriviaList(SyntaxFactory.EndOfLine(lineEnding))
            ),
            SyntaxFactory.List(statements),
            SyntaxFactory.Token(
                SyntaxFactory.TriviaList(SyntaxFactory.Whitespace(methodIndentation)),
                SyntaxKind.CloseBraceToken,
                method.SemicolonToken.TrailingTrivia
            )
        );

        // Whatever separated the signature from the arrow goes; the block starts on a line of its own.
        var beforeArrow = arrow.ArrowToken.GetPreviousToken();
        var trimmed = method.ReplaceToken(
            beforeArrow,
            beforeArrow.WithTrailingTrivia(
                beforeArrow
                    .TrailingTrivia.Reverse()
                    .SkipWhile(static t =>
                        t.IsKind(SyntaxKind.WhitespaceTrivia) || t.IsKind(SyntaxKind.EndOfLineTrivia)
                    )
                    .Reverse()
            )
        );
        return trimmed.WithExpressionBody(null).WithSemicolonToken(default).WithBody(block);
    }

    /// <summary>The whitespace that starts the line the method's first token is on.</summary>
    private static string Indentation(MethodDeclarationSyntax method) =>
        method
            .GetLeadingTrivia()
            .Reverse()
            .TakeWhile(static t => !t.IsKind(SyntaxKind.EndOfLineTrivia))
            .LastOrDefault(static t => t.IsKind(SyntaxKind.WhitespaceTrivia))
            .ToString();

    /// <summary>The file's line ending, so inserted lines match the lines around them.</summary>
    private static string LineEnding(CompilationUnitSyntax root) =>
        root.DescendantTrivia().FirstOrDefault(static t => t.IsKind(SyntaxKind.EndOfLineTrivia)).ToString()
            is { Length: > 0 } ending
            ? ending
            : "\n";

    /// <summary>Whether the identifier occurs anywhere in the method: a parameter, local, lambda parameter, or a use of an outer member.</summary>
    private static bool UsesIdentifier(MethodDeclarationSyntax method, string identifier) =>
        method
            .DescendantTokens()
            .Any(token => token.IsKind(SyntaxKind.IdentifierToken) && token.ValueText == identifier);

    /// <summary>
    /// Syntactic approximation of the nullable annotation context at <paramref name="method"/>: the
    /// last preceding <c>#nullable</c> directive targeting annotations wins; without one, the
    /// project-level default applies.
    /// </summary>
    private static bool NullableAnnotationsActiveAt(
        CompilationUnitSyntax root,
        MethodDeclarationSyntax method,
        bool projectDefault
    )
    {
        var lastDirective = root.DescendantNodes(descendIntoTrivia: true)
            .OfType<NullableDirectiveTriviaSyntax>()
            .LastOrDefault(directive =>
                directive.SpanStart < method.SpanStart
                && (
                    directive.TargetToken.IsKind(SyntaxKind.None)
                    || directive.TargetToken.IsKind(SyntaxKind.AnnotationsKeyword)
                )
            );

        return lastDirective?.SettingToken.Kind() switch
        {
            SyntaxKind.EnableKeyword => true,
            SyntaxKind.DisableKeyword => false,
            _ => projectDefault, // no directive, or `restore` back to the project default
        };
    }

    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            PredefinedTypeSyntax predefined => predefined.Keyword.Text,
            NullableTypeSyntax nullable => SimpleName(nullable.ElementType),
            _ => null,
        };
}
