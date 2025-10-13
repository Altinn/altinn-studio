using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using RepositoryModel = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the API controller for functionality related to repositories.
    /// </summary>
    /// <remarks>
    /// Initializes a new instance of the <see cref="RepositoryController"/> class.
    /// </remarks>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/repos")]
    public class RepositoryController : ControllerBase
    {
        private readonly IGitea _giteaApi;
        private readonly ISourceControl _sourceControl;
        private readonly IRepository _repository;
        private readonly IHubContext<SyncHub, ISyncClient> _syncHub;

        /// <summary>
        /// This is the API controller for functionality related to repositories.
        /// </summary>
        /// <remarks>
        /// Initializes a new instance of the <see cref="RepositoryController"/> class.
        /// </remarks>
        /// <param name="giteaWrapper">the gitea wrapper</param>
        /// <param name="sourceControl">the source control</param>
        /// <param name="repository">the repository control</param>
        /// <param name="syncHub">websocket syncHub</param>
        public RepositoryController(IGitea giteaWrapper, ISourceControl sourceControl, IRepository repository, IHubContext<SyncHub, ISyncClient> syncHub)
        {
            _giteaApi = giteaWrapper;
            _sourceControl = sourceControl;
            _repository = repository;
            _syncHub = syncHub;
        }

        /// <summary>
        /// Returns a list over repositories specified by search parameters
        /// </summary>
        /// <remarks>
        /// All parameters create the search parameters
        /// </remarks>
        /// <returns>List of filtered repositories that user has access to.</returns>
        [HttpGet]
        [Route("search")]
        public async Task<SearchResults> Search([FromQuery] string keyword, [FromQuery] int uId, [FromQuery] string sortBy, [FromQuery] string order, [FromQuery] int page, [FromQuery] int limit)
        {
            SearchOptions searchOptions = new SearchOptions { Keyword = keyword, UId = uId, SortBy = sortBy, Order = order, Page = page, Limit = limit };
            SearchResults repositories = await _giteaApi.SearchRepo(searchOptions);
            return repositories;
        }

        /// <summary>
        /// Action used to copy an existing app under the current org.
        /// </summary>
        /// <remarks>
        /// A pull request is automatically created in the new repository,
        /// containing changes to ensure that the app is operational.
        /// </remarks>
        /// <returns>
        /// The newly created repository.
        /// </returns>
        [Authorize]
        [HttpPost]
        [Route("repo/{org}/copy-app")]
        public async Task<IActionResult> CopyApp(string org, [FromQuery] string sourceRepository, [FromQuery] string targetRepository, [FromQuery] string targetOrg = null)
        {
            (bool isValid, IActionResult errorResponse) = await IsValidCopyAppRequestAsync(org, sourceRepository, targetRepository, targetOrg);
            if (!isValid)
            {
                return errorResponse;
            }

            targetOrg ??= org;

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                RepositoryModel repo = await _repository.CopyRepository(org, sourceRepository, targetRepository, developer, targetOrg);

                if (repo.RepositoryCreatedStatus == HttpStatusCode.Created)
                {
                    return Created(repo.CloneUrl, repo);
                }

                await _repository.DeleteRepository(targetOrg, targetRepository);
                return StatusCode((int)repo.RepositoryCreatedStatus);
            }
            catch (Exception e)
            {
                await _repository.DeleteRepository(targetOrg, targetRepository);
                return StatusCode(500, e);
            }
        }


        private async Task<(bool IsValid, IActionResult ErrorResponse)> IsValidCopyAppRequestAsync(string org, string sourceRepository, string targetRepository, string targetOrg)
        {
            if (!string.IsNullOrWhiteSpace(targetOrg) && !AltinnRegexes.AltinnOrganizationNameRegex().IsMatch(org))
            {
                return (false, BadRequest($"{targetOrg} is not a valid name for an organization."));
            }
            try
            {
                Guard.AssertValidAppRepoName(targetRepository);
            }
            catch (ArgumentException)
            {
                return (false, BadRequest($"{targetRepository} is an invalid repository name."));
            }

            try
            {
                Guard.AssertValidAppRepoName(sourceRepository);
            }
            catch (ArgumentException)
            {
                return (false, BadRequest($"{sourceRepository} is an invalid repository name."));
            }

            string repoToCheck = targetOrg ?? org;

            var existingRepo = await _giteaApi.GetRepository(repoToCheck, targetRepository);

            if (existingRepo != null)
            {
                return (false, Conflict());
            }

            return (true, null);
        }

        /// <summary>
        /// List all repos for an organization
        /// </summary>
        /// <returns>List of repos</returns>
        [HttpGet]
        [Route("org/{org}")]
        public Task<IList<RepositoryModel>> OrgRepos(string org)
        {
            return _giteaApi.GetOrgRepos(org);
        }

        /// <summary>
        /// Action used to create a new app under the current org.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository.</param>
        /// <returns>
        /// An indication if app was created successful or not.
        /// </returns>
        [Authorize]
        [HttpPost]
        [Route("create-app")]
        public async Task<ActionResult<RepositoryModel>> CreateApp([FromQuery] string org, [FromQuery] string repository)
        {
            try
            {
                Guard.AssertValidAppRepoName(repository);
            }
            catch (ArgumentException)
            {
                return BadRequest($"{repository} is an invalid repository name.");
            }

            var config = new ServiceConfiguration { RepositoryName = repository, ServiceName = repository };

            var repositoryResult = await _repository.CreateService(org, config);
            if (repositoryResult.RepositoryCreatedStatus == HttpStatusCode.Created)
            {
                return Created(repositoryResult.CloneUrl, repositoryResult);
            }
            return StatusCode((int)repositoryResult.RepositoryCreatedStatus, repositoryResult);
        }

        /// <summary>
        /// Returns a given app repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The app repository</param>
        /// <returns>The given app repository</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/metadata")]
        public async Task<RepositoryModel> GetRepository(string org, string repository)
        {
            RepositoryModel returnRepository = await _giteaApi.GetRepository(org, repository);
            return returnRepository;
        }

        /// <summary>
        /// This method returns the status of a given repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repository</param>
        /// <returns>The repository status</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/status")]
        public async Task<RepoStatus> RepoStatus(string org, string repository)
        {
            await _sourceControl.VerifyCloneExists(org, repository);
            await _sourceControl.FetchRemoteChanges(org, repository);
            return _sourceControl.RepositoryStatus(org, repository);
        }

        /// <summary>
        /// This method returns the git diff between the local WIP commit and the latest remote commit on main for a given repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repository</param>
        /// <returns>A dictionary of modified or new files and the git diff</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/diff")]
        public async Task<Dictionary<string, string>> RepoDiff(string org, string repository)
        {
            await _sourceControl.FetchRemoteChanges(org, repository);
            return await _sourceControl.GetChangedContent(org, repository);
        }

        /// <summary>
        /// Returns the currently checked out branch in the developer's local clone.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository.</param>
        /// <returns>The branch name if available; otherwise a 204 response.</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/current-branch")]
        public async Task<ActionResult<string>> GetCurrentBranch(string org, string repository)
        {
            try
            {
                await _sourceControl.VerifyCloneExists(org, repository);
                string branchName = await _sourceControl.GetCurrentBranchName(org, repository);

                if (string.IsNullOrEmpty(branchName))
                {
                    return NoContent();
                }

                return Ok(branchName);
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Pull remote changes for a given repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">Name of the repository</param>
        /// <returns>Repo status</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/pull")]
        public async Task<RepoStatus> Pull(string org, string repository)
        {
            RepoStatus pullStatus = await _sourceControl.PullRemoteChanges(org, repository);

            RepoStatus status = _sourceControl.RepositoryStatus(org, repository);

            if (pullStatus.RepositoryStatus != Enums.RepositoryStatus.Ok)
            {
                status.RepositoryStatus = pullStatus.RepositoryStatus;
            }

            return status;
        }

        /// <summary>
        /// Deletes the local repository for the user and makes a new clone of the repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">the name of the local repository to reset</param>
        /// <param name="branch">Optional branch name to clone after resetting the repository.</param>
        /// <returns>True if the reset was successful, otherwise false.</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/reset")]
        public async Task<ActionResult> ResetLocalRepository(string org, string repository, [FromQuery] string branch = null)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer, branch);

            try
            {
                await _repository.ResetLocalRepository(editingContext);
                return Ok();
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Pushes changes for a given repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">the name of the local repository to reset</param>
        /// <param name="commitInfo">Info about the commit</param>
        [HttpPost]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/commit-and-push")]
        public async Task CommitAndPushRepo(string org, string repository, [FromBody] CommitInfo commitInfo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            try
            {
                await _sourceControl.PushChangesForRepository(commitInfo);
            }
            catch (LibGit2Sharp.NonFastForwardException)
            {
                RepoStatus repoStatus = await _sourceControl.PullRemoteChanges(commitInfo.Org, commitInfo.Repository);
                await _sourceControl.Push(commitInfo.Org, commitInfo.Repository);
                foreach (RepositoryContent repoContent in repoStatus?.ContentStatus)
                {
                    Source source = new(Path.GetFileName(repoContent.FilePath), repoContent.FilePath);
                    SyncSuccess syncSuccess = new(source);
                    await _syncHub.Clients.Group(developer).FileSyncSuccess(syncSuccess);
                }
            }
        }

        /// <summary>
        /// Commit changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">the name of the local repository to reset</param>
        /// <param name="commitInfo">Info about the commit</param>
        /// <returns>http response message as ok if commit is successful</returns>
        [HttpPost]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/commit")]
        public async Task<ActionResult> Commit(string org, string repository, [FromBody] CommitInfo commitInfo)
        {
            await Task.CompletedTask;
            try
            {
                _sourceControl.Commit(commitInfo);
                return Ok();
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Push commits to repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repo name</param>
        [HttpPost]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/push")]
        public async Task<ActionResult> Push(string org, string repository)
        {
            bool pushSuccess = await _sourceControl.Push(org, repository);
            return pushSuccess ? Ok() : StatusCode(StatusCodes.Status500InternalServerError);
        }

        /// <summary>
        /// Gets the latest commit from current user
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repo name</param>
        /// <returns>List of commits</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/latest-commit")]
        public Commit GetLatestCommitFromCurrentUser(string org, string repository)
        {
            return _sourceControl.GetLatestCommitForCurrentUser(org, repository);
        }

        /// <summary>
        /// Returns information about a given branch
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="branch">Name of branch</param>
        /// <returns>The branch info</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/branches/branch")]
        public async Task<Branch> Branch(string org, string repository, [FromQuery] string branch)
            => await _giteaApi.GetBranch(org, repository, branch);


        /// <summary>
        /// Returns a list of branches in the repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>List of branches</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/branches")]
        public async Task<ActionResult<List<Branch>>> Branches(string org, string repository)
        {
            try
            {
                List<Branch> branches = await _giteaApi.GetBranches(org, repository);
                if (branches == null || branches.Count == 0)
                {
                    return NoContent();
                }
                return Ok(branches);
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Stages a specific file changed in working repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="fileName">the entire file path with filen name</param>
        /// <returns>Http response message as ok if checkout operation is successful</returns>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/stage/{fileName}")]
        public ActionResult StageChange(string org, string repository, string fileName)
        {
            try
            {
                if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(repository) || string.IsNullOrEmpty(fileName))
                {
                    return ValidationProblem("One or all of the input parameters are null");
                }

                _sourceControl.StageChange(org, repository, fileName);
                return Ok();
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Gets the repository content
        /// </summary>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/contents")]
        public ActionResult Contents(string org, string repository, [FromQuery] string path = "")
        {
            List<FileSystemObject> contents = _repository.GetContents(org, repository, path);

            if (contents == null)
            {
                return BadRequest("User does not have a local clone of the repository.");
            }

            return Ok(contents);
        }

        /// <summary>
        /// Gets the repository content as a zip file
        /// the boolean parameter full, indicates if only files git considers changed should be included,
        /// or if the whole repo should be included
        /// </summary>
        [HttpGet]
        [Route("repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/contents.zip")]
        public ActionResult ContentsZip(string org, string repository, [FromQuery] bool full)
        {
            AltinnRepoContext appContext = AltinnRepoContext.FromOrgRepo(org, repository);
            string appRoot;
            try
            {
                appRoot = _repository.GetAppPath(appContext.Org, appContext.Repo);

                if (!Directory.Exists(appRoot))
                {
                    return BadRequest("User does not have a local clone of the repository.");
                }
            }
            catch (ArgumentOutOfRangeException)
            {
                return BadRequest("User does not have a local clone of the repository.");
            }

            var zipType = full ? "full" : "changes";
            var zipFileName = $"{appContext.Org}-{appContext.Repo}-{zipType}.zip";
            var tempAltinnFolderPath = Path.Combine(Path.GetTempPath(), "altinn");
            Directory.CreateDirectory(tempAltinnFolderPath);
            var zipFilePath = Path.Combine(tempAltinnFolderPath, zipFileName);

            var fileStream = new FileStream(zipFilePath, FileMode.Create, FileAccess.ReadWrite, FileShare.Read, 512,
                FileOptions.DeleteOnClose);
            using (var archive = new ZipArchive(fileStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                IEnumerable<string> changedFiles;
                if (full)
                {
                    changedFiles = GetFilesInDirectory(appRoot, new DirectoryInfo(appRoot));
                }
                else
                {
                    changedFiles = _sourceControl
                        .Status(appContext.Org, appContext.Repo)
                        .Where(f => f.FileStatus != FileStatus.DeletedFromWorkdir)
                        .Select(f => f.FilePath);
                }

                foreach (var changedFile in changedFiles)
                {
                    archive.CreateEntryFromFile(Path.Join(appRoot, changedFile), changedFile);
                }
            }

            fileStream.Seek(0, SeekOrigin.Begin);

            return File(fileStream, "application/zip", zipFileName);
        }

        private List<string> GetFilesInDirectory(string appRoot, DirectoryInfo currentDir)
        {
            var ret = new List<string>();
            foreach (var directory in currentDir.EnumerateDirectories())
            {
                if (directory.Name == ".git")
                {
                    continue;
                }

                ret.AddRange(GetFilesInDirectory(appRoot, directory));
            }

            foreach (var file in currentDir.GetFiles())
            {
                ret.Add(file.FullName.Replace('\\', '/').Replace(appRoot, string.Empty));
            }

            return ret;
        }
    }
}
