using System;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class CreatePersonalAccessTokenRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTimeOffset ExpiresAt { get; set; }
}
