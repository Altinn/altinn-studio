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
        IReadOnlyList<Organization> eligibleCostOrgs = await GetEligibleCostOrgsAsync();
        if (IsDevelopersOwnRepository(org))
        {
            return eligibleCostOrgs.Count > 0;
        }

        return eligibleCostOrgs.Any(costOrg => costOrg.Username == org);
    }

    public async Task<IReadOnlyList<Organization>> GetEligibleCostOrgsAsync()
    {
        List<Organization>? organizations = await _giteaClient.GetUserOrganizations();
        if (organizations == null)
        {
            return [];
        }

        return organizations.Where(organization => s_allowedServiceOwners.Contains(organization.Username)).ToList();
    }

    public async Task<string?> ResolveCostOrgAsync(string org, string app, string? requestedCostOrg)
    {
        if (!IsDevelopersOwnRepository(org))
        {
            bool requestsOtherCostOrg = requestedCostOrg != null && requestedCostOrg != org;
            return !requestsOtherCostOrg && await CanUseFeatureAsync(org, app) ? org : null;
        }

        if (requestedCostOrg == null)
        {
            return null;
        }

        IReadOnlyList<Organization> eligibleCostOrgs = await GetEligibleCostOrgsAsync();
        return eligibleCostOrgs.Any(costOrg => costOrg.Username == requestedCostOrg) ? requestedCostOrg : null;
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
