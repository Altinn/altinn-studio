using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

using Designer.Tests.Utils;

namespace Designer.Tests.Mocks
{
    public class IGiteaMock : IGitea
    {
        private string _unitTestFolder = Path.GetDirectoryName(new Uri(typeof(IGiteaMock).Assembly.Location).LocalPath);

        public Task<Repository> CreateRepository(string org, CreateRepoOption options)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, options.Name);
            Repository repo = new Repository
            {
                Name = options.Name
            };

            if (Directory.Exists(remotePath))
            {
                repo.RepositoryCreatedStatus = System.Net.HttpStatusCode.Conflict;
                return Task.FromResult(repo);
            }

            Directory.CreateDirectory(remotePath);
            repo.RepositoryCreatedStatus = System.Net.HttpStatusCode.Created;

            return Task.FromResult(repo);
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
            List<FileSystemObject> fileSystemObjects = new List<FileSystemObject>();

            string path = Path.Combine(_unitTestFolder, $@"..\..\..\_TestData\FileSystemObjects\{org}\{app}\{directoryPath.Replace('/', '\\')}{shortCommitId}\directoryList.json");

            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);

                fileSystemObjects = System.Text.Json.JsonSerializer.Deserialize<List<FileSystemObject>>(content);
            }

            return Task.FromResult(fileSystemObjects);
        }

        public Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string shortCommitId)
        {
            FileSystemObject fileSystemObject = null;

            if (filePath.Contains("config/texts"))
            {
                filePath = GetTextsResourcePath(filePath, shortCommitId);
            }

            string path = Path.Combine(_unitTestFolder, $@"..\..\..\_TestData\FileSystemObjects\{org}\{app}\{filePath.Replace('/', '\\')}");

            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);

                fileSystemObject = System.Text.Json.JsonSerializer.Deserialize<FileSystemObject>(content);
            }

            return Task.FromResult(fileSystemObject);
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

        private static string GetTextsResourcePath(string filePath, string shortCommitId)
        {
            string[] pathArray = filePath.Split("/");

            return $"{string.Join("/", pathArray.Take(pathArray.Length - 1))}/{shortCommitId}/{pathArray.Last()}";
        }
    }
}
