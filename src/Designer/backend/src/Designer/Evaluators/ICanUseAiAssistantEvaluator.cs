using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;

namespace Altinn.Studio.Designer.Evaluators;

public interface ICanUseAiAssistantEvaluator : ICanUseFeatureEvaluator
{
    /// <summary>
    /// Gets the organizations the developer can charge assistant usage to.
    /// </summary>
    Task<IReadOnlyList<Organization>> GetEligibleCostOrgsAsync();

    /// <summary>
    /// Resolves which organization pays for assistant usage in the repository owned by <paramref name="org"/>.
    /// An organization's repository is always charged to its owner. The developer's own repository is charged
    /// to <paramref name="requestedCostOrg"/>, which must be one of <see cref="GetEligibleCostOrgsAsync"/>.
    /// </summary>
    /// <returns>The cost organization, or null when the developer cannot use the assistant on this repository.</returns>
    Task<string?> ResolveCostOrgAsync(string org, string app, string? requestedCostOrg);
}
