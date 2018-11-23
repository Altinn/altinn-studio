using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Controllers;
using AltinnCore.RepositoryClient.Model;
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
            Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();

            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = new Mock<IOptions<ServiceRepositorySettings>>();
            Moq.Mock<IGitea> moqGiteaWrappeer = this.GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = this.GetMoqSourceControlForIndexTest();

            RepositorySearch repositorySearch = new RepositorySearch();

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
                moqRepository.Object,
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
            Assert.Equal(7, model.Repositories.Count);
        }

        /// <summary>
        /// Test verifies that non cloned repos is returned
        /// </summary>
        [Fact]
        public void Index_GetSevenReposFromOrgWhereFourIsClonedLocallyOnlyLocallyClonedListed()
        {
            // Arrange
            Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();

            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = new Mock<IOptions<ServiceRepositorySettings>>();
            Moq.Mock<IGitea> moqGiteaWrappeer = this.GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = this.GetMoqSourceControlForIndexTest();

            RepositorySearch repositorySearch = new RepositorySearch();
            repositorySearch.OnlyLocalRepositories = true;

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
                moqRepository.Object,
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
            Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = GetMoqServiceRepositorySettings();
         
            Moq.Mock<IGitea> moqGiteaWrappeer = GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            DefaultHttpContext httpContext = new DefaultHttpContext();

            var cookies = new[] { "i_like_gitea=234543556" };

            httpContext.Request.Headers["Cookie"] = cookies;
            var controllerContext = new ControllerContext()
            {
                HttpContext = httpContext,
            };

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(moqRepository.Object, moqLogger.Object, moqServiceRepositorySettings.Object, moqGiteaWrappeer.Object, moqHttpContextAccessor.Object, moqSourceControl.Object)
            { ControllerContext = controllerContext };

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
            Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = GetMoqServiceRepositorySettings();

            Moq.Mock<IGitea> moqGiteaWrappeer = GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            User user = new User();
            moqGiteaWrappeer.Setup(g => g.GetCurrentUser(It.IsAny<string>())).ReturnsAsync(user);

            DefaultHttpContext httpContext = new DefaultHttpContext();

            var cookies = new[] { "i_like_gitea=234543556" };

            httpContext.Request.Headers["Cookie"] = cookies;
            var controllerContext = new ControllerContext()
            {
                HttpContext = httpContext,
            };

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
            moqRepository.Object,
            moqLogger.Object,
            moqServiceRepositorySettings.Object,
            moqGiteaWrappeer.Object,
            moqHttpContextAccessor.Object,
            moqSourceControl.Object)
            { ControllerContext = controllerContext };

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
            Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = GetMoqServiceRepositorySettings();

            Moq.Mock<IGitea> moqGiteaWrappeer = GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            Mock<IServiceProvider> serviceProviderMock = GetServiceProviderMock();

            User user = new User();
            user.Login = "Test";
            moqGiteaWrappeer.Setup(g => g.GetCurrentUser(It.IsAny<string>())).ReturnsAsync(user);

            DefaultHttpContext httpContext = new DefaultHttpContext() { RequestServices = serviceProviderMock.Object };

            var cookies = new[] { "i_like_gitea=234543556" };

            httpContext.Request.Headers["Cookie"] = cookies;
            var controllerContext = new ControllerContext()
            {
                HttpContext = httpContext,
            };

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
            moqRepository.Object,
            moqLogger.Object,
            moqServiceRepositorySettings.Object,
            moqGiteaWrappeer.Object,
            moqHttpContextAccessor.Object,
            moqSourceControl.Object)
            { ControllerContext = controllerContext };

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
            Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = GetMoqServiceRepositorySettings();

            Moq.Mock<IGitea> moqGiteaWrappeer = GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            Mock<IServiceProvider> serviceProviderMock = GetServiceProviderMock();

            User user = new User();
            user.Login = "Test";
            moqGiteaWrappeer.Setup(g => g.GetCurrentUser(It.IsAny<string>())).ReturnsAsync(user);

            DefaultHttpContext httpContext = new DefaultHttpContext() { RequestServices = serviceProviderMock.Object };

            var cookies = new[] { "i_like_gitea=234543556" };

            httpContext.Request.Headers["Cookie"] = cookies;
            var controllerContext = new ControllerContext()
            {
                HttpContext = httpContext,
            };

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
                moqRepository.Object,
                moqLogger.Object,
                moqServiceRepositorySettings.Object,
                moqGiteaWrappeer.Object,
                moqHttpContextAccessor.Object,
                moqSourceControl.Object)
            { ControllerContext = controllerContext };

            // Act
            Task<IActionResult> result = controller.Logout();

            // Assert
            LocalRedirectResult redirectResult = Assert.IsType<LocalRedirectResult>(result.Result);
            Assert.Equal("/user/logout", redirectResult.Url);
        }

        /// <summary>
        /// Verifies adding app token.
        /// </summary>
        [Fact]
        public void RegisterAppToken()
        {
            // Arrange
            Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();
            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = GetMoqServiceRepositorySettings();

            Moq.Mock<IGitea> moqGiteaWrappeer = GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            Mock<IServiceProvider> serviceProviderMock = GetServiceProviderMock();

            User user = new User();
            user.Login = "Test";
            moqGiteaWrappeer.Setup(g => g.GetCurrentUser(It.IsAny<string>())).ReturnsAsync(user);

            DefaultHttpContext httpContext = new DefaultHttpContext() { RequestServices = serviceProviderMock.Object };

            var cookies = new[] { "i_like_gitea=234543556" };

            httpContext.Request.Headers["Cookie"] = cookies;
            var controllerContext = new ControllerContext()
            {
                HttpContext = httpContext,
            };

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(
            moqRepository.Object,
            moqLogger.Object,
            moqServiceRepositorySettings.Object,
            moqGiteaWrappeer.Object,
            moqHttpContextAccessor.Object,
            moqSourceControl.Object)
            { ControllerContext = controllerContext };

            AppKey key = new AppKey() { Key = "12345" };

            // Act
            IActionResult result = controller.AppToken(key);

            // Assert
            RedirectResult redirectResult = Assert.IsType<RedirectResult>(result);
            Assert.Equal("/", redirectResult.Url);
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

        private Moq.Mock<IGitea> GetMoqGiteaWrapperForIndexTest()
        {
            SearchResults search = new SearchResults();
            search.Data = new System.Collections.Generic.List<Repository>();
            search.Data.Add(new Repository() { Name = "Org1RepoA", Owner = new User() { Login = "Org1" } });
            search.Data.Add(new Repository() { Name = "Org1RepoB", Owner = new User() { Login = "Org1" } });
            search.Data.Add(new Repository() { Name = "Org1RepoC", Owner = new User() { Login = "Org1" } });
            search.Data.Add(new Repository() { Name = "Org1RepoD", Owner = new User() { Login = "Org1" } });
            search.Data.Add(new Repository() { Name = "Org1RepoE", Owner = new User() { Login = "Org1" } });
            search.Data.Add(new Repository() { Name = "Org1RepoF", Owner = new User() { Login = "Org1" } });
            search.Data.Add(new Repository() { Name = "Org1RepoG", Owner = new User() { Login = "Org1" } });
            Moq.Mock<IGitea> moqGiteaWrappeer = new Mock<IGitea>();
            moqGiteaWrappeer.Setup(gitea => gitea.SearchRepository(It.IsAny<bool>(), It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(search);
            return moqGiteaWrappeer;
        }

        private Moq.Mock<IOptions<ServiceRepositorySettings>> GetMoqServiceRepositorySettings()
        {
            ServiceRepositorySettings settings = new ServiceRepositorySettings();
            settings.GiteaCookieName = "i_like_gitea";
            settings.ForceGiteaAuthentication = true;
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = new Mock<IOptions<ServiceRepositorySettings>>();
            moqServiceRepositorySettings.Setup(r => r.Value).Returns(settings);
            return moqServiceRepositorySettings;
        }

        private Mock<IServiceProvider> GetServiceProviderMock()
        {
            Mock<IAuthenticationService> authServiceMock = new Mock<IAuthenticationService>();
            authServiceMock
                .Setup(_ => _.SignInAsync(It.IsAny<HttpContext>(), It.IsAny<string>(), It.IsAny<ClaimsPrincipal>(), It.IsAny<AuthenticationProperties>()))
                .Returns(Task.FromResult((object)null));

            authServiceMock
            .Setup(_ => _.SignOutAsync(It.IsAny<HttpContext>(), It.IsAny<string>(), It.IsAny<AuthenticationProperties>()))
            .Returns(Task.FromResult((object)null));

            Mock<IServiceProvider> serviceProviderMock = new Mock<IServiceProvider>();
            serviceProviderMock
                .Setup(_ => _.GetService(typeof(IAuthenticationService)))
                .Returns(authServiceMock.Object);

            return serviceProviderMock;
        }
    }
}
