using System.Collections.Concurrent;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// The process hooks that code in the app may take out of the service collection again. Counting the registrations of
/// such a hook says nothing about how many run.
/// </summary>
/// <remarks>
/// A removal anywhere in the app counts, behind a condition or not: the analyzer does not follow calls, so it cannot
/// tell which registrations a call to a helper undoes. Any call that takes the collection is read by its name, so an
/// app's own <c>RemoveDefaultHooks(services)</c> counts too. A call that does not say which service it takes out, such
/// as <c>services.Remove(descriptor)</c>, counts for every hook.
/// </remarks>
internal sealed class HookRemovals
{
    private const string DescriptorExtensions =
        "Microsoft.Extensions.DependencyInjection.Extensions.ServiceCollectionDescriptorExtensions";
    private const string ServiceDescriptor = "Microsoft.Extensions.DependencyInjection.ServiceDescriptor";

    private readonly INamedTypeSymbol _descriptorExtensions;
    private readonly INamedTypeSymbol _serviceDescriptor;
    private readonly INamedTypeSymbol _descriptorCollection;
    private readonly ImmutableArray<INamedTypeSymbol> _hooks;

    // A null entry is a removal that can take out any hook.
    private readonly ConcurrentBag<INamedTypeSymbol?> _removed = [];

    private HookRemovals(
        INamedTypeSymbol descriptorExtensions,
        INamedTypeSymbol serviceDescriptor,
        INamedTypeSymbol descriptorCollection,
        ImmutableArray<INamedTypeSymbol> hooks
    )
    {
        _descriptorExtensions = descriptorExtensions;
        _serviceDescriptor = serviceDescriptor;
        _descriptorCollection = descriptorCollection;
        _hooks = hooks;
    }

    /// <summary>The removals to record for <paramref name="hooks"/>, or null without the types they use.</summary>
    internal static HookRemovals? TryCreate(Compilation compilation, ImmutableArray<INamedTypeSymbol> hooks)
    {
        var descriptorExtensions = compilation.GetTypeByMetadataName(DescriptorExtensions);
        var serviceDescriptor = compilation.GetTypeByMetadataName(ServiceDescriptor);
        if (descriptorExtensions is null || serviceDescriptor is null)
        {
            return null;
        }

        var descriptorCollection = compilation
            .GetSpecialType(SpecialType.System_Collections_Generic_ICollection_T)
            .Construct(serviceDescriptor);
        return new HookRemovals(descriptorExtensions, serviceDescriptor, descriptorCollection, hooks);
    }

    /// <summary>Whether code in the app may take out registrations of <paramref name="hook"/>.</summary>
    internal bool MayRemove(INamedTypeSymbol hook) =>
        _removed.Any(removed => removed is null || SymbolEqualityComparer.Default.Equals(removed, hook));

    /// <summary>Records <paramref name="invocation"/> when it may take something out of the collection.</summary>
    internal void Read(IInvocationOperation invocation)
    {
        var name = invocation.TargetMethod.Name;
        if (
            (!name.Contains("Remove") && !name.Contains("Replace") && !name.Contains("Clear"))
            || !TakesCollection(invocation)
        )
        {
            return;
        }

        switch (ServiceOf(invocation))
        {
            case INamedTypeSymbol service when _hooks.Contains(service, SymbolEqualityComparer.Default):
                _removed.Add(service);
                break;
            // Some other service, which says nothing about the hooks.
            case INamedTypeSymbol:
                break;
            default:
                _removed.Add(null);
                break;
        }
    }

    /// <summary>Records <paramref name="assignment"/> when it overwrites an entry in the collection.</summary>
    internal void Read(ISimpleAssignmentOperation assignment)
    {
        if (
            assignment.Target is IPropertyReferenceOperation { Property.IsIndexer: true, Instance: { } instance }
            && IsCollection(instance)
        )
        {
            _removed.Add(null);
        }
    }

    private bool TakesCollection(IInvocationOperation invocation) =>
        (invocation.Instance is { } instance && IsCollection(instance))
        || invocation.Arguments.Any(argument => IsCollection(argument.Value));

    private bool IsCollection(IOperation operation) =>
        HookRegistration.Unwrap(operation).Type is { } type
        && (
            SymbolEqualityComparer.Default.Equals(type, _descriptorCollection)
            || type.AllInterfaces.Contains(_descriptorCollection, SymbolEqualityComparer.Default)
        );

    /// <summary>
    /// The service a known removal names: <c>RemoveAll&lt;TService&gt;()</c>, <c>RemoveAll(serviceType)</c> or
    /// <c>Replace(descriptor)</c> with a descriptor made in place. Null for any other call.
    /// </summary>
    private ITypeSymbol? ServiceOf(IInvocationOperation invocation)
    {
        var method = invocation.TargetMethod;
        if (!SymbolEqualityComparer.Default.Equals(method.ContainingType, _descriptorExtensions))
        {
            return null;
        }

        if (method.IsGenericMethod)
        {
            return method.TypeArguments[0];
        }

        return HookRegistration.Argument(invocation.Arguments, 1) switch
        {
            ITypeOfOperation { TypeOperand: var type } => type,
            IInvocationOperation { TargetMethod: var factory } descriptor
                when SymbolEqualityComparer.Default.Equals(factory.ContainingType, _serviceDescriptor) =>
                factory.IsGenericMethod ? factory.TypeArguments[0] : TypeOf(descriptor.Arguments),
            IObjectCreationOperation { Type: var created } descriptor
                when SymbolEqualityComparer.Default.Equals(created, _serviceDescriptor) => TypeOf(descriptor.Arguments),
            _ => null,
        };
    }

    private static ITypeSymbol? TypeOf(ImmutableArray<IArgumentOperation> descriptorArguments) =>
        HookRegistration.Argument(descriptorArguments, 0) is ITypeOfOperation { TypeOperand: var type } ? type : null;
}
