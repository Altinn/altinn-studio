using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.RepositoryClient.Model;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Gitea wrapper
    /// </summary>
    public interface IGitea
    {
        /// <summary>
        /// Get the current user
        /// </summary>
        /// <param name="giteaSession"></param>
        /// <returns></returns>
        Task<AltinnCore.RepositoryClient.Model.User> GetCurrentUser(string giteaSession);

        /// <summary>
        /// Create repository for th organisation
        /// </summary>
        /// <param name="giteaSession"></param>
        /// <param name="org"></param>
        /// <param name="createRepoOption"></param>
        /// <returns></returns>
        Task<AltinnCore.RepositoryClient.Model.Repository> CreateRepositoryForOrg(string giteaSession, string org, AltinnCore.RepositoryClient.Model.CreateRepoOption createRepoOption);

        /// <summary>
        /// Search the repository for the given parameters
        /// </summary>
        /// <param name="onlyAdmin"></param>
        /// <param name="keyWord"></param>
        /// <param name="page"></param>
        /// <returns></returns>
        Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page);

        /// <summary>
        /// Create app token
        /// </summary>
        /// <param name="name"></param>
        /// <returns></returns>
        string CreateAppToken(string name);
  }
}
