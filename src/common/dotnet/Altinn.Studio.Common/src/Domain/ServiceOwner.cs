using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Altinn.Studio.Common.Domain;

/// <summary>
/// A service owner, under one of its codes: whoever has an agreement with Altinn to offer services. A
/// <see cref="ServiceOwnerCode"/> only has the form of a code, and this says that a
/// <see cref="ServiceOwnerRegistry"/> has a service owner with it.
/// </summary>
/// <remarks>
/// Only a registry creates one. It has what a consumer has needed so far. The service owner registry also has
/// display names, an organization number, a homepage, a logo and contact details. A service owner can have several
/// codes, and this is what the registry has for one of them.
/// </remarks>
public sealed class ServiceOwner
{
    private readonly HashSet<RuntimeEnvironment> _environments;

    internal ServiceOwner(ServiceOwnerCode code, IEnumerable<RuntimeEnvironment> environments)
    {
        // A registry can only pass values that were parsed. Reading them refuses a default one.
        _ = code.Value;
        Code = code;
        _environments = [];
        foreach (RuntimeEnvironment environment in environments)
        {
            _ = environment.Name;
            _environments.Add(environment);
        }

        Environments = new ReadOnlyCollection<RuntimeEnvironment>([.. _environments]);
    }

    /// <summary>The service owner code, such as <c>ttd</c>.</summary>
    public ServiceOwnerCode Code { get; }

    /// <summary>
    /// The environments that have a cluster for the code, where its apps are deployed. They are Altinn Studio's: a
    /// service owner that does not use Altinn Studio has none.
    /// </summary>
    public IReadOnlyCollection<RuntimeEnvironment> Environments { get; }

    /// <summary>Whether the environment has a cluster for the code.</summary>
    public bool Has(RuntimeEnvironment environment) => _environments.Contains(environment);

    /// <summary>Returns <see cref="Code"/>.</summary>
    public override string ToString() => Code.Value;
}
