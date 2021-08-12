using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Models;
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

        public string CloneRemoteRepository(string org, string repository, string destination)
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
    }
}
