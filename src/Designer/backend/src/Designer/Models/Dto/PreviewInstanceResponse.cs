namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// An instance in a preview session.
/// </summary>
/// <param name="InstanceId">
/// The instance's ID, <c>{partyId}/{instanceGuid}</c>, as the app frontend's URLs have it.
/// </param>
public record PreviewInstanceResponse(string InstanceId);
