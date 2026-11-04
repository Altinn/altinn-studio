using Microsoft.CodeAnalysis.Operations;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// A registration of a process hook with <c>AddTransient</c>, <c>AddScoped</c> or <c>AddSingleton</c>, which the
/// runtime returns when it asks the service provider for the hook interface.
/// </summary>
internal sealed class HookRegistration
{
    internal const string RegistrationMethods =
        "Microsoft.Extensions.DependencyInjection.ServiceCollectionServiceExtensions";

    private HookRegistration(
        INamedTypeSymbol hook,
        INamedTypeSymbol? implementation,
        string name,
        ISymbol method,
        string collection,
        Location location
    )
    {
        Hook = hook;
        Implementation = implementation;
        Name = name;
        Method = method;
        Collection = collection;
        Location = location;
    }

    /// <summary>The hook interface the registration is for.</summary>
    internal INamedTypeSymbol Hook { get; }

    /// <summary>
    /// The class the runtime creates, or null when the registration does not say which: a factory or an instance
    /// that is not a <c>new</c> expression.
    /// </summary>
    internal INamedTypeSymbol? Implementation { get; }

    /// <summary>How a message names the registration: like the runtime, by its class when it is known.</summary>
    internal string Name { get; }

    /// <summary>The method or local function that runs the registration every time it runs.</summary>
    internal ISymbol Method { get; }

    /// <summary>The service collection the registration adds to, as the code writes it.</summary>
    internal string Collection { get; }

    /// <summary>The registration call, from the method name on.</summary>
    internal Location Location { get; }

    /// <summary>
    /// The registration <paramref name="invocation"/> makes of one of <paramref name="hooks"/>, or null when it makes
    /// none, or one the analyzer cannot count on.
    /// </summary>
    /// <remarks>
    /// A registration counts only when it runs whenever the method it is in runs: one behind a condition, in a loop or
    /// in a lambda may not run, or may run instead of another. A registration whose class is a type parameter is in a
    /// generic helper, which may run any number of times. Keyed registrations, which the runtime does not ask for, and
    /// the <c>TryAdd</c> methods, which add nothing when the hook is already registered, are not read. Registrations
    /// that count do not all add up: see <c>ProcessHookAnalyzer</c>.
    /// </remarks>
    internal static HookRegistration? TryRead(
        IInvocationOperation invocation,
        ISymbol containingMember,
        INamedTypeSymbol registrationMethods,
        ImmutableArray<INamedTypeSymbol> hooks
    )
    {
        var method = invocation.TargetMethod;
        if (
            method.Name is not ("AddTransient" or "AddScoped" or "AddSingleton")
            || !SymbolEqualityComparer.Default.Equals(method.ContainingType, registrationMethods)
        )
        {
            return null;
        }

        // The first parameter is the service collection: AddTransient<TService, TImplementation>() and
        // AddSingleton<TService>(instance), or AddTransient(serviceType, implementationType).
        ITypeSymbol? service;
        ITypeSymbol? implementationTypeArgument = null;
        IOperation? implementationArgument;
        if (method.IsGenericMethod)
        {
            service = method.TypeArguments[0];
            if (method.TypeArguments.Length == 2)
            {
                implementationTypeArgument = method.TypeArguments[1];
            }
            implementationArgument = Argument(invocation.Arguments, 1);
        }
        else
        {
            service = Argument(invocation.Arguments, 1) is ITypeOfOperation { TypeOperand: var serviceType }
                ? serviceType
                : null;
            implementationArgument = Argument(invocation.Arguments, 2);
        }

        if (
            service is not INamedTypeSymbol hook
            || !hooks.Contains(hook, SymbolEqualityComparer.Default)
            // The hook interface registered as itself, which the runtime cannot create.
            || (implementationArgument is null && implementationTypeArgument is null)
            || MethodThatAlwaysRuns(invocation, containingMember) is not { } containingMethod
        )
        {
            return null;
        }

        var implementation = implementationArgument is null
            ? implementationTypeArgument
            : ImplementationOf(implementationArgument);
        if (implementation is ITypeParameterSymbol)
        {
            return null;
        }

        var knownImplementation =
            implementation is INamedTypeSymbol { TypeKind: TypeKind.Class, IsAbstract: false } type
            && type.AllInterfaces.Contains(hook, SymbolEqualityComparer.Default)
                ? type
                : null;
        var name =
            implementation?.ToDisplayString()
            ?? (
                implementationArgument is IDelegateCreationOperation
                    ? $"a factory registration of {hook.Name}"
                    : $"an instance registration of {hook.Name}"
            );
        return new HookRegistration(
            hook,
            knownImplementation,
            name,
            containingMethod,
            CollectionOf(invocation),
            LocationOf(invocation)
        );
    }

