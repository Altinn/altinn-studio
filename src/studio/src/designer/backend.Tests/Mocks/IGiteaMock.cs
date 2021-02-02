using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Designer.Tests.Mocks
{
    public class IGiteaMock : IGitea
    {
        public Task<Repository> CreateRepository(string org, CreateRepoOption options)
        {
            throw new NotImplementedException();
        }

        public Task<Branch> GetBranch(string org, string repository, string branch)
        {
            throw new NotImplementedException();
        }

        public Task<List<Branch>> GetBranches(string org, string repo)
        {
            throw new NotImplementedException();
        }

        public Task<User> GetCurrentUser()
        {
           return Task.FromResult(new User());
        }

        public Task<List<FileSystemObject>> GetDirectoryAsync(string org, string app, string directoryPath, string shortCommitId)
        {
            throw new NotImplementedException();
        }

        public Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string shortCommitId)
        {
            throw new NotImplementedException();
        }

        public Task<Repository> GetRepository(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<KeyValuePair<string, string>?> GetSessionAppKey(string keyName = null)
        {
            KeyValuePair<string, string>? token = new KeyValuePair<string, string>("asdfasdf", "sadfsdaf");
            return Task.FromResult(token);
        }

        public Task<List<Team>> GetTeams()
        {
            throw new NotImplementedException();
        }

        public Task<string> GetUserNameFromUI()
        {
            return Task.FromResult("testUser");
        }

        public Task<List<Organization>> GetUserOrganizations()
        {
            throw new NotImplementedException();
        }

        public Task<IList<Repository>> GetUserRepos()
        {
            throw new NotImplementedException();
        }

        public Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page)
        {
            throw new NotImplementedException();
        }
    }
}
