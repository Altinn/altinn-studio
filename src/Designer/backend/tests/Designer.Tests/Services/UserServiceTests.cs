using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Designer.Tests.Services
{
    public class UserServiceTests
    {
        private readonly Mock<IGiteaClient> _giteaClientMock;

        public UserServiceTests()
        {
            _giteaClientMock = new Mock<IGiteaClient>();
        }

        [Theory]
        [InlineData("org1", false)]
        [InlineData("org2", true)]
        public async Task GetUserOrgPermission_ReturnsCorrectPermission(string org, bool expectedCanCreate)
        {
            var teams = new List<Team>
            {
                new()
                {
                    Organization = new Organization { Username = org }, CanCreateOrgRepo = expectedCanCreate
                }
            };

            _giteaClientMock.Setup(api => api.GetTeams()).ReturnsAsync(teams);

            var userService = new UserService(_giteaClientMock.Object);

            AltinnOrgEditingContext altinnOrgEditingContext = AltinnOrgEditingContext.FromOrgDeveloper(org, "developer");
            var result = await userService.GetUserOrgPermission(altinnOrgEditingContext);

            Assert.NotNull(result);
            Assert.Equal(expectedCanCreate, result.CanCreateOrgRepo);
        }
    }
}
