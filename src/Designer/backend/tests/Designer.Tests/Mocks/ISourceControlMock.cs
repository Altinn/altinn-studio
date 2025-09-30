using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;

namespace Designer.Tests.Mocks
{
    public class ISourceControlMock : ISourceControl
    {
        private string _developer;

        public ISourceControlMock(string developer = "testUser")
        {
            _developer = developer;
        }

        public int? CheckRemoteUpdates(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public async Task<string> CloneRemoteRepository(string org, string repository)
        {
            await Task.CompletedTask;
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, repository);
            string localPath = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, _developer);

            Directory.CreateDirectory(localPath);
            TestDataHelper.CopyDirectory(remotePath, localPath, true).Wait();

            return localPath;
        }

        public async Task<string> CloneRemoteRepository(string org, string repository, string destination, string branchName = "")
        {
            await Task.CompletedTask;
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, repository);

            Directory.CreateDirectory(destination);
            TestDataHelper.CopyDirectory(remotePath, destination, true).Wait();

            return destination;
        }

        public void Commit(CommitInfo commitInfo)
        {
            throw new NotImplementedException();
        }

        public async Task CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message)
        {
            await Task.CompletedTask;
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, repository);

            if (!string.IsNullOrEmpty(branchName))
            {
                remotePath += $"_branch_{branchName}";
            }

            TestDataHelper.CopyDirectory(localPath, remotePath, true).Wait();
        }

        public static Task CreateBranch(string org, string repository, string branchName)
        {
            return Task.CompletedTask;
        }

        public Task<bool> CreatePullRequest(string org, string repository, string target, string source, string title)
        {
            return Task.FromResult(true);
        }

        public Task DeleteRepository(string org, string repository)
        {
            return Task.CompletedTask;
        }

        public Task FetchRemoteChanges(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<string> GetDeployToken()
        {
            throw new NotImplementedException();
        }

        public Commit GetLatestCommitForCurrentUser(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public bool IsLocalRepo(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public List<Commit> Log(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<RepoStatus> PullRemoteChanges(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<Dictionary<string, string>> GetChangedContent(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<bool> Push(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task PushChangesForRepository(CommitInfo commitInfo)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(commitInfo.Org, commitInfo.Repository);
            string localPath = TestDataHelper.GetTestDataRepositoryDirectory(commitInfo.Org, commitInfo.Repository, _developer);
            TestDataHelper.CopyDirectory(localPath, remotePath, true).Wait();
            return Task.CompletedTask;
        }

        public RepoStatus RepositoryStatus(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public void StageChange(string org, string repository, string fileName)
        {
            throw new NotImplementedException();
        }

        public List<RepositoryContent> Status(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public void StoreAppTokenForUser(string token)
        {
            throw new NotImplementedException();
        }

        public Task EnsureCloneExists(string org, string repository)
        {
            throw new NotImplementedException();
        }

        Task<Branch> ISourceControl.CreateBranch(string org, string repository, string branchName)
        {
            return Task.FromResult(new Branch { Name = branchName });
        }

        public LibGit2Sharp.Branch CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();

        public void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message) => throw new NotImplementedException();

        public void RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();

        public void DeleteLocalBranch(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();

        public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null) => throw new NotImplementedException();
        public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch) => throw new NotImplementedException();
    }
}
