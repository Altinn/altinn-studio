using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Designer.Tests.Services
{
    public class UserServiceTests
    {
        private readonly Mock<IHttpContextAccessor> _httpContextAccessor;
        private readonly Mock<IGitea> _giteaApi;

        public UserServiceTests()
        {
            _httpContextAccessor = new Mock<IHttpContextAccessor>();
            _giteaApi = new Mock<IGitea>();
            var context = new DefaultHttpContext();
            _httpContextAccessor.Setup(req => req.HttpContext).Returns(context);
        }

        [Theory]
        [InlineData("org1", false)]
        [InlineData("org2", true)]
        public async Task GetUserRepositoryPermission_ReturnsCorrectPermission(string org, bool expectedCanCreate)
        {
            var teams = new List<Team>
            {
                new Team
                {
                    Organization = new Organization { Username = org },
                    can_create_org_repo = expectedCanCreate
                }
            };

            _giteaApi.Setup(api => api.GetTeams()).ReturnsAsync(teams);

            var userService = new UserService(_httpContextAccessor.Object, _giteaApi.Object);

            var result = await userService.GetUserRepositoryPermission(org);

            Assert.NotNull(result);
            Assert.Equal(expectedCanCreate, result.CanCreateOrgRepo);
        }
    }
}
