#nullable enable
using System.Text.Json.Serialization;

using Altinn.Notifications.Core.Enums;

namespace Altinn.Notifications.Core.Models.Address;

/// <summary>
/// Interface describing an address point
/// </summary>
[JsonDerivedType(typeof(EmailAddressPoint), "email")]
[JsonPolymorphic(TypeDiscriminatorPropertyName = "$")]
public interface IAddressPoint
{
    /// <summary>
    /// Gets or sets the address type for the address point
    /// </summary>
    public AddressType AddressType { get; }
}
