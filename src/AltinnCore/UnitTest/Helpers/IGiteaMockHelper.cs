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
        /// Method that returns of 7 repos for Org1
        /// </summary>
        /// <returns>The list of repos</returns>
        public static Moq.Mock<IGitea> GetSevenReposForOrg1()
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

        /// <summary>
        /// Returns a Gitea Mock 
        /// </summary>
        /// <returns>A moq with 3 organizations</returns>
        public static Moq.Mock<IGitea> GetOneOrganization()
        {
            List<Organization> orgs = new List<Organization>();
            orgs.Add(new Organization() { FullName = "Org 1" });
  
            Moq.Mock<IGitea> moqGiteaWrappeer = new Mock<IGitea>();
            moqGiteaWrappeer.Setup(gitea => gitea.GetUserOrganizations(It.IsAny<string>())).ReturnsAsync(orgs);
            return moqGiteaWrappeer;
        }
    }
}
