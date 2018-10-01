using AltinnCore.RepositoryClient.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AltinnCore.Common.Services.Interfaces
{
    public interface IGitea
    {
        Task<AltinnCore.RepositoryClient.Model.User> GetCurrentUser(string giteaSession);

        Task<AltinnCore.RepositoryClient.Model.Repository> CreateRepositoryForOrg(string giteaSession, string org, AltinnCore.RepositoryClient.Model.CreateRepoOption createRepoOption);

        Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page);

        string CreateAppToken(string name);
  }
}
