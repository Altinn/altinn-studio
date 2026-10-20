using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Evaluators;

/// <summary>
/// Decides whether the developer can use the assistant on a repository, and which organization the usage is
/// recorded on. The developer can use the assistant when there is an organization to record the usage on.
/// </summary>
public interface ICanUseAiAssistantEvaluator : ICanUseFeatureEvaluator
{
    /// <summary>
    /// The cost organization for the developer's own repository when the developer is a member of more than one
    /// organization that can use the assistant. Service owners do not pay for the assistant at this time.
    /// Thus, Designer does not ask the developer to select an organization.
    /// </summary>
    const string UnattributedCostOrg = "unattributed";

    /// <summary>
    /// Gets the organization that the assistant usage is recorded on, for the repository that
    /// <paramref name="org"/> owns. For the repository of an organization, this is that organization.
    /// For the developer's own repository, this is the organization that the developer is a member of and that can
    /// use the assistant. If there is more than one, this is <see cref="UnattributedCostOrg"/>.
    /// </summary>
    /// <returns>The cost organization. Null if the developer cannot use the assistant on this repository.</returns>
    Task<string?> ResolveCostOrg(string org, string app);
}
