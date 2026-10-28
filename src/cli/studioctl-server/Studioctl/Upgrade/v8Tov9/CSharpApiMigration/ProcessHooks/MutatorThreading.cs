using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>How a helper gets the mutator, by parameter position, which an interface and its implementations share.</summary>
/// <param name="Instance">
/// The position of the <c>Instance</c> parameter that becomes the mutator, when every caller passes the current
/// instance; otherwise the mutator is a new first parameter.
/// </param>
/// <param name="Removed">Positions of client parameters nothing uses any more, which go with their arguments.</param>
internal sealed record Threading(int? Instance, IReadOnlyList<int> Removed);

/// <summary>
/// The methods that change signature together: an app method, and when it implements members of the app's own
/// interfaces, those members and every implementation of them in the app.
/// </summary>
internal sealed record MethodFamily(
    IReadOnlyList<IMethodSymbol> Implementations,
    IReadOnlyList<IMethodSymbol> InterfaceMembers
);

/// <summary>
/// H-HELPER: the mutator belongs to one transition, so a helper gets it as a parameter, never as a field: the
/// hook's instance parameter turns into it when every call passes the current instance, otherwise it is inserted
/// first, and every call site passes the caller's mutator. An app interface member changes with all its
/// implementations. Only methods the transition alone calls get it; a helper also called from elsewhere keeps its
/// Storage calls, with a to-do.
/// </summary>
internal static class MutatorThreading
{
    private const string Mutator = "Altinn.App.Core.Features.IInstanceDataMutator";

    /// <summary>
    /// Why <paramref name="method"/> cannot get the mutator as a parameter, in the words of the to-do; <c>null</c>
    /// when it can.
    /// </summary>
    public static string? Unthreadable(
        IMethodSymbol method,
        WindowReach reach,
        Func<IMethodSymbol, bool> isWindowOnly,
        IReadOnlyList<CallSite> callers
    )
    {
        if (callers.Any(static site => site.IsDelegate))
        {
            return "it is used as a delegate, which the upgrade does not follow";
        }

        if (method.MethodKind is not (MethodKind.Ordinary or MethodKind.ExplicitInterfaceImplementation))
        {
            return "it is not a method that can take another parameter";
        }

        if (method.IsExtensionMethod)
        {
            return "it is an extension method";
        }

        if (method.IsVirtual || method.IsAbstract || method.IsOverride || ImplementsForeignMember(method, reach))
        {
            return "it implements or overrides a member outside the app's own interfaces, which must change with it";
        }

        if (
            reach.Body(method)?.Declaration is not MethodDeclarationSyntax declaration
            || declaration.Modifiers.Any(SyntaxKind.PartialKeyword)
        )
        {
            return "it is not a method of the app that the upgrade can change";
        }

        if (CreatedWithInstance(method, reach) is { } creation)
        {
            return $"it gets the instance or a Storage client through its constructor ({creation})";
        }

        return isWindowOnly(method) ? null : "it is called from code that does not run in the process transition";
    }

    /// <summary>The interface members <paramref name="method"/> implements, with whether each is the app's own.</summary>
    private static IEnumerable<(IMethodSymbol Member, bool InApp)> Implemented(
        IMethodSymbol method,
        WindowReach reach
    ) =>
        method
            .ContainingType.AllInterfaces.SelectMany(static contract => contract.GetMembers().OfType<IMethodSymbol>())
            .Where(member =>
                SymbolEqualityComparer.Default.Equals(
                    method.ContainingType.FindImplementationForInterfaceMember(member)?.OriginalDefinition,
                    method
                )
            )
            .Select(member => (member.OriginalDefinition, IsInApp(member.ContainingType, reach)));

    private static bool ImplementsForeignMember(IMethodSymbol method, WindowReach reach) =>
        Implemented(method, reach).Any(static implemented => !implemented.InApp);

    private static bool IsInApp(ISymbol symbol, WindowReach reach) =>
        symbol.DeclaringSyntaxReferences.Any(reference => reach.Compilation.SyntaxTrees.Contains(reference.SyntaxTree));

