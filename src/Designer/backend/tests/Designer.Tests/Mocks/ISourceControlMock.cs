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

        public string CloneRemoteRepository(AltinnAuthenticatedRepoEditingContext authenticatedEditingContext)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(authenticatedEditingContext.Org, authenticatedEditingContext.Repo);
            string localPath = TestDataHelper.GetTestDataRepositoryDirectory(authenticatedEditingContext.Org, authenticatedEditingContext.Repo, _developer);
            Directory.CreateDirectory(localPath);
            TestDataHelper.CopyDirectory(remotePath, localPath, true).Wait();

            return localPath;
        }

        public string CloneRemoteRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext, string destination, string branchName = "")
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(authenticatedContext.Org, authenticatedContext.Repo);

            Directory.CreateDirectory(destination);
            TestDataHelper.CopyDirectory(remotePath, destination, true).Wait();

            return destination;
        }

        public void Commit(CommitInfo commitInfo, AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public void CommitAndPushChanges(AltinnRepoEditingContext editingContext, string branchName, string localPath, string message, string accessToken = "")
        {
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

        public void FetchRemoteChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext)
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

        public RepoStatus PullRemoteChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            throw new NotImplementedException();
        }

        public Dictionary<string, string> GetChangedContent(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            throw new NotImplementedException();
        }

        public bool Push(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            throw new NotImplementedException();
        }

        public void PushChangesForRepository(CommitInfo commitInfo, AltinnRepoEditingContext editingContext)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(commitInfo.Org, commitInfo.Repository);
            string localPath = TestDataHelper.GetTestDataRepositoryDirectory(commitInfo.Org, commitInfo.Repository, _developer);
            TestDataHelper.CopyDirectory(localPath, remotePath, true).Wait();
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

        public void CloneIfNotExists(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            return;
        }

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
        public RepoStatus CheckoutBranchWithValidation(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName) => throw new NotImplementedException();
        public RepoStatus DiscardLocalChanges(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
        public void DeleteRemoteBranchIfExists(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName) => throw new NotImplementedException();
        public void PublishBranch(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName) => throw new NotImplementedException();
        public void FetchGitNotes(AltinnAuthenticatedRepoEditingContext authenticatedContext) => throw new NotImplementedException();
    }
}
