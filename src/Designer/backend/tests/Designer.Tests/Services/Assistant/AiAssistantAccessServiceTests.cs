using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Assistant;

public class AiAssistantAccessServiceTests
{
    private readonly Mock<IUserOrganizationService> _userOrganizationService = new();

    [Fact]
    public async Task HasAccessAsync_ReturnsTrue_WhenDeveloperIsMemberOfAnAllowedServiceOwner()
    {
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization("ttd")).ReturnsAsync(true);
        var accessService = new AiAssistantAccessService(_userOrganizationService.Object);

        Assert.True(await accessService.HasAccessAsync("ttd"));
    }

    [Fact]
    public async Task HasAccessAsync_ReturnsFalse_WhenDeveloperIsNotAMemberOfTheOrg()
    {
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization("ttd")).ReturnsAsync(false);
        var accessService = new AiAssistantAccessService(_userOrganizationService.Object);

        Assert.False(await accessService.HasAccessAsync("ttd"));
    }

    [Fact]
    public async Task HasAccessAsync_ReturnsFalse_WhenOrgIsNotAnAllowedServiceOwner()
    {
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization("org-without-access")).ReturnsAsync(true);
        var accessService = new AiAssistantAccessService(_userOrganizationService.Object);

        Assert.False(await accessService.HasAccessAsync("org-without-access"));
    }
}
