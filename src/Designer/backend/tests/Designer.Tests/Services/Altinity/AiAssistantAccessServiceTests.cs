using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Altinity;

public class AiAssistantAccessServiceTests
{
    private const string AllowedOrg = "ttd";
    private const string App = "test-app";
    private const string Developer = "kari";

    private readonly Mock<IGiteaClient> _giteaClient = new();
    private readonly List<Team> _teams = new();

    public AiAssistantAccessServiceTests()
    {
        _giteaClient.Setup(g => g.GetTeams()).ReturnsAsync(_teams);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsTheOrg_WhenDeveloperIsInTheAssistantTeamOfAnAllowedServiceOwner()
    {
        IsMemberOfTeam(AllowedOrg, "AiAssistant");

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(AllowedOrg, App);

        Assert.Equal(AllowedOrg, serviceOwner);
        _giteaClient.Verify(g => g.GetRepository(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenDeveloperIsInTheOrgButNotInTheAssistantTeam()
    {
        IsMemberOfTeam(AllowedOrg, "Devs");

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(AllowedOrg, App);

        Assert.Null(serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenAssistantTeamBelongsToAnotherOrg()
    {
        IsMemberOfTeam("other-org", "AiAssistant");

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(AllowedOrg, App);

        Assert.Null(serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenOrgIsNotAnAllowedServiceOwner()
    {
        IsMemberOfTeam("other-org", "AiAssistant");
        SetupRepository("other-org", App, parentOwner: null);

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync("other-org", App);

        Assert.Null(serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsTheParentOrg_WhenForkParentGrantsTheAssistantTeam()
    {
        SetupRepository(Developer, App, parentOwner: AllowedOrg);
        IsMemberOfTeam(AllowedOrg, "AiAssistant");

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(Developer, App);

        Assert.Equal(AllowedOrg, serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenDeveloperIsNotInTheParentOrgAssistantTeam()
    {
        SetupRepository(Developer, App, parentOwner: AllowedOrg);
        IsMemberOfTeam(AllowedOrg, "Devs");

        string serviceOwner = await CreateService().ResolveServiceOwnerAsync(Developer, App);

        Assert.Null(serviceOwner);
    }

    [Fact]
    public async Task ResolveServiceOwnerAsync_ReturnsNull_WhenRepositoryIsAForkOfANonAllowedOrg()
    {
        SetupRepository(Developer, App, parentOwner: "other-org");
        IsMemberOfTeam("other-org", "AiAssistant");

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

    private AiAssistantAccessService CreateService()
    {
        return new AiAssistantAccessService(_giteaClient.Object);
    }

    private void IsMemberOfTeam(string org, string teamName)
    {
        _teams.Add(
            new Team
            {
                Name = teamName,
                Organization = new Organization { Username = org },
            }
        );
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
