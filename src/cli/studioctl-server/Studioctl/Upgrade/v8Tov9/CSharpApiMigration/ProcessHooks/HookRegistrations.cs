using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// A registration of a v8 hook interface in the app's service collection, in any of the forms
/// <c>Add{Transient,Scoped,Singleton}</c> and <c>TryAdd*</c> take: type arguments, <c>typeof</c> operands, or a
/// factory, whose cast to the interface names it.
/// </summary>
/// <param name="Implementation">The registered class: the implementation type, or the type a factory returns.</param>
/// <param name="ServiceTypes">The nodes that name the v8 interface: a type argument, a <c>typeof</c> operand, casts in a factory.</param>
internal sealed record HookRegistration(
    ScannedCSharpFile File,
    InvocationExpressionSyntax Invocation,
    HookFamily Family,
    ITypeSymbol? Implementation,
    IReadOnlyList<TypeSyntax> ServiceTypes
)
{
    /// <summary>
    /// The block the registration is a statement of, which decides the order of registrations in it: a method's or
    /// local function's body, or the top-level statements of the file. <c>null</c> when the registration is nested in
    /// anything else, such as a condition or a chain of calls.
    /// </summary>
    public SyntaxNode? Scope =>
        Invocation.Parent switch
        {
            ExpressionStatementSyntax
            {
                Parent: BlockSyntax { Parent: BaseMethodDeclarationSyntax or LocalFunctionStatementSyntax } block
            } => block,
            ExpressionStatementSyntax { Parent: GlobalStatementSyntax { Parent: CompilationUnitSyntax unit } } => unit,
            _ => null,
        };

    /// <summary>The statement that registers, the line an insertion is relative to.</summary>
    public StatementSyntax? Statement => Invocation.Parent as ExpressionStatementSyntax;

    /// <summary>
    /// The statement when it is this registration alone, directly in a block, so that removing its line removes
    /// nothing else: <c>null</c> under a condition, in a chain of calls, or among the top-level statements.
    /// </summary>
    public StatementSyntax? RemovableStatement =>
        Invocation is { Parent: ExpressionStatementSyntax { Parent: BlockSyntax } statement }
        && !Invocation.Expression.DescendantNodes().OfType<InvocationExpressionSyntax>().Any()
            ? statement
            : null;

    /// <summary>
    /// The <c>services.AddTransient&lt;IProcessTaskEnd, Implementation&gt;()</c> form, which registers the class by
    /// itself once the interface argument is dropped.
    /// </summary>
    public GenericNameSyntax? TwoTypeArgumentsName =>
        Invocation
            is {
                ArgumentList.Arguments.Count: 0,
                Expression: MemberAccessExpressionSyntax
                {
                    Name: GenericNameSyntax { TypeArgumentList.Arguments.Count: 2 } name
                }
            }
            ? name
            : null;
}

/// <summary>
/// Finds and retargets the app's registrations of v8 hooks. Only registrations of classes the port moved to v9
/// are changed: a registration of a package's class keeps the v8 interface, which that class still implements.
/// </summary>
internal static class HookRegistrations
{
    private static readonly HashSet<string> _registrationTypes =
    [
        "Microsoft.Extensions.DependencyInjection.ServiceCollectionServiceExtensions",
        "Microsoft.Extensions.DependencyInjection.Extensions.ServiceCollectionDescriptorExtensions",
    ];

    private static readonly HashSet<string> _registrationMethods =
    [
        "AddTransient",
        "AddScoped",
        "AddSingleton",
        "TryAddTransient",
        "TryAddScoped",
        "TryAddSingleton",
    ];

