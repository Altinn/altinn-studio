using Altinn.Studio.Designer.Enums;
using Altinn.Studio.PolicyAdmin.Models;

namespace Altinn.Studio.Designer.Models;

public class ResourceWithAltinn2Subject
{
    /// <summary>
    /// The identifier of the resource
    /// </summary>
    public string? Identifier { get; set; }

    /// <summary>
    /// The resource policy
    /// </summary>
    public ResourcePolicy? Policy { get; set; }

    /// <summary>
    /// The resource type
    /// </summary>
    public ResourceType? ResourceType { get; set; }
}
