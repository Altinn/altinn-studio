using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Organization = Altinn.Studio.Designer.RepositoryClient.Model.Organization;

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

        public Task<bool> DeleteRepository(string org, string repository)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, repository);
            TestDataHelper.DeleteDirectory(remotePath, true);

            return Task.FromResult(true);
        }

        public Task<Branch> GetBranch(string org, string repository, string branch)
        {
            throw new NotImplementedException();
        }

        public Task<List<Branch>> GetBranches(string org, string repository)
        {
            List<Branch> branches =
            [
                new Branch
                {
                    Name = "master",
                    Commit = new PayloadCommit
                    {
                        Id = "1234567890abcdef1234567890abcdef12345678"
                    }
                },
                new Branch
                {
                    Name = "develop",
                    Commit = new PayloadCommit
                    {
                        Id = "abcdef1234567890abcdef1234567890abcdef12"
                    }
                }
            ];
            return Task.FromResult(branches);
        }

        public Task<User> GetCurrentUser()
        {
            return Task.FromResult(new User());
        }

        public Task<List<FileSystemObject>> GetDirectoryAsync(string org, string app, string directoryPath, string reference = null, CancellationToken cancellationToken = default)
        {
            List<FileSystemObject> fileSystemObjects = new List<FileSystemObject>();
            string path = Path.Combine(_unitTestFolder, "..", "..", "..", "_TestData", "FileSystemObjects", org, app, directoryPath.Replace('/', Path.DirectorySeparatorChar), reference, "directoryList.json");

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

            string path = Path.Combine(_unitTestFolder, "..", "..", "..", "_TestData", "FileSystemObjects", org, app, filePath.Replace('/', Path.DirectorySeparatorChar));

            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);

                fileSystemObject = System.Text.Json.JsonSerializer.Deserialize<FileSystemObject>(content);
            }

            return Task.FromResult(fileSystemObject);
        }

        public Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string reference = null, CancellationToken cancellationToken = default)
        {
            return GetFileAsync(org, app, filePath, reference);
        }

        public Task<Repository> GetRepository(string org, string repository)
        {
            Repository returnRepository = null;

            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, repository);

            if (Directory.Exists(remotePath))
            {
                returnRepository = new Repository
                {
                    FullName = repository
                };
            }

            return Task.FromResult(returnRepository);
        }

        public Task<KeyValuePair<string, string>?> GetSessionAppKey(string keyName = null)
        {
            KeyValuePair<string, string>? token = new KeyValuePair<string, string>("asdfasdf", "sadfsdaf");
            return Task.FromResult(token);
        }

        public Task<List<Team>> GetTeams()
        {
            List<Team> teamWithDeployAccess = new()
            {
                new Team { Name = "Deploy-TestEnv", Organization = new Organization { Username = "ttd" } },
                new Team { Name = "Resources-Publish-TestEnv", Organization = new Organization { Username = "ttd" } },
                new Team { Name = "Resources-Publish-TT02", Organization = new Organization { Username = "ttd" } },
                new Team { Name = "AccessLists-TestEnv", Organization = new Organization { Username = "ttd" } }
            };
            return Task.FromResult(teamWithDeployAccess);
        }

        public Task<List<Organization>> GetUserOrganizations()
        {
            var organizations = new List<Organization>
            {
                new Organization { Username = "Org1", Id = 1 }, // Example items
                new Organization { Username = "Org2", Id = 2 }
            };

            return Task.FromResult(organizations);
        }

        public Task<IList<Repository>> GetUserRepos()
        {
            throw new NotImplementedException();
        }

        private static string GetTextsResourcePath(string filePath, string shortCommitId)
        {
            string[] pathArray = filePath.Split("/");

            return $"{string.Join("/", pathArray.Take(pathArray.Length - 1))}/{shortCommitId}/{pathArray.Last()}";
        }

        public async Task<bool> CreatePullRequest(string org, string app, CreatePullRequestOption createPullRequestOption)
        {
            return await Task.FromResult(true);
        }

        public async Task<Branch> CreateBranch(string org, string repository, string branchName)
        {
            Branch branch = new Branch { Name = branchName };
            return await Task.FromResult(branch);
        }

        public async Task<IList<Repository>> GetOrgRepos(string org)
        {
            return org == "ttd" ? await Task.FromResult(new List<Repository> { new Repository() { FullName = "ttd-resources" } }).ConfigureAwait(false) : new List<Repository>();
        }

        public async Task<IList<Repository>> GetStarred()
        {
            return await Task.FromResult(new List<Repository> { new Repository() { Name = "repoName" } });
        }

        public Task<bool> PutStarred(string org, string repository)
        {
            return Task.FromResult(true);
        }

        public Task<bool> DeleteStarred(string org, string repository)
        {
            return Task.FromResult(true);
        }

        public Task<SearchResults> SearchRepo(SearchOptions searchOption)
        {
            throw new NotImplementedException();
        }

        public Task<ListviewServiceResource> MapServiceResourceToListViewResource(string org, string repo, ServiceResource serviceResource)
        {
            return Task.FromResult(new ListviewServiceResource { CreatedBy = "testUser", Identifier = serviceResource.Identifier, Title = new Dictionary<string, string> { { "test", "test" } }, LastChanged = DateTime.Now, HasPolicy = true });
        }

        public Task<List<FileSystemObject>> GetCodeListDirectoryContentAsync(string org, string repository, string reference = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new List<FileSystemObject>());
        }

        public Task<bool> ModifyMultipleFiles(string org, string repository, GiteaMultipleFilesDto files, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(true);
        }

        public Task<string> GetLatestCommitOnBranch(string org, string repository, string branchName = null) => throw new NotImplementedException();
    }
}
