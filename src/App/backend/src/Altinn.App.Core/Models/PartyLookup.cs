using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Represents a lookup criteria when looking for a <see cref="Party"/>. Only one of the properties can
/// be used at a time.
/// </summary>
/// <remarks>
/// Same shape (<see cref="Ssn"/>/<see cref="OrgNo"/>) as what the App SDK already used before this type
/// was vendored — the deprecated <c>Altinn.Platform.Register.Models.PartyLookup</c> was added to the
/// <c>Altinn.Platform.Models</c> package's published NuGet releases after this repo's own copy of that
/// package's source was removed, so it doesn't appear in this repo's history to compare against directly.
/// </remarks>
public record PartyLookup
{
    /// <summary>
    /// Gets or sets the social security number of the party to look for.
    /// </summary>
    [JsonPropertyName("ssn")]
    public string? Ssn { get; set; }

    /// <summary>
    /// Gets or sets the organization number of the party to look for.
    /// </summary>
    [JsonPropertyName("orgNo")]
    public string? OrgNo { get; set; }
}
