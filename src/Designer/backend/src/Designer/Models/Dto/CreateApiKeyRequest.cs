using System;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class CreateApiKeyRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    [RegularExpression(@".*\S.*", ErrorMessage = "Name cannot be whitespace only.")]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTimeOffset ExpiresAt { get; set; }
}
