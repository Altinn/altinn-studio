using System;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// A preview session that Designer started for the developer.
/// </summary>
/// <param name="Url">The URL that opens the app in preview. It holds the session's secret ID.</param>
public record PreviewSessionResponse(Uri Url);
