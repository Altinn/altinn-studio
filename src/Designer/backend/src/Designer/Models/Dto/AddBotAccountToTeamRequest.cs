using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class AddBotAccountToTeamRequest
{
    [Required]
    [MinLength(1)]
    public string Environment { get; set; } = string.Empty;
}
