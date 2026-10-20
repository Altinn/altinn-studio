using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Designer.Tests.Evaluators;

public class CanUseAiAssistantEvaluatorTests
{
    private const string Developer = "testUser";
    private const string AllowedOrg = "ttd";
    private const string OtherAllowedOrg = "nfk";
    private const string App = "test-app";

    private readonly Mock<IGiteaClient> _giteaClient = new();

    [Fact]
    public void Feature_ReturnsCorrectEnum()
    {
        Assert.Equal(CanUseFeatureEnum.AiAssistant, CreateEvaluator().Feature);
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsTrue_WhenDeveloperIsMemberOfAnAllowedServiceOwner()
    {
        SetupMemberships(AllowedOrg);

        Assert.True(await CreateEvaluator().CanUseFeatureAsync(AllowedOrg, App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_WhenDeveloperIsNotAMemberOfTheOrg()
    {
        SetupMemberships(OtherAllowedOrg);

        Assert.False(await CreateEvaluator().CanUseFeatureAsync(AllowedOrg, App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_WhenOrgIsNotAnAllowedServiceOwner()
    {
        SetupMemberships("org-without-access");

        Assert.False(await CreateEvaluator().CanUseFeatureAsync("org-without-access", App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_DoesNotCallGitea_WhenOrgIsNotAnAllowedServiceOwner()
    {
        await CreateEvaluator().CanUseFeatureAsync("org-without-access", App);

        _giteaClient.Verify(c => c.GetUserOrganizations(), Times.Never);
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsTrue_ForOwnRepository_WhenDeveloperHasAnEligibleCostOrg()
    {
        SetupMemberships(AllowedOrg);

        Assert.True(await CreateEvaluator().CanUseFeatureAsync(Developer, App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_ForOwnRepository_WhenDeveloperHasNoEligibleCostOrg()
    {
        SetupMemberships("org-without-access");

        Assert.False(await CreateEvaluator().CanUseFeatureAsync(Developer, App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_ForAnotherUsersRepository()
    {
        SetupMemberships(AllowedOrg);

        Assert.False(await CreateEvaluator().CanUseFeatureAsync("anotherUser", App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_ForOwnRepository_WhenGiteaReturnsNoOrganizations()
    {
        _giteaClient.Setup(c => c.GetUserOrganizations()).ReturnsAsync((List<Organization>)null);

        Assert.False(await CreateEvaluator().CanUseFeatureAsync(Developer, App));
    }

    [Fact]
    public async Task ResolveCostOrg_ReturnsRepositoryOwner_ForOrgRepository()
    {
        SetupMemberships(AllowedOrg, OtherAllowedOrg);

        Assert.Equal(AllowedOrg, await CreateEvaluator().ResolveCostOrg(AllowedOrg, App));
    }

    [Fact]
    public async Task ResolveCostOrg_ReturnsNull_ForOrgRepository_WithoutAccess()
    {
        SetupMemberships(OtherAllowedOrg);

        Assert.Null(await CreateEvaluator().ResolveCostOrg(AllowedOrg, App));
    }

    [Fact]
    public async Task ResolveCostOrg_ReturnsTheOnlyEligibleOrg_ForOwnRepository()
    {
        SetupMemberships(OtherAllowedOrg, "org-without-access");

        Assert.Equal(OtherAllowedOrg, await CreateEvaluator().ResolveCostOrg(Developer, App));
    }

    [Fact]
    public async Task ResolveCostOrg_ReturnsUnattributed_ForOwnRepository_WithSeveralEligibleOrgs()
    {
        SetupMemberships(AllowedOrg, OtherAllowedOrg);

        Assert.Equal(
            ICanUseAiAssistantEvaluator.UnattributedCostOrg,
            await CreateEvaluator().ResolveCostOrg(Developer, App)
        );
    }

    [Fact]
    public async Task ResolveCostOrg_ReturnsNull_ForOwnRepository_WithoutEligibleOrgs()
    {
        SetupMemberships("org-without-access");

        Assert.Null(await CreateEvaluator().ResolveCostOrg(Developer, App));
    }

    [Fact]
    public async Task ResolveCostOrg_ReturnsNull_ForAnotherUsersRepository()
    {
        SetupMemberships(AllowedOrg);

        Assert.Null(await CreateEvaluator().ResolveCostOrg("anotherUser", App));
    }

    private void SetupMemberships(params string[] orgs)
    {
        _giteaClient
            .Setup(c => c.GetUserOrganizations())
            .ReturnsAsync([.. orgs.Select(org => new Organization(username: org))]);
    }

    private CanUseAiAssistantEvaluator CreateEvaluator()
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, Developer)], "TestUserLogin");
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor
            .Setup(a => a.HttpContext)
            .Returns(new DefaultHttpContext { User = new ClaimsPrincipal(identity) });
        return new CanUseAiAssistantEvaluator(_giteaClient.Object, httpContextAccessor.Object);
    }
}
