namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

/// <summary>
/// Represents a Fiks Arkiv shipment recipient.
/// </summary>
/// <param name="AccountId">The recipient account identifier (as registered in Fiks Forvaltning).</param>
/// <param name="Identifier">Arbitrary identifier of the recipient. Serialized as `korrespondansepartID`.</param>
/// <param name="Name">The name of the recipient. Serialized as `korrespondansepartNavn`</param>
/// <param name="OrgNumber">Organization number of the recipient, if known. Serialized as `Organisasjonid` if set.</param>
public sealed record FiksArkivRecipient(Guid AccountId, string Identifier, string Name, string? OrgNumber);
