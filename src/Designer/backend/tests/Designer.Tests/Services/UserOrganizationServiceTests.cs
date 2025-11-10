using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class UserOrganizationServiceTests
{
    [Fact]
    public async Task UserIsMemberOfAnyOrganization_ShouldReturnTrue_WhenOrganizationsExist()
    {
        var giteaMock = new Mock<IGitea>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization> { new Organization { FullName = "Org1" } });

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfAnyOrganization();

        Assert.True(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfAnyOrganization_ShouldReturnFalse_WhenNoOrganizationsExist()
    {
        var giteaMock = new Mock<IGitea>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization>());

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfAnyOrganization();

        Assert.False(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfOrganization_ShouldReturnTrue_WhenMember()
    {
        var giteaMock = new Mock<IGitea>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization> { new Organization { Username = "ttd" } });

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfOrganization("ttd");

        Assert.True(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfOrganization_ShouldReturnFalse_WhenNotMember()
    {
        var giteaMock = new Mock<IGitea>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization> { new Organization { Username = "ttd" } });

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfOrganization("digdir");

        Assert.False(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfOrganization_ShouldReturnFalse_WhenNoOrganizationsExist()
    {
        var giteaMock = new Mock<IGitea>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization>());

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfOrganization("ttd");

        Assert.False(isMember);
    }
}
