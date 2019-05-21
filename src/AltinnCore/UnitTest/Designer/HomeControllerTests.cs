using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Controllers;
using AltinnCore.RepositoryClient.Model;
using AltinnCore.UnitTest.Helpers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace AltinnCore.UnitTest.Designer
{
    /// <summary>
    /// Tests for HomeController in designer application
    /// </summary>
    public class HomeControllerTests
    {
        /// <summary>
        /// Verifies that 7 repositories is returned.
        /// </summary>
        [Fact]
        public void Index_GetSevenReposFromOrgWhereFourIsClonedLocallyAllListed()
        {
            // Arrange
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = new Mock<IOptions<ServiceRepositorySettings>>();
            Moq.Mock<IGitea> moqGiteaWrapper = IGiteaMockHelper.GetMock();
            IGiteaMockHelper.AddSevenReposForOrg1(moqGiteaWrapper);

            Moq.Mock<ISourceControl> moqSourceControl = this.GetMoqSourceControlForIndexTest();

            RepositorySearch repositorySearch = new RepositorySearch();

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
                moqLogger.Object,
                moqServiceRepositorySettings.Object,
                moqGiteaWrapper.Object,
                moqHttpContextAccessor.Object,
                moqSourceControl.Object);

            // Act
            ActionResult result = controller.Index(repositorySearch);

            // Assert
            ViewResult viewResult = Assert.IsType<ViewResult>(result);
            AltinnStudioViewModel model = Assert.IsAssignableFrom<AltinnStudioViewModel>(viewResult.Model);
            Assert.Equal(7, model.Repositories.Count);
        }

        /// <summary>
        /// Test verifies that non cloned repos is returned
        /// </summary>
        [Fact]
        public void Index_GetSevenReposFromOrgWhereFourIsClonedLocallyOnlyLocallyClonedListed()
        {
            // Arrange
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = new Mock<IOptions<ServiceRepositorySettings>>();
            Moq.Mock<IGitea> moqGiteaWrappeer = IGiteaMockHelper.GetMock();
            IGiteaMockHelper.AddSevenReposForOrg1(moqGiteaWrappeer);

            Moq.Mock<ISourceControl> moqSourceControl = this.GetMoqSourceControlForIndexTest();

            RepositorySearch repositorySearch = new RepositorySearch();
            repositorySearch.OnlyLocalRepositories = true;

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
                moqLogger.Object,
                moqServiceRepositorySettings.Object,
                moqGiteaWrappeer.Object,
                moqHttpContextAccessor.Object,
                moqSourceControl.Object);

            // Act
            ActionResult result = controller.Index(repositorySearch);

            // Assert
            ViewResult viewResult = Assert.IsType<ViewResult>(result);
            AltinnStudioViewModel model = Assert.IsAssignableFrom<AltinnStudioViewModel>(viewResult.Model);
            Assert.Equal(4, model.Repositories.Count);
        }

        /// <summary>
        /// This test verifies that user is redirected to start page if user is not logged in
        /// </summary>
        [Fact]
        public void StartPage_NotLoggedInUser()
        {
            // Arrange
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = SettingsHelper.GetMoqServiceRepositorySettings();
         
            Moq.Mock<IGitea> moqGiteaWrappeer = IGiteaMockHelper.GetMock();
            IGiteaMockHelper.AddSevenReposForOrg1(moqGiteaWrappeer);

            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(moqLogger.Object, moqServiceRepositorySettings.Object, moqGiteaWrappeer.Object, moqHttpContextAccessor.Object, moqSourceControl.Object)
            { ControllerContext = ControllerContextHelper.GetControllerContextWithValidGiteaSession("234543556") };

            // Act
            ActionResult result = controller.StartPage();

            // Assert
            ViewResult viewResult = Assert.IsType<ViewResult>(result);
            Assert.Equal("StartPage", viewResult.ViewName);
        }

        /// <summary>
        /// This test verifies that user is redirected to start page if user is logged in
        /// </summary>
        [Fact]
        public void StartPage_LoggedInUser()
        {
            // Arrange
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = SettingsHelper.GetMoqServiceRepositorySettings();

            Moq.Mock<IGitea> moqGiteaWrappeer = IGiteaMockHelper.GetMock();
            IGiteaMockHelper.AddSevenReposForOrg1(moqGiteaWrappeer);

            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            moqGiteaWrappeer.Setup(g => g.GetUserNameFromUI()).ReturnsAsync("Test");
       
            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
            moqLogger.Object,
            moqServiceRepositorySettings.Object,
            moqGiteaWrappeer.Object,
            moqHttpContextAccessor.Object,
            moqSourceControl.Object)
            { ControllerContext = ControllerContextHelper.GetControllerContextWithValidGiteaSession("234543556") };

            // Act
            ActionResult result = controller.StartPage();

            // Assert
            RedirectToActionResult redirectResult = Assert.IsType<RedirectToActionResult>(result);
            Assert.Equal("Index", redirectResult.ActionName);
            Assert.Equal("Home", redirectResult.ControllerName);
        }

        /// <summary>
        /// This tests logs in a user
        /// </summary>
        [Fact]
        public void Login_LogInUser()
        {
            // Arrange
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = SettingsHelper.GetMoqServiceRepositorySettings();

            Moq.Mock<IGitea> moqGiteaWrappeer = IGiteaMockHelper.GetMock();
            IGiteaMockHelper.AddSevenReposForOrg1(moqGiteaWrappeer);

            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            moqGiteaWrappeer.Setup(g => g.GetUserNameFromUI()).ReturnsAsync("Test");

            moqGiteaWrappeer.Setup(g => g.GetSessionAppKey(null)).ReturnsAsync(new System.Collections.Generic.KeyValuePair<string, string>("123", "Test"));

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
            moqLogger.Object,
            moqServiceRepositorySettings.Object,
            moqGiteaWrappeer.Object,
            moqHttpContextAccessor.Object,
            moqSourceControl.Object)
            { ControllerContext = ControllerContextHelper.GetControllerContextWithValidGiteaSession("234543556", true) };

            // Act
            Task<IActionResult> result = controller.Login();

            // Assert
            LocalRedirectResult redirectResult = Assert.IsType<LocalRedirectResult>(result.Result);
            Assert.Equal("/", redirectResult.Url);
        }

        /// <summary>
        /// Unit test that verifies user logout
        /// </summary>
        [Fact]
        public void Login_LogOutUser()
        {
            // Arrange
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = SettingsHelper.GetMoqServiceRepositorySettings();

            Moq.Mock<IGitea> moqGiteaWrapper = IGiteaMockHelper.GetMock();
            IGiteaMockHelper.AddSevenReposForOrg1(moqGiteaWrapper);

            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            User user = new User();
            user.Login = "Test";
            moqGiteaWrapper.Setup(g => g.GetCurrentUser()).ReturnsAsync(user);

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
                moqLogger.Object,
                moqServiceRepositorySettings.Object,
                moqGiteaWrapper.Object,
                moqHttpContextAccessor.Object,
                moqSourceControl.Object)
            { ControllerContext = ControllerContextHelper.GetControllerContextWithValidGiteaSession("234543556", true) };

            // Act
            Task<IActionResult> result = controller.Logout();

            // Assert
            LocalRedirectResult redirectResult = Assert.IsType<LocalRedirectResult>(result.Result);
            Assert.Equal("/user/logout", redirectResult.Url);
        }

        private Moq.Mock<ISourceControl> GetMoqSourceControlForIndexTest()
        {
            Moq.Mock<ISourceControl> moqSourceControl = new Mock<ISourceControl>();
            moqSourceControl.Setup(source => source.IsLocalRepo(It.Is<string>(d => d.Equals("Org1")), It.Is<string>(n => n.Equals("Org1RepoA")))).Returns(false);
            moqSourceControl.Setup(source => source.IsLocalRepo(It.Is<string>(d => d.Equals("Org1")), It.Is<string>(n => n.Equals("Org1RepoB")))).Returns(true);
            moqSourceControl.Setup(source => source.IsLocalRepo(It.Is<string>(d => d.Equals("Org1")), It.Is<string>(n => n.Equals("Org1RepoC")))).Returns(true);
            moqSourceControl.Setup(source => source.IsLocalRepo(It.Is<string>(d => d.Equals("Org1")), It.Is<string>(n => n.Equals("Org1RepoD")))).Returns(false);
            moqSourceControl.Setup(source => source.IsLocalRepo(It.Is<string>(d => d.Equals("Org1")), It.Is<string>(n => n.Equals("Org1RepoE")))).Returns(true);
            moqSourceControl.Setup(source => source.IsLocalRepo(It.Is<string>(d => d.Equals("Org1")), It.Is<string>(n => n.Equals("Org1RepoF")))).Returns(false);
            moqSourceControl.Setup(source => source.IsLocalRepo(It.Is<string>(d => d.Equals("Org1")), It.Is<string>(n => n.Equals("Org1RepoG")))).Returns(true);

            return moqSourceControl;
        }
    }
}
