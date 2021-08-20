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

        public void AbortMerge(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public void CheckoutLatestCommitForSpecificFile(string org, string repository, string fileName)
        {
            throw new NotImplementedException();
        }

        public int? CheckRemoteUpdates(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public string CloneRemoteRepository(string org, string repository)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, repository);
            string localPath = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, _developer);

            Directory.CreateDirectory(localPath);
            TestDataHelper.CopyDirectory(remotePath, localPath, true).ConfigureAwait(false);

            return localPath;
        }

        public string CloneRemoteRepository(string org, string repository, string destination, string branchName = "")
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, repository);

            Directory.CreateDirectory(destination);
            TestDataHelper.CopyDirectory(remotePath, destination, true).ConfigureAwait(false);

            return destination;
        }

        public void Commit(CommitInfo commitInfo)
        {
            throw new NotImplementedException();
        }

        public void CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(org, repository);

            if (!string.IsNullOrEmpty(branchName))
            {
                remotePath += $"_branch_{branchName}";
            }

            TestDataHelper.CopyDirectory(localPath, remotePath, true).ConfigureAwait(false);
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

        public void FetchRemoteChanges(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public string GetAppToken()
        {
            throw new NotImplementedException();
        }

        public string GetAppTokenId()
        {
            throw new NotImplementedException();
        }

        public Task<string> GetDeployToken()
        {
            throw new NotImplementedException();
        }

        public Commit GetInitialCommit(string org, string repository)
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

        public RepoStatus PullRemoteChanges(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<bool> Push(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public void PushChangesForRepository(CommitInfo commitInfo)
        {
            string remotePath = TestDataHelper.GetTestDataRemoteRepository(commitInfo.Org, commitInfo.Repository);
            string localPath = TestDataHelper.GetTestDataRepositoryDirectory(commitInfo.Org, commitInfo.Repository, _developer);
            TestDataHelper.CopyDirectory(localPath, remotePath, true).ConfigureAwait(false);
        }

        public RepoStatus RepositoryStatus(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public void ResetCommit(string org, string repository)
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

        public void VerifyCloneExists(string org, string repository)
        {
            throw new NotImplementedException();
        }

        Task<Branch> ISourceControl.CreateBranch(string org, string repository, string branchName)
        {
            return Task.FromResult(new Branch { Name = branchName });
        }
    }
}
