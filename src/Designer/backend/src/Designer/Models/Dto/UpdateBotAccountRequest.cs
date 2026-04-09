using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class UpdateBotAccountRequest
{
    [Required]
    public List<string> DeployEnvironments { get; set; } = null!;
}
