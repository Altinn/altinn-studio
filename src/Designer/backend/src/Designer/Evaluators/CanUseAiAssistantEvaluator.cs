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
    private static readonly string[] s_allowedServiceOwners = ["ttd", "nfk", "ssb", "dat", "brg", "staf", "ikta", "nb"];

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
        return await ResolveCostOrg(org, app) is not null;
    }

    public async Task<string?> ResolveCostOrg(string org, string app)
    {
        if (IsRepositoryOwnedByDeveloper(org))
        {
            return ResolveCostOrgForOwnRepository(await GetAllowedUserOrganizations());
        }

        // Checking the allowlist first spares a Gitea request for the organizations without access.
        if (!s_allowedServiceOwners.Contains(org))
        {
            return null;
        }

        IReadOnlyList<Organization> allowedUserOrganizations = await GetAllowedUserOrganizations();
        return allowedUserOrganizations.Any(organization => organization.Username == org) ? org : null;
    }

    private static string? ResolveCostOrgForOwnRepository(IReadOnlyList<Organization> allowedUserOrganizations)
    {
        return allowedUserOrganizations.Count switch
        {
            0 => null,
            1 => allowedUserOrganizations[0].Username,
            _ => ICanUseAiAssistantEvaluator.UnattributedCostOrg,
        };
    }

    private async Task<IReadOnlyList<Organization>> GetAllowedUserOrganizations()
    {
        List<Organization>? organizations = await _giteaClient.GetUserOrganizations();
        if (organizations == null)
        {
            return [];
        }

        return organizations.Where(organization => s_allowedServiceOwners.Contains(organization.Username)).ToList();
    }

    private bool IsRepositoryOwnedByDeveloper(string org)
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