    /// <summary>The app interface members <paramref name="method"/> implements and every implementation of them.</summary>
    public static MethodFamily Family(IMethodSymbol method, WindowReach reach)
    {
        var members = Implemented(method, reach)
            .Where(static implemented => implemented.InApp)
            .Select(static implemented => implemented.Member)
            .ToList();
        var implementations = new List<IMethodSymbol> { method };
        foreach (var member in members)
        {
            foreach (var type in reach.SourceTypesOf(member.ContainingType))
            {
                if (
                    type.TypeKind != TypeKind.Interface
                    && type.FindImplementationForInterfaceMember(member) is IMethodSymbol implementation
                    && !implementations.Contains(implementation.OriginalDefinition, SymbolEqualityComparer.Default)
                )
                {
                    implementations.Add(implementation.OriginalDefinition);
                }
            }
        }

        return new MethodFamily(implementations, members);
    }

    /// <summary>An object the app creates with <c>new</c>, giving it the instance or a client.</summary>
    private static string? CreatedWithInstance(IMethodSymbol method, WindowReach reach)
    {
        foreach (var constructor in method.ContainingType.InstanceConstructors)
        {
            if (
                !constructor.Parameters.Any(static parameter =>
                    parameter.Type.Name == "Instance" || StorageClientCall.ClientTypeOf(parameter.Type) is not null
                )
            )
            {
                continue;
            }

            if (
                reach
                    .CallersOf(constructor)
                    .FirstOrDefault(static site => site.Operation is IObjectCreationOperation) is
                { } site
            )
            {
                return site.Operation.Syntax.ToString();
            }
        }

        return null;
    }

    /// <summary>
    /// The way a family of methods gets the mutator, given every call of them: their instance parameter when all
    /// callers pass the current instance, and without the client parameters none of them uses any more.
    /// </summary>
    public static Threading Plan(
        IReadOnlyList<IMethodSymbol> family,
        IReadOnlyList<CallSite> callers,
        CurrentInstanceFlow flow,
        IReadOnlyDictionary<IMethodSymbol, MethodRewrite> rewrites
    )
    {
        var method = family[0];
        var instance = method.Parameters.FirstOrDefault(parameter =>
            parameter.Type.ToDisplayString() == "Altinn.Platform.Storage.Interface.Models.Instance"
            && callers.All(site =>
                Argument(site, parameter.Ordinal) is { } argument
                && flow.Evaluate(argument.Value) is { IsCurrent: true, Part: InstancePart.Instance }
            )
        );
        var removed = method.Parameters.Where(parameter =>
            StorageClientCall.ClientTypeOf(parameter.Type) is not null
            && callers.All(site => Argument(site, parameter.Ordinal) is { ArgumentKind: ArgumentKind.Explicit })
            && family.All(member =>
                !rewrites.TryGetValue(member, out var rewrite) || !StillUsed(rewrite, parameter.Ordinal)
            )
        );
        return new Threading(instance?.Ordinal, [.. removed.Select(static parameter => parameter.Ordinal)]);
    }

    /// <summary>Whether code that stays, or that a rewrite reuses, refers to the parameter at <paramref name="ordinal"/>.</summary>
    public static bool StillUsed(MethodRewrite rewrite, int ordinal) =>
        rewrite
            .Body.Operation.DescendantsAndSelf()
            .OfType<IParameterReferenceOperation>()
            .Any(reference =>
                reference.Parameter.Ordinal == ordinal
                && SymbolEqualityComparer.Default.Equals(
                    reference.Parameter.ContainingSymbol.OriginalDefinition,
                    rewrite.Method
                )
                && rewrite.Edits.Keeps(reference.Syntax)
            );

    private static IArgumentOperation? Argument(CallSite site, int ordinal) =>
        site.Operation is IInvocationOperation invocation
            ? invocation.Arguments.FirstOrDefault(argument => argument.Parameter?.Ordinal == ordinal)
            : null;

