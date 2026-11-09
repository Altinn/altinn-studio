using System;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Asks for an instance at a task in a preview session that Designer started for the developer.
/// </summary>
/// <param name="SessionUrl">The session's URL, as <see cref="PreviewSessionResponse"/> gave it.</param>
/// <param name="TaskId">The task the instance starts at, which is also the name of its UI folder.</param>
public record CreatePreviewInstanceRequest(
    [Required] Uri SessionUrl,
    [Required, RegularExpression("^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$")] string TaskId
);