    /// <summary>The argument for the parameter at <paramref name="ordinal"/>, without its conversions.</summary>
    internal static IOperation? Argument(ImmutableArray<IArgumentOperation> arguments, int ordinal) =>
        arguments.FirstOrDefault(argument => argument.Parameter?.Ordinal == ordinal)?.Value is { } value
            ? Unwrap(value)
            : null;

    /// <summary>The collection a registration adds to, past any calls chained in front of it.</summary>
    private static string CollectionOf(IInvocationOperation invocation)
    {
        var receiver = Argument(invocation.Arguments, 0);
        while (receiver is IInvocationOperation { TargetMethod.IsExtensionMethod: true } chained)
        {
            receiver = Argument(chained.Arguments, 0);
        }
        return receiver?.Syntax.ToString() ?? string.Empty;
    }

    /// <summary>
    /// The class a <c>typeof</c>, a <c>new</c> expression or a lambda that returns one names, or null for any other
    /// factory or instance.
    /// </summary>
    private static ITypeSymbol? ImplementationOf(IOperation operation) =>
        operation switch
        {
            ITypeOfOperation { TypeOperand: var type } => type,
            IObjectCreationOperation { Type: var type } => type,
            IDelegateCreationOperation
            {
                Target: IAnonymousFunctionOperation { Body.Operations: { Length: 1 } operations },
            } when operations[0] is IReturnOperation { ReturnedValue: { } returned } => ImplementationOf(
                Unwrap(returned)
            ),
            _ => null,
        };

    internal static IOperation Unwrap(IOperation operation)
    {
        while (operation is IConversionOperation { Operand: var operand })
        {
            operation = operand;
        }
        return operation;
    }

    /// <summary>
    /// The method or local function that runs <paramref name="invocation"/> every time it runs, or null when something
    /// between them decides whether it runs.
    /// </summary>
    private static ISymbol? MethodThatAlwaysRuns(IInvocationOperation invocation, ISymbol containingMember)
    {
        for (var parent = invocation.Parent; parent is not null; parent = parent.Parent)
        {
            switch (parent)
            {
                case ILocalFunctionOperation localFunction:
                    return localFunction.Symbol;
                case IMethodBodyOperation:
                    return containingMember;
                case IBlockOperation:
                case IExpressionStatementOperation:
                case IArgumentOperation:
                case IInvocationOperation:
                case IConversionOperation:
                case IReturnOperation:
                case IVariableInitializerOperation:
                case IVariableDeclaratorOperation:
                case IVariableDeclarationOperation:
                case IVariableDeclarationGroupOperation:
                // Reached from the try's body or its finally; a catch clause is not one of these cases.
                case ITryOperation:
                case IUsingOperation:
                case ILockOperation:
                    continue;
                default:
                    return null;
            }
        }
        return containingMember;
    }

    private static Location LocationOf(IInvocationOperation invocation) =>
        invocation.Syntax is InvocationExpressionSyntax { Expression: MemberAccessExpressionSyntax memberAccess } syntax
            ? Location.Create(syntax.SyntaxTree, TextSpan.FromBounds(memberAccess.Name.SpanStart, syntax.Span.End))
            : invocation.Syntax.GetLocation();
}