    /// <summary>The helper's parameters with the mutator: in place of the instance, or first.</summary>
    public static void Signature(MethodRewrite rewrite, Threading threading)
    {
        if (rewrite.Body.Declaration is not MethodDeclarationSyntax declaration)
        {
            return;
        }

        var name = rewrite.Mutator;
        rewrite.Edits.Replace(
            declaration.ParameterList,
            lookup => Parameters(lookup.Current(declaration.ParameterList), threading, name),
            declaration.ParameterList
        );
    }

    /// <summary><paramref name="list"/> with the mutator in place of the instance or first, without the removed clients.</summary>
    public static ParameterListSyntax Parameters(ParameterListSyntax list, Threading threading, string name)
    {
        var parameters = new List<ParameterSyntax>();
        var mutator = MutatorParameter(name);
        for (var i = 0; i < list.Parameters.Count; i++)
        {
            if (threading.Removed.Contains(i))
            {
                continue;
            }

            parameters.Add(i == threading.Instance ? mutator.WithTriviaFrom(list.Parameters[i]) : list.Parameters[i]);
        }

        if (threading.Instance is null)
        {
            parameters.Insert(
                0,
                mutator.WithLeadingTrivia(parameters.Count > 0 ? parameters[0].GetLeadingTrivia() : default)
            );
        }

        return list.WithParameters(Separated(parameters, list));
    }

    /// <summary>
    /// A call of a threaded helper passes the caller's mutator; an instance argument passed by name keeps a name, the
    /// helper's <paramref name="parameter"/>, so that the arguments after it still bind.
    /// </summary>
    public static void CallSite(MethodRewrite caller, IOperation call, Threading threading, string parameter)
    {
        if (call is not IInvocationOperation invocation || invocation.Syntax is not InvocationExpressionSyntax syntax)
        {
            return;
        }

        var mutator = caller.MutatorExpression();
        var byOrdinal = invocation
            .Arguments.Where(static argument =>
                argument.ArgumentKind == ArgumentKind.Explicit && argument.Syntax is ArgumentSyntax
            )
            .ToDictionary(
                static argument => (ArgumentSyntax)argument.Syntax,
                static argument => argument.Parameter?.Ordinal ?? -1
            );
        caller.Edits.Replace(
            syntax.ArgumentList,
            lookup =>
            {
                var list = lookup.Current(syntax.ArgumentList);
                var arguments = new List<ArgumentSyntax>();
                for (var i = 0; i < list.Arguments.Count; i++)
                {
                    var ordinal = byOrdinal.GetValueOrDefault(syntax.ArgumentList.Arguments[i], -1);
                    if (threading.Removed.Contains(ordinal))
                    {
                        continue;
                    }

                    var argument = list.Arguments[i];
                    arguments.Add(
                        ordinal >= 0 && ordinal == threading.Instance
                            ? argument
                                .WithExpression(mutator.WithTriviaFrom(argument.Expression))
                                .WithNameColon(
                                    argument.NameColon?.WithName(
                                        SyntaxFactory.IdentifierName(parameter).WithTriviaFrom(argument.NameColon.Name)
                                    )
                                )
                            : argument
                    );
                }

                if (threading.Instance is null)
                {
                    arguments.Insert(
                        0,
                        SyntaxFactory
                            .Argument(mutator)
                            .WithLeadingTrivia(arguments.Count > 0 ? arguments[0].GetLeadingTrivia() : default)
                    );
                }

                return list.WithArguments(Separated(arguments, list));
            },
            syntax.ArgumentList
        );
    }

    private static ParameterSyntax MutatorParameter(string name) =>
        SyntaxFactory
            .Parameter(SyntaxFactory.Identifier(name))
            .WithType(GeneratedTypeReferenceFinalizer.Reference(Mutator).WithTrailingTrivia(SyntaxFactory.Space));

    /// <summary>The items joined with the separators the list had, and copies of its last one where there are more.</summary>
    private static SeparatedSyntaxList<T> Separated<T>(IReadOnlyList<T> items, SyntaxNode list)
        where T : SyntaxNode
    {
        var separators = list.ChildTokens().Where(static token => token.IsKind(SyntaxKind.CommaToken)).ToList();
        var extra =
            separators.Count > 0
                ? separators[^1]
                : SyntaxFactory.Token(SyntaxKind.CommaToken).WithTrailingTrivia(SyntaxFactory.Space);
        var tokens = Enumerable
            .Range(0, Math.Max(items.Count - 1, 0))
            .Select(i => i < separators.Count ? separators[i] : extra);
        return SyntaxFactory.SeparatedList(items, tokens);
    }
}

