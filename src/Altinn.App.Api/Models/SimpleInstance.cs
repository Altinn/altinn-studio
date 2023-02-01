#nullable enable
namespace Altinn.App.Api.Models;

/// <summary>
/// A simplified instance model used for presentation of key instance information.
/// </summary>
public class SimpleInstance
{
    /// <summary>
    /// The instance identifier formated as {instanceOwner.partyId}/{instanceGuid}.
    /// </summary>
    public string Id { get; set; } = default!;

    /// <summary>
    /// Presentation texts from the instance
    /// </summary>
    public Dictionary<string, string>? PresentationTexts { get; set; }

    /// <summary>
    /// Last changed date time in UTC format.
    /// </summary>
    public DateTime? LastChanged { get; set; }

    /// <summary>
    /// Full name of user to last change the instance.
    /// </summary>
    public string LastChangedBy { get; set; } = default!;
}
