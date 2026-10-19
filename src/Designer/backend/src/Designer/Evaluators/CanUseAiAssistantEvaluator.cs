using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Evaluators;

public class CanUseAiAssistantEvaluator : ICanUseAiAssistantEvaluator
{
    /// <summary>
    /// Service owners with access during the beta.
    /// </summary>
    private static readonly string[] s_allowedServiceOwners = ["ttd", "nfk", "ssb", "dat", "brg", "staf", "ikta"];

    /// <summary>
    /// The cost organization for the developer's own repository when the developer is a member of more than one
    /// organization that can use the assistant. Service owners do not pay for the assistant at this time.
    /// Thus, Designer does not ask the developer to select an organization.
    /// </summary>
    public const string UnattributedCostOrg = "unattributed";

    private readonly IGiteaClient _giteaClient;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CanUseFeatureEnum Feature => CanUseFeatureEnum.AiAssistant;

    public CanUseAiAssistantEvaluator(IGiteaClient giteaClient, IHttpContextAccessor httpContextAccessor)
    {
        _giteaClient = giteaClient;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<bool> CanUseFeatureAsync(string org, string app)
    {
        IReadOnlyList<Organization> eligibleCostOrgs = await GetEligibleCostOrgs();
        if (IsDevelopersOwnRepository(org))
        {
            return eligibleCostOrgs.Count > 0;
        }

        return eligibleCostOrgs.Any(costOrg => costOrg.Username == org);
    }

    private async Task<IReadOnlyList<Organization>> GetEligibleCostOrgs()
    {
        List<Organization>? organizations = await _giteaClient.GetUserOrganizations();
        if (organizations == null)
        {
            return [];
        }

        return organizations.Where(organization => s_allowedServiceOwners.Contains(organization.Username)).ToList();
    }

    public async Task<string?> ResolveCostOrg(string org, string app)
    {
        if (!IsDevelopersOwnRepository(org))
        {
            return await CanUseFeatureAsync(org, app) ? org : null;
        }

        IReadOnlyList<Organization> eligibleCostOrgs = await GetEligibleCostOrgs();
        return eligibleCostOrgs.Count switch
        {
            0 => null,
            1 => eligibleCostOrgs[0].Username,
            _ => UnattributedCostOrg,
        };
    }

    private bool IsDevelopersOwnRepository(string org)
    {
        HttpContext context =
            _httpContextAccessor.HttpContext ?? throw new InvalidOperationException("No HTTP context available");
        return string.Equals(
            org,
            AuthenticationHelper.GetDeveloperUserName(context),
            StringComparison.OrdinalIgnoreCase
        );
    }
}
