using System.Collections.Generic;
using Microsoft.Build.Framework;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Services.Models;

public class EnvironmentsModel
{
    /// <summary>
    /// Environments
    /// </summary>
    [Required]
    [JsonProperty("environments")]
    public List<EnvironmentModel> Environments { get; set; }
}
