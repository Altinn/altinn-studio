using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Altinity;

public class AiAssistantAccessServiceTests
{
    private const string AllowedOrg = "ttd";

    private readonly Mock<IUserOrganizationService> _userOrganizationService = new();

    [Fact]
    public async Task HasAccessAsync_ReturnsTrue_WhenDeveloperIsMemberOfAnAllowedServiceOwner()
    {
        IsMemberOf(AllowedOrg);

        Assert.True(await CreateService().HasAccessAsync(AllowedOrg));
    }

    [Fact]
    public async Task HasAccessAsync_ReturnsFalse_WhenDeveloperIsNotAMemberOfTheOrg()
    {
        Assert.False(await CreateService().HasAccessAsync(AllowedOrg));
    }

    [Fact]
    public async Task HasAccessAsync_ReturnsFalse_WhenOrgIsNotAnAllowedServiceOwner()
    {
        IsMemberOf("other-org");

        Assert.False(await CreateService().HasAccessAsync("other-org"));
    }

    private AiAssistantAccessService CreateService()
    {
        return new AiAssistantAccessService(_userOrganizationService.Object);
    }

    private void IsMemberOf(string org)
    {
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization(org)).ReturnsAsync(true);
    }
}
