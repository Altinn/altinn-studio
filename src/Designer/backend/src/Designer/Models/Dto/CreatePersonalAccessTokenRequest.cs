using System;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class CreatePersonalAccessTokenRequest
{
    [Required]
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    [Required]
    public DateTimeOffset ExpiresAt { get; set; }
}
