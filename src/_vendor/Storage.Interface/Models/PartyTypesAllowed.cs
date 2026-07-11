#nullable disable

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents a set of settings where application owner can define what types of parties
/// that are allowed to be owners of an instance in an application.
/// </summary>
/// <remarks>If all values are set to false (the default), then all types are allowed as owners</remarks>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class PartyTypesAllowed
{
    /// <summary>
    /// Gets or sets a value indicating whether a bankruptcy estate is allowed to be the owner of an instance.
    /// </summary>
    [JsonProperty(PropertyName = "bankruptcyEstate")]
    public bool BankruptcyEstate { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether an organisation is allowed to be the owner of an instance.
    /// </summary>
    [JsonProperty(PropertyName = "organisation")]
    public bool Organisation { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether a person is allowed to be the owner of an instance.
    /// </summary>
    [JsonProperty(PropertyName = "person")]
    public bool Person { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether a sub unit is allowed to be the owner of an instance.
    /// </summary>
    [JsonProperty(PropertyName = "subUnit")]
    public bool SubUnit { get; set; }
}
