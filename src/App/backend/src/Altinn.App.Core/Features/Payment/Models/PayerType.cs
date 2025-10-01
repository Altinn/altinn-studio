using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Represents the type of payer.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PayerType
{
    /// <summary>
    /// The payer is a person.
    /// </summary>
    Person,

    /// <summary>
    /// The payer is a company.
    /// </summary>
    Company,
}
