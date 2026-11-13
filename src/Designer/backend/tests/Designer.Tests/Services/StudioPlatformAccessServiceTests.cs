using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class StudioPlatformAccessServiceTests
{
    private readonly Mock<IGiteaClient> _giteaClient = new();
    private readonly StudioPlatformAccessSettings _settings = new() { Org = "ttd", Team = "Studio-Platform" };

    [Theory]
    [InlineData("ttd", "Studio-Platform", true)]
    [InlineData("TTD", "studio-platform", true)]
    [InlineData("ttd", "Admin-TT02", false)]
    [InlineData("skd", "Studio-Platform", false)]
    public async Task HasPlatformAccessAsync_ShouldRequireTheConfiguredTeamInTheConfiguredOrg(
        string org,
        string team,
        bool expected
    )
    {
        _giteaClient
            .Setup(c => c.GetTeams())
            .ReturnsAsync([
                new Team
                {
                    Name = team,
                    Organization = new Organization { Username = org },
                },
            ]);

        Assert.Equal(expected, await CreateService().HasPlatformAccessAsync());
    }

    [Fact]
    public async Task HasPlatformAccessAsync_WhenTeamsCannotBeRead_ShouldDeny()
    {
        _giteaClient.Setup(c => c.GetTeams()).ReturnsAsync((List<Team>)null);

        Assert.False(await CreateService().HasPlatformAccessAsync());
    }

    private StudioPlatformAccessService CreateService() => new(_giteaClient.Object, _settings);
}
