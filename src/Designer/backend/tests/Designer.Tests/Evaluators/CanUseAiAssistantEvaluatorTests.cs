using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Evaluators;

public class CanUseAiAssistantEvaluatorTests
{
    private const string AllowedOrg = "ttd";
    private const string App = "test-app";

    private readonly Mock<IUserOrganizationService> _userOrganizationService = new();

    [Fact]
    public void Feature_ReturnsCorrectEnum()
    {
        Assert.Equal(CanUseFeatureEnum.AiAssistant, CreateEvaluator().Feature);
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsTrue_WhenDeveloperIsMemberOfAnAllowedServiceOwner()
    {
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization(AllowedOrg)).ReturnsAsync(true);

        Assert.True(await CreateEvaluator().CanUseFeatureAsync(AllowedOrg, App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_WhenDeveloperIsNotAMemberOfTheOrg()
    {
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization(AllowedOrg)).ReturnsAsync(false);

        Assert.False(await CreateEvaluator().CanUseFeatureAsync(AllowedOrg, App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_WhenOrgIsNotAnAllowedServiceOwner()
    {
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization("org-without-access")).ReturnsAsync(true);

        Assert.False(await CreateEvaluator().CanUseFeatureAsync("org-without-access", App));
    }

    private CanUseAiAssistantEvaluator CreateEvaluator()
    {
        return new CanUseAiAssistantEvaluator(_userOrganizationService.Object);
    }
}