/// <summary>A field or constructor parameter that injects a Storage client the rewritten code no longer uses.</summary>
/// <param name="Nodes">What goes: the field's declaration and its assignments, or the parameter.</param>
/// <param name="Parameters">Constructor parameter lists that lose the client parameter, with the parameter.</param>
internal sealed record UnusedClient(
    ScannedCSharpFile File,
    SyntaxNode Anchor,
    string Client,
    string Type,
    IReadOnlyList<(ScannedCSharpFile File, SyntaxNode Node)> Nodes,
    IReadOnlyList<(ScannedCSharpFile File, ParameterListSyntax List, ParameterSyntax Parameter)> Parameters
);

/// <summary>
/// The Storage clients that types with rewritten code got by injection and no longer use: a private field assigned
/// only from a constructor parameter, or a primary-constructor parameter. Constructor parameters go only when the
/// app never creates the type with <c>new</c>, so dependency injection is the only caller.
/// </summary>
internal static class UnusedClients
{
    public static IEnumerable<UnusedClient> Find(
        IReadOnlyCollection<MethodRewrite> rewrites,
        WindowReach reach,
        IReadOnlyList<ScannedCSharpFile> files
    )
    {
        var byMethod = rewrites.ToDictionary<MethodRewrite, IMethodSymbol, MethodRewrite>(
            static rewrite => rewrite.Method,
            static rewrite => rewrite,
            SymbolEqualityComparer.Default
        );
        var filesByTree = files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        var types = rewrites
            .Where(static rewrite => !rewrite.Edits.IsEmpty)
            .Select(static rewrite => rewrite.Method.ContainingType.OriginalDefinition)
            .Distinct<INamedTypeSymbol>(SymbolEqualityComparer.Default);
        foreach (var type in types)
        {
            var created = type.InstanceConstructors.Any(constructor =>
                reach.CallersOf(constructor).Any(static site => site.Operation is IObjectCreationOperation)
            );
            var bodies = type.GetMembers()
                .SelectMany(static member =>
                    member switch
                    {
                        IMethodSymbol method => [method],
                        IPropertySymbol property => new[]
                        {
                            property.GetMethod,
                            property.SetMethod,
                        }.OfType<IMethodSymbol>(),
                        _ => [],
                    }
                )
                .Select(reach.Body)
                .OfType<MemberBody>()
                .ToList();
            foreach (var field in type.GetMembers().OfType<IFieldSymbol>())
            {
                if (
                    field.IsStatic
                    || field.DeclaredAccessibility != Accessibility.Private
                    || StorageClientCall.ClientTypeOf(field.Type) is not { } client
                    || field.DeclaringSyntaxReferences is not [var reference]
                    || reference.GetSyntax()
                        is not VariableDeclaratorSyntax
                        {
                            Initializer: null,
                            Parent: VariableDeclarationSyntax
                            {
                                Variables.Count: 1,
                                Parent: FieldDeclarationSyntax declaration
                            }
                        }
                    || !filesByTree.TryGetValue(reference.SyntaxTree, out var file)
                )
                {
                    continue;
                }

                var assignments = new List<(ScannedCSharpFile, SyntaxNode)>();
                var parameters = new List<(ScannedCSharpFile, ParameterListSyntax, ParameterSyntax)>();
                var used = false;
                foreach (var body in bodies)
                {
                    foreach (
                        var use in body
                            .Operation.DescendantsAndSelf()
                            .OfType<IFieldReferenceOperation>()
                            .Where(use => SymbolEqualityComparer.Default.Equals(use.Field.OriginalDefinition, field))
                    )
                    {
                        if (
                            body.Method.MethodKind == MethodKind.Constructor
                            && use.Parent
                                is ISimpleAssignmentOperation
                                {
                                    Value: IParameterReferenceOperation passed,
                                    Parent: IExpressionStatementOperation statement
                                } assignment
                            && assignment.Target == use
                        )
                        {
                            assignments.Add((body.File, statement.Syntax));
                            if (
                                !created
                                && OnlyUse(body, passed.Parameter, statement.Syntax)
                                && passed.Parameter.DeclaringSyntaxReferences is [var parameterReference]
                                && parameterReference.GetSyntax()
                                    is ParameterSyntax { Parent: ParameterListSyntax list } parameter
                            )
                            {
                                parameters.Add((body.File, list, parameter));
                            }

                            continue;
                        }

                        used |= !byMethod.TryGetValue(body.Method, out var rewrite) || rewrite.Edits.Keeps(use.Syntax);
                    }
                }

                if (!used && !Mentioned(field.Name, declaration, bodies))
                {
                    yield return new UnusedClient(
                        file,
                        declaration,
                        StorageClientCall.ClientName(client),
                        type.Name,
                        [(file, declaration), .. assignments],
                        parameters
                    );
                }
            }

            foreach (var parameter in PrimaryParameters(type))
            {
                if (
                    created
                    || StorageClientCall.ClientTypeOf(parameter.Type) is not { } client
                    || parameter.DeclaringSyntaxReferences is not [var reference]
                    || reference.GetSyntax() is not ParameterSyntax { Parent: ParameterListSyntax list } syntax
                    || !filesByTree.TryGetValue(reference.SyntaxTree, out var file)
                )
                {
                    continue;
                }

                var used = bodies.Any(body =>
                    body.Operation.DescendantsAndSelf()
                        .OfType<IParameterReferenceOperation>()
                        .Any(use =>
                            SymbolEqualityComparer.Default.Equals(
                                use.Parameter.OriginalDefinition,
                                parameter.OriginalDefinition
                            )
                            && (!byMethod.TryGetValue(body.Method, out var rewrite) || rewrite.Edits.Keeps(use.Syntax))
                        )
                );
                if (!used && !MentionedOutsideBodies(parameter.Name, syntax, list.Parent, bodies))
                {
                    yield return new UnusedClient(
                        file,
                        syntax,
                        StorageClientCall.ClientName(client),
                        type.Name,
                        [],
                        [(file, list, syntax)]
                    );
                }
            }
        }
    }

