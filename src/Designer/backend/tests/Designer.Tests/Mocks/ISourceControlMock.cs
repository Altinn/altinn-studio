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

        public async Task<string> CloneRemoteRepository(AltinnRepoEditingContext editingContext)
        {
            await Task.CompletedTask;
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(editingContext.Org, editingContext.Repo);
            string localPath = TestDataHelper.GetTestDataRepositoryDirectory(editingContext.Org, editingContext.Repo, _developer);
            Directory.CreateDirectory(localPath);
            TestDataHelper.CopyDirectory(remotePath, localPath, true).Wait();

            return localPath;
        }

        public async Task<string> CloneRemoteRepository(AltinnRepoEditingContext editingContext, string destination, string branchName = "")
        {
            await Task.CompletedTask;
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(editingContext.Org, editingContext.Repo);

            Directory.CreateDirectory(destination);
            TestDataHelper.CopyDirectory(remotePath, destination, true).Wait();

            return destination;
        }

        public void Commit(CommitInfo commitInfo, AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public async Task CommitAndPushChanges(AltinnRepoEditingContext editingContext, string branchName, string localPath, string message, string accessToken = "")
        {
            await Task.CompletedTask;
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(editingContext.Org, editingContext.Repo);

            if (!string.IsNullOrEmpty(branchName))
            {
                remotePath += $"_branch_{branchName}";
            }

            TestDataHelper.CopyDirectory(localPath, remotePath, true).Wait();
        }

        public static Task CreateBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            return Task.CompletedTask;
        }

        public Task<bool> CreatePullRequest(AltinnRepoEditingContext editingContext, string target, string source, string title)
        {
            return Task.FromResult(true);
        }

        public Task DeleteRepository(AltinnRepoEditingContext editingContext)
        {
            return Task.CompletedTask;
        }

        public Task FetchRemoteChanges(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public Task<string> GetDeployToken()
        {
            throw new NotImplementedException();
        }

        public Commit GetLatestCommitForCurrentUser(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public bool IsLocalRepo(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public List<Commit> Log(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public Task<RepoStatus> PullRemoteChanges(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public Dictionary<string, string> GetChangedContent(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public Task<bool> Push(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public Task PushChangesForRepository(CommitInfo commitInfo, AltinnRepoEditingContext editingContext)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(commitInfo.Org, commitInfo.Repository);
            string localPath = TestDataHelper.GetTestDataRepositoryDirectory(commitInfo.Org, commitInfo.Repository, _developer);
            TestDataHelper.CopyDirectory(localPath, remotePath, true).Wait();
            return Task.CompletedTask;
        }

        public RepoStatus RepositoryStatus(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public void StageChange(AltinnRepoEditingContext editingContext, string fileName)
        {
            throw new NotImplementedException();
        }

        public List<RepositoryContent> Status(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public void StoreAppTokenForUser(string token, string developer)
        {
            throw new NotImplementedException();
        }

        public Task CloneIfNotExists(AltinnRepoEditingContext editingContext) => Task.CompletedTask;

        Task<Branch> ISourceControl.CreateBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            return Task.FromResult(new Branch { Name = branchName });
        }

        public string FindLocalRepoLocation(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
        public void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
        public void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message) => throw new NotImplementedException();
        public LibGit2Sharp.RebaseResult RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
        public void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
        public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null) => throw new NotImplementedException();
        public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch) => throw new NotImplementedException();
        public CurrentBranchInfo GetCurrentBranch(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
        public Task<RepoStatus> CheckoutBranchWithValidation(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
        public RepoStatus DiscardLocalChanges(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
        public Task DeleteRemoteBranchIfExists(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
        public Task PublishBranch(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
        public Task FetchGitNotes(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    }
}