    /// <summary>The registrations of the families' v8 interfaces in files with a semantic model.</summary>
    public static IReadOnlyList<HookRegistration> Find(
        IReadOnlyList<ScannedCSharpFile> files,
        IReadOnlyList<HookFamily> families
    )
    {
        var registrations = new List<HookRegistration>();
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (Registration(file, model, invocation, families) is { } registration)
                {
                    registrations.Add(registration);
                }
            }
        }

        return registrations;
    }

    /// <summary>The registration with the v9 interface in place of the v8 one, wherever it names it.</summary>
    public static InvocationExpressionSyntax Retarget(HookRegistration registration) =>
        registration.Invocation.ReplaceNodes(
            registration.ServiceTypes,
            (original, _) =>
                GeneratedTypeReferenceFinalizer.Reference(registration.Family.V9Interface).WithTriviaFrom(original)
        );

    /// <summary>
    /// <c>services.AddTransient&lt;IProcessTaskEnd, Implementation&gt;()</c> as
    /// <c>services.AddTransient&lt;Implementation&gt;()</c>, for a class another handler runs.
    /// </summary>
    public static InvocationExpressionSyntax WithoutServiceType(HookRegistration registration)
    {
        var name =
            registration.TwoTypeArgumentsName
            ?? throw new InvalidOperationException("Only the two type arguments form registers the class by itself.");
        var implementation = name.TypeArgumentList.Arguments[1];
        return registration.Invocation.ReplaceNode(
            name,
            name.WithTypeArgumentList(
                name.TypeArgumentList.WithArguments(
                    SyntaxFactory.SingletonSeparatedList(
                        implementation.WithLeadingTrivia(name.TypeArgumentList.Arguments[0].GetLeadingTrivia())
                    )
                )
            )
        );
    }

    private static HookRegistration? Registration(
        ScannedCSharpFile file,
        SemanticModel model,
        InvocationExpressionSyntax invocation,
        IReadOnlyList<HookFamily> families
    )
    {
        if (
            CSharpSemanticQueries.InvokedName(invocation) is not { } invokedName
            || !_registrationMethods.Contains(invokedName.Identifier.ValueText)
            || model.GetSymbolInfo(invocation).Symbol is not IMethodSymbol method
            || !_registrationTypes.Contains((method.ReducedFrom ?? method).ContainingType.ToDisplayString())
        )
        {
            return null;
        }

        var serviceTypes = new List<TypeSyntax>();
        ITypeSymbol? service;
        ITypeSymbol? implementation;
        if (method.IsGenericMethod)
        {
            service = method.TypeArguments[0];
            implementation = method.TypeArguments.Length > 1 ? method.TypeArguments[1] : null;
            if (invokedName is GenericNameSyntax generic)
            {
                serviceTypes.Add(generic.TypeArgumentList.Arguments[0]);
            }
        }
        else
        {
            // TryAdd* names the parameter "service".
            var serviceType =
                TypeOfArgument(invocation, method, "serviceType") ?? TypeOfArgument(invocation, method, "service");
            service = serviceType is null ? null : model.GetTypeInfo(serviceType).Type;
            if (serviceType is not null)
            {
                serviceTypes.Add(serviceType);
            }

            implementation = TypeOfArgument(invocation, method, "implementationType") is { } implementationType
                ? model.GetTypeInfo(implementationType).Type
                : null;
        }

        if (service is not INamedTypeSymbol serviceSymbol || Family(serviceSymbol, families) is not { } family)
        {
            return null;
        }

        if (Argument(invocation, method, "implementationFactory") is { } factory)
        {
            serviceTypes.AddRange(
                factory
                    .DescendantNodesAndSelf()
                    .OfType<CastExpressionSyntax>()
                    .Where(cast =>
                        model.GetTypeInfo(cast.Type).Type is INamedTypeSymbol type && Family(type, families) == family
                    )
                    .Select(static cast => cast.Type)
            );
            implementation = FactoryResult(factory, model);
        }
        else
        {
            implementation ??= service;
        }

        return new HookRegistration(file, invocation, family, implementation, serviceTypes);
    }

    private static HookFamily? Family(INamedTypeSymbol type, IReadOnlyList<HookFamily> families) =>
        CSharpSemanticQueries.IsAltinnAppSymbol(type)
            ? families.FirstOrDefault(family => family.V8Interface == type.ToDisplayString())
            : null;

    /// <summary>The class a factory lambda returns, looking through casts; <c>null</c> when it is not one expression.</summary>
    private static ITypeSymbol? FactoryResult(ExpressionSyntax factory, SemanticModel model)
    {
        if (factory is not LambdaExpressionSyntax { ExpressionBody: { } body })
        {
            return null;
        }

        while (body is CastExpressionSyntax or ParenthesizedExpressionSyntax)
        {
            body = body is CastExpressionSyntax cast
                ? cast.Expression
                : ((ParenthesizedExpressionSyntax)body).Expression;
        }

        return model.GetTypeInfo(body).Type;
    }

    private static TypeSyntax? TypeOfArgument(
        InvocationExpressionSyntax invocation,
        IMethodSymbol method,
        string parameter
    ) => Argument(invocation, method, parameter) is TypeOfExpressionSyntax typeOf ? typeOf.Type : null;

    /// <summary>The argument for <paramref name="parameter"/>, passed by name or by position.</summary>
    private static ExpressionSyntax? Argument(
        InvocationExpressionSyntax invocation,
        IMethodSymbol method,
        string parameter
    )
    {
        var arguments = invocation.ArgumentList.Arguments;
        if (
            arguments.FirstOrDefault(argument => argument.NameColon?.Name.Identifier.ValueText == parameter) is
            { } named
        )
        {
            return named.Expression;
        }

        var index = method.Parameters.Select(static p => p.Name).ToList().IndexOf(parameter);
        return index >= 0 && index < arguments.Count && arguments[index].NameColon is null
            ? arguments[index].Expression
            : null;
    }
}