    private static IEnumerable<IParameterSymbol> PrimaryParameters(INamedTypeSymbol type) =>
        type
            .InstanceConstructors.Where(static constructor =>
                constructor.DeclaringSyntaxReferences.Any(static reference =>
                    reference.GetSyntax() is TypeDeclarationSyntax
                )
            )
            .SelectMany(static constructor => constructor.Parameters);

    /// <summary>Whether the constructor uses the parameter anywhere but in <paramref name="assignment"/>.</summary>
    private static bool OnlyUse(MemberBody constructor, IParameterSymbol parameter, SyntaxNode assignment) =>
        constructor
            .Operation.DescendantsAndSelf()
            .OfType<IParameterReferenceOperation>()
            .Where(use => SymbolEqualityComparer.Default.Equals(use.Parameter, parameter))
            .All(use => assignment.Span.Contains(use.Syntax.Span));

    /// <summary>Whether the field's name appears in the type outside the member bodies the search read, such as an initializer.</summary>
    private static bool Mentioned(string name, SyntaxNode declaration, IReadOnlyList<MemberBody> bodies)
    {
        return MentionedOutsideBodies(name, declaration, declaration.Parent, bodies);
    }

    private static bool MentionedOutsideBodies(
        string name,
        SyntaxNode declaration,
        SyntaxNode? type,
        IReadOnlyList<MemberBody> bodies
    ) =>
        type is not null
        && type.DescendantNodes()
            .OfType<IdentifierNameSyntax>()
            .Any(identifier =>
                identifier.Identifier.ValueText == name
                && !declaration.Span.Contains(identifier.Span)
                && !bodies.Any(body =>
                    body.Declaration.SyntaxTree == identifier.SyntaxTree
                    && body.Declaration.Span.Contains(identifier.Span)
                )
            );
}
