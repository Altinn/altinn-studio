#nullable disable
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the response from an API endpoint providing a list of key-value properties.
/// </summary>
public sealed class InstanceResponse
{
    /// <summary>
    /// The unique id of the instance {instanceOwnerId}/{instanceGuid}.
    /// </summary>
    public required string Id { get; init; }

    /// <summary>
    /// The instance owner information.
    /// </summary>
    public required InstanceOwnerResponse InstanceOwner { get; init; }

    /// <summary>
    /// The id of the application this is an instance of, e.g. {org}/{app22}.
    /// </summary>
    public required string AppId { get; init; }

    /// <summary>
    /// Application owner identifier, usually a abbreviation of organisation name. All in lower case.
    /// </summary>
    public required string Org { get; init; }

    /// <summary>
    /// A set of URLs to access the instance metadata resource.
    /// </summary>
    public required ResourceLinks SelfLinks { get; init; }

    /// <summary>
    /// The due date to submit the instance to application owner.
    /// </summary>
    public required DateTime? DueBefore { get; init; }

    /// <summary>
    /// Date and time for when the instance should first become visible for the instance owner.
    /// </summary>
    public required DateTime? VisibleAfter { get; init; }

    /// <summary>
    /// An object containing the instance process state.
    /// </summary>
    public required ProcessState Process { get; init; }

    /// <summary>
    /// The type of finished status of the instance.
    /// </summary>
    public required InstanceStatus Status { get; init; }

    /// <summary>
    /// A list of <see cref="CompleteConfirmation"/> elements.
    /// </summary>
    public required IReadOnlyList<CompleteConfirmation> CompleteConfirmations { get; init; }

    /// <summary>
    /// A list of data elements associated with the instance
    /// </summary>
    public required IReadOnlyList<DataElement> Data { get; init; }

    /// <summary>
    /// The presentation texts for the instance.
    /// </summary>
    public required IReadOnlyDictionary<string, string> PresentationTexts { get; init; }

    /// <summary>
    /// The data values for the instance.
    /// </summary>
    public required IReadOnlyDictionary<string, string> DataValues { get; init; }

    /// <summary>
    /// The date and time for when the element was created.
    /// </summary>
    public required DateTime? Created { get; init; }

    /// <summary>
    /// The id of the user who created this element.
    /// </summary>
    public required string CreatedBy { get; init; }

    /// <summary>
    /// The date and time for when the element was last edited.
    /// </summary>
    public required DateTime? LastChanged { get; init; }

    /// <summary>
    /// The id of the user who last changed this element.
    /// </summary>
    public required string LastChangedBy { get; init; }

    /// <inheritdoc/>
    public override string ToString()
    {
        return JsonConvert.SerializeObject(this);
    }

    internal static InstanceResponse From(Instance instance, Party instanceOwnerParty)
    {
        return new InstanceResponse
        {
            Id = instance.Id,
            InstanceOwner = new InstanceOwnerResponse
            {
                PartyId = instance.InstanceOwner.PartyId,
                PersonNumber = instance.InstanceOwner.PersonNumber,
                OrganisationNumber = instance.InstanceOwner.OrganisationNumber,
                Username = instance.InstanceOwner.Username,
                Party = PartyResponse.From(instanceOwnerParty),
            },
            AppId = instance.AppId,
            Org = instance.Org,
            SelfLinks = instance.SelfLinks,
            DueBefore = instance.DueBefore,
            VisibleAfter = instance.VisibleAfter,
            Process = instance.Process,
            Status = instance.Status,
            CompleteConfirmations = instance.CompleteConfirmations,
            Data = instance.Data,
            DataValues = instance.DataValues,
            PresentationTexts = instance.PresentationTexts,
            Created = instance.Created,
            CreatedBy = instance.CreatedBy,
            LastChanged = instance.LastChanged,
            LastChangedBy = instance.LastChangedBy,
        };
    }
}

/// <summary>
/// Represents information to identify the owner of an instance.
/// </summary>
public sealed class InstanceOwnerResponse
{
    /// <summary>
    /// The party id of the instance owner (also called instance owner party id).
    /// </summary>
    public required string PartyId { get; init; }

    /// <summary>
    /// Person number (national identification number) of the party. Null if the party is not a person.
    /// </summary>
    public required string PersonNumber { get; init; }

    /// <summary>
    /// The organisation number of the party. Null if the party is not an organisation.
    /// </summary>
    public required string OrganisationNumber { get; init; }

    /// <summary>
    /// The username of the party. Null if the party is not self identified.
    /// </summary>
    public required string Username { get; init; }

    /// <summary>
    /// Party information for the instance owner.
    /// </summary>
    public required PartyResponse Party { get; init; }
}

/// <summary>
/// Class representing a party
/// </summary>
public sealed class PartyResponse
{
    /// <summary>
    /// The ID of the party
    /// </summary>
    public required int PartyId { get; init; }

    /// <summary>
    /// The UUID of the party
    /// </summary>
    public required Guid? PartyUuid { get; init; }

    /// <summary>
    /// The type of party
    /// </summary>
    public required PartyType PartyTypeName { get; init; }

    /// <summary>
    /// Person number (national identification number) of the party. Null if the party is not a person.
    /// </summary>
    public required string SSN { get; init; }

    /// <summary>
    /// The organisation number of the party. Null if the party is not an organisation.
    /// </summary>
    public required string OrgNumber { get; init; }

    /// <summary>
    /// The UnitType
    /// </summary>
    public required string UnitType { get; init; }

    /// <summary>
    /// The Name
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// The IsDeleted
    /// </summary>
    public required bool IsDeleted { get; init; }

    /// <summary>
    /// Returns a PartyResponse dto from a Party object.
    /// </summary>
    /// <param name="party">The party object to convert.</param>
    /// <returns>A PartyResponse object.</returns>
    /// <remarks>Normalizes strings to null if they are empty or null.</remarks>
    internal static PartyResponse From(Party party)
    {
        return new PartyResponse
        {
            PartyId = party.PartyId,
            PartyUuid = party.PartyUuid,
            PartyTypeName = party.PartyTypeName,
            SSN = string.IsNullOrEmpty(party.SSN) ? null : party.SSN,
            OrgNumber = string.IsNullOrEmpty(party.OrgNumber) ? null : party.OrgNumber,
            UnitType = string.IsNullOrEmpty(party.UnitType) ? null : party.UnitType,
            Name = string.IsNullOrEmpty(party.Name) ? null : party.Name,
            IsDeleted = party.IsDeleted,
        };
    }
}
