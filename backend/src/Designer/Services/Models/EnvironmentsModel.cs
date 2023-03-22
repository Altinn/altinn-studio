using System.Collections.Generic;
using System.Text.Json.Serialization;
using Microsoft.Build.Framework;

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
