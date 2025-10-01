using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.AccessManagement.Models.Shared;

/// <summary>
/// Represents a resource.
/// </summary>
public class Resource
{
    /// <summary>
    /// Gets or sets the type of resource.
    /// Default value is <see cref="DelegationConst.Resource"/>.
    /// </summary>
    [JsonPropertyName("type")]
    public virtual string Type { get; set; } = DelegationConst.Resource;

    /// <summary>
    /// Gets or sets the value.
    /// </summary>
    [JsonPropertyName("value")]
    public required string Value { get; set; }
}

/// <summary>
/// Represents an app resource.
/// </summary>
public class AppResource : Resource
{
    /// <summary>
    /// Gets or sets the type of resource.
    /// Default value is <see cref="DelegationConst.App"/>.
    /// </summary>
    [JsonPropertyName("type")]
    public override string Type { get; set; } = DelegationConst.App;
}

/// <summary>
/// Represents an org resource.
/// </summary>
public class OrgResource : Resource
{
    /// <summary>
    /// Gets or sets the type of resource.
    /// Default value is <see cref="DelegationConst.Org"/>.
    /// </summary>
    [JsonPropertyName("type")]
    public override string Type { get; set; } = DelegationConst.Org;
}

/// <summary>
/// Represents a task resource.
/// </summary>
public class TaskResource : Resource
{
    /// <summary>
    /// Gets or sets the type of resource.
    /// Default value is <see cref="DelegationConst.Task"/>.
    /// </summary>
    [JsonPropertyName("type")]
    public override string Type { get; set; } = DelegationConst.Task;
}
