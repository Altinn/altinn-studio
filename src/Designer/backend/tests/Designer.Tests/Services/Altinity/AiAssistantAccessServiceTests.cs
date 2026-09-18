using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Altinity;

public class AiAssistantAccessServiceTests
{
    private const string AllowedOrg = "ttd";
    private const string App = "test-app";
    private const string Developer = "kari";

    private readonly Mock<IGiteaClient> _giteaClient = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationService = new();

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsTheOrg_WhenRepositoryBelongsToAnAllowedServiceOwner()
    {
        IsMemberOf(AllowedOrg);

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(AllowedOrg, App);

        Assert.Equal(AllowedOrg, serviceOwner);
        _giteaClient.Verify(g => g.GetRepository(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsTheParentOrg_WhenRepositoryIsAForkOfAnAllowedServiceOwner()
    {
        SetupRepository(Developer, App, parentOwner: AllowedOrg);
        IsMemberOf(AllowedOrg);

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(Developer, App);

        Assert.Equal(AllowedOrg, serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenDeveloperIsNotAMemberOfTheParentOrg()
    {
        SetupRepository(Developer, App, parentOwner: AllowedOrg);

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(Developer, App);

        Assert.Null(serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenRepositoryIsAForkOfANonAllowedOrg()
    {
        SetupRepository(Developer, App, parentOwner: "other-org");
        IsMemberOf("other-org");

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(Developer, App);

        Assert.Null(serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenRepositoryIsNotAFork()
    {
        SetupRepository(Developer, App, parentOwner: null);

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(Developer, App);

        Assert.Null(serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenRepositoryDoesNotExist()
    {
        _giteaClient.Setup(g => g.GetRepository(Developer, App)).ReturnsAsync((Repository)null);

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(Developer, App);

        Assert.Null(serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenDeveloperIsNotAMemberOfTheOwningOrg()
    {
        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(AllowedOrg, App);

        Assert.Null(serviceOwner);
    }

    private AiAssistantAccessService CreateService()
    {
        return new AiAssistantAccessService(_giteaClient.Object, _userOrganizationService.Object);
    }

    private void IsMemberOf(string org)
    {
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization(org)).ReturnsAsync(true);
    }

    private void SetupRepository(string owner, string app, string parentOwner)
    {
        var repository = new Repository
        {
            Parent = parentOwner is null ? null : new Repository { Owner = new User { Login = parentOwner } },
        };
        _giteaClient.Setup(g => g.GetRepository(owner, app)).ReturnsAsync(repository);
    }
}
