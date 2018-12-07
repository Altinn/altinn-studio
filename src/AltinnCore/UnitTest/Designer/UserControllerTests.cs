using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using AltinnCore.UnitTest.Helpers;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace AltinnCore.UnitTest.Designer
{
    /// <summary>
    /// Unit test for the user controller
    /// </summary>
    public class UserControllerTests
    {
        /// <summary>
        /// A unit test that verifes that a user is returned when logged in
        /// </summary>
        [Fact]
        public void Current_LoggedInUser()
        {
            // Arrange
            Moq.Mock<IGitea> moqGitea = IGiteaMockHelper.GetMock();
            IGiteaMockHelper.AddListWithOneOrganization(moqGitea);

            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = SettingsHelper.GetMoqServiceRepositorySettings();

            AltinnCore.Designer.Controllers.UserController controller = new AltinnCore.Designer.Controllers.UserController(moqGitea.Object, moqServiceRepositorySettings.Object) { ControllerContext = ControllerContextHelper.GetControllerContextWithValidGiteaSession("234543556") };
            RepositorySearch repositorySearch = new RepositorySearch();

            // Act
            User result = controller.Current();

            // Assert
            Assert.NotNull(result);
        }
    }
}
