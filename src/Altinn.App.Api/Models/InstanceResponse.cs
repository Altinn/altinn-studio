#nullable disable
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
    /// Gets or sets the unique id of the instance {instanceOwnerId}/{instanceGuid}.
    /// </summary>
    public required string Id { get; init; }

    /// <summary>
    /// Gets or sets the instance owner information.
    /// </summary>
    public required InstanceOwnerResponse InstanceOwner { get; init; }

    /// <summary>
    /// Gets or sets the id of the application this is an instance of, e.g. {org}/{app22}.
    /// </summary>
    public required string AppId { get; init; }

    /// <summary>
    /// Gets or sets application owner identifier, usually a abbreviation of organisation name. All in lower case.
    /// </summary>
    public required string Org { get; init; }

    /// <summary>
    /// Gets or sets a set of URLs to access the instance metadata resource.
    /// </summary>
    public required ResourceLinks SelfLinks { get; init; }

    /// <summary>
    /// Gets or sets the due date to submit the instance to application owner.
    /// </summary>
    public required DateTime? DueBefore { get; init; }

    /// <summary>
    /// Gets or sets date and time for when the instance should first become visible for the instance owner.
    /// </summary>
    public required DateTime? VisibleAfter { get; init; }

    /// <summary>
    /// Gets or sets an object containing the instance process state.
    /// </summary>
    public required ProcessState Process { get; init; }

    /// <summary>
    /// Gets or sets the type of finished status of the instance.
    /// </summary>
    public required InstanceStatus Status { get; init; }

    /// <summary>
    /// Gets or sets a list of <see cref="CompleteConfirmation"/> elements.
    /// </summary>
    public required IReadOnlyList<CompleteConfirmation> CompleteConfirmations { get; init; }

    /// <summary>
    /// Gets or sets a list of data elements associated with the instance
    /// </summary>
    public required IReadOnlyList<DataElement> Data { get; init; }

    /// <summary>
    /// Gets or sets the presentation texts for the instance.
    /// </summary>
    public required IReadOnlyDictionary<string, string> PresentationTexts { get; init; }

    /// <summary>
    /// Gets or sets the data values for the instance.
    /// </summary>
    public required IReadOnlyDictionary<string, string> DataValues { get; init; }

    /// <summary>
    /// Gets or sets the date and time for when the element was created.
    /// </summary>
    public required DateTime? Created { get; init; }

    /// <summary>
    /// Gets or sets the id of the user who created this element.
    /// </summary>
    public required string CreatedBy { get; init; }

    /// <summary>
    /// Gets or sets the date and time for when the element was last edited.
    /// </summary>
    public required DateTime? LastChanged { get; init; }

    /// <summary>
    /// Gets or sets the id of the user who last changed this element.
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
                Party = instanceOwnerParty,
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
public class InstanceOwnerResponse
{
    /// <summary>
    /// Gets or sets the party id of the instance owner (also called instance owner party id).
    /// </summary>
    public required string PartyId { get; init; }

    /// <summary>
    /// Gets or sets person number (national identification number) of the party. Null if the party is not a person.
    /// </summary>
    public required string PersonNumber { get; init; }

    /// <summary>
    /// Gets or sets the organisation number of the party. Null if the party is not an organisation.
    /// </summary>
    public required string OrganisationNumber { get; init; }

    /// <summary>
    /// Gets or sets the username of the party. Null if the party is not self identified.
    /// </summary>
    public required string Username { get; init; }

    /// <summary>
    /// Party information for the instance owner.
    /// </summary>
    public required Party Party { get; init; }
}
