using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Controllers;
using AltinnCore.RepositoryClient.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System;
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
            Moq.Mock<IGitea> moqGiteaWrappeer = GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            RepositorySearch repositorySearch = new RepositorySearch();

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(moqRepository.Object, moqLogger.Object,
                moqServiceRepositorySettings.Object, moqGiteaWrappeer.Object,moqHttpContextAccessor.Object,  moqSourceControl.Object);

            // Act
            ActionResult result = controller.Index(repositorySearch);

            // Assert
            ViewResult viewResult = Assert.IsType<ViewResult>(result);
            AltinnStudioViewModel model = Assert.IsAssignableFrom<AltinnStudioViewModel>(viewResult.Model);
            Assert.Equal(7, model.Repositories.Count);
        }

        [Fact]
        public void Index_GetSevenReposFromOrgWhereFourIsClonedLocallyOnlyLocallyClonedListed()
        {
            // Arrange
            Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();

            Moq.Mock<ILogger<HomeController>> moqLogger = new Mock<ILogger<HomeController>>();
            Moq.Mock<IHttpContextAccessor> moqHttpContextAccessor = new Mock<IHttpContextAccessor>();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = new Mock<IOptions<ServiceRepositorySettings>>();
            Moq.Mock<IGitea> moqGiteaWrappeer = GetMoqGiteaWrapperForIndexTest();
            Moq.Mock<ISourceControl> moqSourceControl = GetMoqSourceControlForIndexTest();

            RepositorySearch repositorySearch = new RepositorySearch();
            repositorySearch.OnlyLocalRepositories = true;

            AltinnCore.Designer.Controllers.HomeController controller = new AltinnCore.Designer.Controllers.HomeController(moqRepository.Object, moqLogger.Object,
                moqServiceRepositorySettings.Object, moqGiteaWrappeer.Object, moqHttpContextAccessor.Object, moqSourceControl.Object);

            // Act
            ActionResult result = controller.Index(repositorySearch);

            // Assert
            ViewResult viewResult = Assert.IsType<ViewResult>(result);
            AltinnStudioViewModel model = Assert.IsAssignableFrom<AltinnStudioViewModel>(viewResult.Model);
            Assert.Equal(4, model.Repositories.Count);
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

    }
}
