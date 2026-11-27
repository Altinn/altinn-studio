using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Replaces the data of a form data element of an instance in a preview session that Designer started for the
/// developer.
/// </summary>
/// <param name="SessionUrl">The session's URL, as <see cref="PreviewSessionResponse"/> gave it.</param>
/// <param name="InstanceId">The instance's ID, <c>{partyId}/{instanceGuid}</c>.</param>
/// <param name="DataElementId">The form data element.</param>
/// <param name="Data">The element's new data, a JSON object.</param>
public record WritePreviewFormDataRequest(
    [Required] Uri SessionUrl,
    [Required] string InstanceId,
    [Required] Guid DataElementId,
    [Required] JsonObject Data
);
