using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class UserOrganizationServiceTests
{
    [Fact]
    public async Task UserIsMemberOfAnyOrganization_ShouldReturnTrue_WhenUserOrganizationsExist()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization> { new Organization { Username = "Org1" } });

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfAnyOrganization();

        Assert.True(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfAnyOrganization_ShouldReturnFalse_WhenNoUserOrganizationsExist()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization>());

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfAnyOrganization();

        Assert.False(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfOrganization_ShouldReturnTrue_WhenMember()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization> { new Organization { Username = "ttd" } });

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfOrganization("ttd");

        Assert.True(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfOrganization_ShouldReturnFalse_WhenNotMember()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization> { new Organization { Username = "ttd" } });

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfOrganization("digdir");

        Assert.False(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfOrganization_ShouldReturnFalse_WhenNoUserOrganizationsExist()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization>());

        var service = new UserOrganizationService(giteaMock.Object);

        bool isMember = await service.UserIsMemberOfOrganization("ttd");

        Assert.False(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfAnyOf_ShouldReturnTrue_WhenMatchingOrgInList()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization> { new Organization { Username = "Org1" } });

        var service = new UserOrganizationService(giteaMock.Object);
        List<string> allowedOrgs = ["Org1", "Org2"];

        bool isMember = await service.UserIsMemberOfAnyOf(allowedOrgs);

        Assert.True(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfAnyOf_ShouldReturnFalse_WhenNotMatchingOrgInList()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization> { new Organization { Username = "Org1" } });

        var service = new UserOrganizationService(giteaMock.Object);
        List<string> allowedOrgs = ["Org2", "Org3"];

        bool isMember = await service.UserIsMemberOfAnyOf(allowedOrgs);

        Assert.False(isMember);
    }

    [Fact]
    public async Task UserIsMemberOfAnyOf_ShouldReturnFalse_WhenNoUserOrganizationsExist()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync(new List<Organization>());

        var service = new UserOrganizationService(giteaMock.Object);
        List<string> allowedOrgs = ["Org1", "Org2"];

        bool isMember = await service.UserIsMemberOfAnyOf(allowedOrgs);

        Assert.False(isMember);
    }
}
