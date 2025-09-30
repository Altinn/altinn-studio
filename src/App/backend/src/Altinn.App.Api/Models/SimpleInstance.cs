namespace Altinn.App.Api.Models;

/// <summary>
/// A simplified instance model used for presentation of key instance information.
/// </summary>
public class SimpleInstance
{
    /// <summary>
    /// The instance identifier formated as {instanceOwner.partyId}/{instanceGuid}.
    /// </summary>
#nullable disable
    public string Id { get; set; }

#nullable restore

    /// <summary>
    /// Presentation texts from the instance
    /// </summary>
    public Dictionary<string, string>? PresentationTexts { get; set; }

    /// <summary>
    /// Gets or sets the due date to submit the instance to application owner.
    /// </summary>
    public DateTime? DueBefore { get; set; }

    /// <summary>
    /// Last changed date time in UTC format.
    /// </summary>
    public DateTime? LastChanged { get; set; }

    /// <summary>
    /// Full name of user to last change the instance.
    /// </summary>
#nullable disable
    public string LastChangedBy { get; set; }
#nullable restore
}
