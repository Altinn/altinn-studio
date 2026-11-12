using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Common.App;

namespace Altinn.Studio.Common.Cdn;

/// <summary>
/// The service owner registry that Altinn's CDN publishes as <c>altinn-orgs.json</c>, read from a copy of that
/// document. It does not fetch the document. Whoever does decides where from and for how long a copy is good.
/// </summary>
/// <remarks>
/// It reads what it can and says what it left out, in <see cref="Skipped"/> and <see cref="UnknownEnvironments"/>, so
/// that one bad entry does not take the other service owners with it and does not go unnoticed either.
/// </remarks>
public sealed class AltinnOrgsRegistry : ServiceOwnerRegistry
{
    private readonly Dictionary<ServiceOwnerCode, ServiceOwner> _serviceOwners;

    private AltinnOrgsRegistry(
        Dictionary<ServiceOwnerCode, ServiceOwner> serviceOwners,
        IReadOnlyList<string> skipped,
        IReadOnlyList<UnknownEnvironment> unknownEnvironments
    )
    {
        _serviceOwners = serviceOwners;
        Skipped = skipped;
        UnknownEnvironments = unknownEnvironments;
    }

    /// <summary>Every service owner in the document.</summary>
    public IReadOnlyCollection<ServiceOwner> ServiceOwners => _serviceOwners.Values;

    /// <summary>The entries that were left out because their key is not a service owner code.</summary>
    public IReadOnlyList<string> Skipped { get; }

    /// <summary>
    /// The environments that were left out of a service owner because their name is not an environment's, such as a
    /// misspelled one.
    /// </summary>
    public IReadOnlyList<UnknownEnvironment> UnknownEnvironments { get; }

    /// <summary>
    /// Reads the document: an object with <c>orgs</c>, which has an entry per service owner code, with the names of
    /// its <c>environments</c>.
    /// </summary>
    public static bool TryParse(ReadOnlyMemory<byte> json, [NotNullWhen(true)] out AltinnOrgsRegistry? registry)
    {
        registry = null;
        try
        {
            using JsonDocument document = JsonDocument.Parse(json);
            if (
                document.RootElement.ValueKind != JsonValueKind.Object
                || !document.RootElement.TryGetProperty("orgs", out JsonElement orgs)
                || orgs.ValueKind != JsonValueKind.Object
            )
            {
                return false;
            }

            var serviceOwners = new Dictionary<ServiceOwnerCode, ServiceOwner>();
            var skipped = new List<string>();
            var unknownEnvironments = new List<UnknownEnvironment>();
            foreach (JsonProperty entry in orgs.EnumerateObject())
            {
                if (ServiceOwnerCode.TryParse(entry.Name, out ServiceOwnerCode code))
                {
                    serviceOwners[code] = Registered(code, Environments(code, entry.Value, unknownEnvironments));
                }
                else
                {
                    skipped.Add(entry.Name);
                }
            }

            registry = new AltinnOrgsRegistry(serviceOwners, skipped, unknownEnvironments);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    /// <summary>Finds the service owner with the code, without waiting, since the document is already read.</summary>
    public bool TryFind(ServiceOwnerCode code, [NotNullWhen(true)] out ServiceOwner? serviceOwner) =>
        _serviceOwners.TryGetValue(code, out serviceOwner);

    /// <inheritdoc />
    public override Task<ServiceOwner?> Find(ServiceOwnerCode code, CancellationToken cancellationToken) =>
        Task.FromResult(TryFind(code, out ServiceOwner? found) ? found : null);

    /// <inheritdoc />
    public override Task<IReadOnlyCollection<ServiceOwner>> List(CancellationToken cancellationToken) =>
        Task.FromResult(ServiceOwners);

    private static List<RuntimeEnvironment> Environments(
        ServiceOwnerCode code,
        JsonElement entry,
        List<UnknownEnvironment> unknown
    )
    {
        var environments = new List<RuntimeEnvironment>();
        if (
            entry.ValueKind == JsonValueKind.Object
            && entry.TryGetProperty("environments", out JsonElement names)
            && names.ValueKind == JsonValueKind.Array
        )
        {
            foreach (JsonElement name in names.EnumerateArray())
            {
                if (
                    name.ValueKind == JsonValueKind.String
                    && RuntimeEnvironment.TryParse(name.GetString(), out RuntimeEnvironment environment)
                )
                {
                    environments.Add(environment);
                }
                else
                {
                    unknown.Add(
                        new UnknownEnvironment(
                            code,
                            name.ValueKind == JsonValueKind.String
                                ? name.GetString() ?? string.Empty
                                : name.GetRawText()
                        )
                    );
                }
            }
        }

        return environments;
    }
}

/// <summary>An environment that the document lists for a service owner code, but whose name is not an environment's.</summary>
/// <param name="Code">The service owner code.</param>
/// <param name="Name">The name as the document has it.</param>
public sealed record UnknownEnvironment(ServiceOwnerCode Code, string Name);
