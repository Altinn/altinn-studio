using System.Text.Json.Nodes;
using Altinn.Studio.Preview.AppApi;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// What the app has done in a session, which a real app keeps in Storage: the instances it created and their form data.
/// The store serializes it for each change, so a change can modify the state it gets.
/// </summary>
internal sealed class MockState
{
    /// <summary>The instances, by their GUID.</summary>
    public Dictionary<Guid, MockInstance> Instances { get; init; } = [];
}

/// <summary>An instance and the form data of its data elements.</summary>
internal sealed class MockInstance
{
    public required Instance Instance { get; init; }

    /// <summary>The form data, by the data element's GUID.</summary>
    public Dictionary<Guid, JsonNode?> FormData { get; init; } = [];
}
