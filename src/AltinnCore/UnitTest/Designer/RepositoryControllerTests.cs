using System;
using System.Collections.Generic;
using System.Text;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using AltinnCore.UnitTest.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace AltinnCore.UnitTest.Designer
{
    /// <summary>
    /// Unit tests for Repository controller
    /// </summary>
    public class RepositoryControllerTests
    {
        /// <summary>
        /// Test scenario: Call API for user that have access to org 1 repository. Seven
        /// </summary>
        [Fact]
        public void Search_SevenRepos()
        {
            // Arrange
            Moq.Mock<IGitea> moqGitea = IGiteaMockHelper.GetSevenReposForOrg1();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = new Mock<IOptions<ServiceRepositorySettings>>();

            AltinnCore.Designer.Controllers.RepositoryController controller = new AltinnCore.Designer.Controllers.RepositoryController(moqGitea.Object, moqServiceRepositorySettings.Object);
            RepositorySearch repositorySearch = new RepositorySearch();

            // Act
            List<Repository> result = controller.Search(repositorySearch);

            // Assert
            Assert.Equal(7, result.Count);
        }

        /// <summary>
        /// Scenario that returns 
        /// </summary>
        [Fact]
        public void Organizations_GetOrgs()
        {
            // Arrange
            Moq.Mock<IGitea> moqGitea = IGiteaMockHelper.GetOneOrganization();
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = SettingsHelper.GetMoqServiceRepositorySettings();

            AltinnCore.Designer.Controllers.RepositoryController controller = new AltinnCore.Designer.Controllers.RepositoryController(moqGitea.Object, moqServiceRepositorySettings.Object) { ControllerContext = ControllerContextHelper.GetControllerContextWithValidGiteaSession("234543556", false) };
            RepositorySearch repositorySearch = new RepositorySearch();

            // Act
            List<Organization> result = controller.Organizations();

            // Assert
            Assert.Equal(1, result.Count);
        }
    }
}
