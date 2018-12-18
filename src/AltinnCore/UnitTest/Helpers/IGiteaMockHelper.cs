using System;
using System.Collections.Generic;
using System.Text;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using Moq;

namespace AltinnCore.UnitTest.Helpers
{
    /// <summary>
    /// Helper class to 
    /// </summary>
    public static class IGiteaMockHelper
    {
        /// <summary>
        /// Returns a Mock object without setup for IGitea
        /// </summary>
        /// <returns>Mock object</returns>
        public static Moq.Mock<IGitea> GetMock()
        {
            Moq.Mock<IGitea> moqGiteaWrapper = new Mock<IGitea>();
            return moqGiteaWrapper;
        }

        /// <summary>
        /// Method that add Seven repos for Org 1 to the mock
        /// </summary>
        /// <param name="moqGiteaWrapper">The Mock</param>
        public static void AddSevenReposForOrg1(Mock<IGitea> moqGiteaWrapper)
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
            moqGiteaWrapper.Setup(gitea => gitea.SearchRepository(It.IsAny<bool>(), It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(search);
        }

        /// <summary>
        /// Adds a organization for the mock setup for method GetUserOrganization
        /// </summary>
       /// <param name="moqGiteaWrapper">The mock object</param>
        public static void AddListWithOneOrganization(Mock<IGitea> moqGiteaWrapper)
        {
            List<Organization> orgs = new List<Organization>();
            orgs.Add(new Organization() { FullName = "Org 1" });
  
            moqGiteaWrapper.Setup(gitea => gitea.GetUserOrganizations(It.IsAny<string>())).ReturnsAsync(orgs);
        }

        /// <summary>
        /// Build the Gitea mock with a configured user
        /// </summary>
        /// <param name="moqGiteaWrapper">The mock</param>
        public static void GetCurrentUser_ReturnsOne(Mock<IGitea> moqGiteaWrapper)
        {
            User user = new User() { Login = "MockUser" };
            moqGiteaWrapper.Setup(gitea => gitea.GetCurrentUser(It.IsAny<string>())).ReturnsAsync(user);
        }

        /// <summary>
        /// Add a Mock organization to the mock
        /// </summary>
        /// <param name="moqGiteaWrapper">The Gitea mock</param>
        public static void AddOneOrg(Mock<IGitea> moqGiteaWrapper)
        {
            Organization organization = new Organization() { Username = "MockOrg" };
            moqGiteaWrapper.Setup(gitea => gitea.GetOrganization(It.IsAny<string>())).ReturnsAsync(organization);
        }
    }
}
