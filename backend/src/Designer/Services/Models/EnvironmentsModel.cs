using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Services.Models;

public class EnvironmentsModel
{
    /// <summary>
    /// Environments
    /// </summary>
    [Required]
    [JsonPropertyName("environments")]
    public List<EnvironmentModel> Environments { get; set; }
}
