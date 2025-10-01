namespace Altinn.App.Core.Features.Signing;

/// <summary>
/// Interface for implementing app-specific logic for deriving signees.
/// </summary>
[ImplementableByApps]
public interface ISigneeProvider
{
    /// <summary>
    /// Used to select the correct <see cref="ISigneeProvider" /> implementation for a given signing task. Should match the SigneeProviderId parameter in the task configuration.
    /// </summary>
    public string Id { get; init; }

    /// <summary>
    /// Returns a list of signees for the current signing task.
    /// </summary>
    Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters);
}

/// <summary>
/// Parameters than can be depended on by the <see cref="ISigneeProvider" /> implementation.
/// </summary>
public sealed record GetSigneesParameters
{
    /// <summary>
    /// An instance data accessor that can be used to retrieve instance data.
    /// </summary>
    public required IInstanceDataAccessor InstanceDataAccessor { get; init; }
}

/// <summary>
/// A result containing persons and organizations that should sign and related info for each of them.
/// </summary>
public class SigneeProviderResult
{
    /// <summary>
    /// The signees who are persons that should sign.
    /// </summary>
    public required List<ProvidedSignee> Signees { get; set; }
}
