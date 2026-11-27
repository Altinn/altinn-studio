using System;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Asks for the form data of an instance in a preview session that Designer started for the developer.
/// </summary>
/// <param name="SessionUrl">The session's URL, as <see cref="PreviewSessionResponse"/> gave it.</param>
/// <param name="InstanceId">The instance's ID, <c>{partyId}/{instanceGuid}</c>.</param>
public record PreviewFormDataRequest([Required] Uri SessionUrl, [Required] string InstanceId);
