using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Evaluators;

public interface ICanUseAiAssistantEvaluator : ICanUseFeatureEvaluator
{
    /// <summary>
    /// Gets the organization that the assistant usage is recorded on, for the repository that
    /// <paramref name="org"/> owns. For the repository of an organization, this is that organization.
    /// For the developer's own repository, this is the organization that the developer is a member of and that can
    /// use the assistant. If there is more than one, this is
    /// <see cref="CanUseAiAssistantEvaluator.UnattributedCostOrg"/>.
    /// </summary>
    /// <returns>The cost organization. Null if the developer cannot use the assistant on this repository.</returns>
    Task<string?> ResolveCostOrg(string org, string app);
}
