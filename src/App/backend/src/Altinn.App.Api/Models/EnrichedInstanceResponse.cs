#nullable disable
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using CoreAppProcessState = Altinn.App.Core.Internal.Process.Elements.AppProcessState;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents an instance response with enriched process state including authorized actions,
/// read/write access, element types, and process task metadata.
/// </summary>
public sealed class EnrichedInstanceResponse
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
    /// An object containing the enriched instance process state with authorized actions.
    /// </summary>
    public required CoreAppProcessState Process { get; init; }

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

    internal static EnrichedInstanceResponse From(
        Instance instance,
        Party instanceOwnerParty,
        CoreAppProcessState processState
    )
    {
        return new EnrichedInstanceResponse
        {
            Id = instance.Id,
            InstanceOwner = new InstanceOwnerResponse
            {
                PartyId = instance.InstanceOwner.PartyId,
                PersonNumber = instance.InstanceOwner.PersonNumber,
                OrganisationNumber = instance.InstanceOwner.OrganisationNumber,
                Username = instance.InstanceOwner.Username,
                ExternalIdentifier = instance.InstanceOwner.ExternalIdentifier,
                Party = PartyResponse.From(instanceOwnerParty),
            },
            AppId = instance.AppId,
            Org = instance.Org,
            SelfLinks = instance.SelfLinks,
            DueBefore = instance.DueBefore,
            VisibleAfter = instance.VisibleAfter,
            Process = processState,
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
