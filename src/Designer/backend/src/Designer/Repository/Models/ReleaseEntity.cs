#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Repository.Models;

/// <summary>
/// Release entity for a db
/// </summary>
public class ReleaseEntity : BaseEntity
{
    /// <summary>
    /// TagName
    /// </summary>
    [JsonProperty("tagName")]
    public string TagName { get; set; }

    /// <summary>
    /// Name
    /// </summary>
    [JsonProperty("name")]
    public string Name { get; set; }

    /// <summary>
    /// Body
    /// </summary>
    [JsonProperty("body")]
    public string Body { get; set; }

    /// <summary>
    /// TargetCommitish
    /// </summary>
    [JsonProperty("targetCommitish")]
    public string TargetCommitish { get; set; }

    /// <summary>
    /// Inputs that were used to build the app release.
    /// </summary>
    [JsonProperty("buildInputs")]
    public ReleaseBuildInputsEntity BuildInputs { get; set; }

    /// <summary>
    /// Build
    /// </summary>
    [JsonProperty("build")]
    public BuildEntity Build { get; set; }
}

/// <summary>
/// Build input snapshot for a release.
/// </summary>
public class ReleaseBuildInputsEntity
{
    /// <summary>
    /// Maskinporten scopes included in the build.
    /// </summary>
    [JsonProperty("maskinportenScopes")]
    public List<string> MaskinportenScopes { get; set; }
}
