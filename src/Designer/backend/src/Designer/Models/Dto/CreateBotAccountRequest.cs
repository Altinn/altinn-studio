using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class CreateBotAccountRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    [RegularExpression(
        @"^[a-z0-9_]+$",
        ErrorMessage = "Name must contain only lowercase letters, digits, and underscores."
    )]
    public string Name { get; set; } = string.Empty;

    public string[]? DeployEnvironments { get; set; }
}
