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
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

using RepositoryModel = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the API controller for functionality related to repositories.
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/v1/repos")]
    public class RepositoryController : ControllerBase
    {
        private readonly IGitea _giteaApi;
        private readonly ServiceRepositorySettings _settings;
        private readonly ISourceControl _sourceControl;
        private readonly IRepository _repository;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositoryController"/> class.
        /// </summary>
        /// <param name="giteaWrapper">the gitea wrapper</param>
        /// <param name="repositorySettings">Settings for repository</param>
        /// <param name="sourceControl">the source control</param>
        /// <param name="repository">the repository control</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        public RepositoryController(IGitea giteaWrapper, IOptions<ServiceRepositorySettings> repositorySettings, ISourceControl sourceControl, IRepository repository, IHttpContextAccessor httpContextAccessor)
        {
            _giteaApi = giteaWrapper;
            _settings = repositorySettings.Value;
            _sourceControl = sourceControl;
            _repository = repository;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// List the repos that the authenticated user owns or has access to
        /// </summary>
        /// <returns>List of repos</returns>
        [HttpGet]
        [Route("/designer/api/v1/user/repos")]
        public Task<IList<RepositoryModel>> UserRepos()
        {
            return _giteaApi.GetUserRepos();
        }

        /// <summary>
        /// List an organization's repos
        /// </summary>
        /// <returns>List of repos</returns>
        [HttpGet]
        [Route("/designer/api/v1/orgs/{org}/repos")]
        public Task<IList<RepositoryModel>> OrgRepos(string org)
        {
            return _giteaApi.GetOrgRepos(org);
        }

        /// <summary>
        /// Returns a list over repositories
        /// </summary>
        /// <param name="searchOptions">The search params</param>
        /// <returns>List of repositories that user has access to.</returns>
        [HttpGet]
        [Route("search")]
        public async Task<SearchResults> Search(SearchOptions searchOptions)
        {
            SearchResults repositories = await _giteaApi.SearchRepo(searchOptions);
            return repositories;
        }

        /// <summary>
        /// Returns a given app repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The app repository</param>
        /// <returns>The given app repository</returns>
        [HttpGet]
        [Route("{org}/{repository}")]
        public async Task<RepositoryModel> GetRepository(string org, string repository)
        {
            RepositoryModel returnRepository = await _giteaApi.GetRepository(org, repository);
            return returnRepository;
        }

        /// <summary>
        /// List of all organizations a user has access to.
        /// </summary>
        /// <returns>A list over all organizations user has access to</returns>
        [HttpGet]
        [Route("/designer/api/v1/orgs")]
        public async Task<List<Organization>> Organizations()
        {
            List<Organization> orglist = await _giteaApi.GetUserOrganizations();
            return orglist ?? new List<Organization>();
        }

        /// <summary>
        /// This method returns the status of a given repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repository</param>
        /// <returns>The repository status</returns>
        [HttpGet]
        [Route("{org}/{repository}/status")]
        public RepoStatus RepoStatus(string org, string repository)
        {
            _sourceControl.FetchRemoteChanges(org, repository);
            return _sourceControl.RepositoryStatus(org, repository);
        }

        /// <summary>
        /// Pull remote changes for a given repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">Name of the repository</param>
        /// <returns>Repo status</returns>
        [HttpGet]
        [Route("{org}/{repository}/pull")]
        public RepoStatus Pull(string org, string repository)
        {
            RepoStatus pullStatus = _sourceControl.PullRemoteChanges(org, repository);

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
        /// <returns>True if the reset was successful, otherwise false.</returns>
        [HttpGet]
        [Route("{org}/{repository}/reset")]
        public ActionResult ResetLocalRepository(string org, string repository)
        {
            try
            {
                _repository.ResetLocalRepository(org, repository);
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
        /// <param name="commitInfo">Info about the commit</param>
        [HttpPost]
        [Route("{org}/{repository}/commitandpush")]
        public void CommitAndPushRepo([FromBody] CommitInfo commitInfo)
        {
            _sourceControl.PushChangesForRepository(commitInfo);
        }

        /// <summary>
        /// Commit changes
        /// </summary>
        /// <param name="commitInfo">Info about the commit</param>
        /// <returns>http response message as ok if commit is successfull</returns>
        [HttpPost]
        [Route("{org}/{repository}/commit")]
        public ActionResult Commit([FromBody] CommitInfo commitInfo)
        {
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
        [Route("{org}/{repository}/push")]
        public async Task<ActionResult> Push(string org, string repository)
        {
            bool pushSuccess = await _sourceControl.Push(org, repository);
            if (pushSuccess)
            {
                return Ok();
            }
            else
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Fetches the repository log
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repo name</param>
        /// <returns>List of commits</returns>
        [HttpGet]
        [Route("{org}/{repository}/log")]
        public List<Commit> Log(string org, string repository)
        {
            return _sourceControl.Log(org, repository);
        }

        /// <summary>
        /// Fetches the initial commit
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repo name</param>
        /// <returns>The initial commit</returns>
        [HttpGet]
        [Route("{org}/{repository}/initialcommit")]
        public Commit GetInitialCommit(string org, string repository)
        {
            return _sourceControl.GetInitialCommit(org, repository);
        }

        /// <summary>
        /// Gets the latest commit from current user
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repo name</param>
        /// <returns>List of commits</returns>
        [HttpGet]
        [Route("{org}/{repository}/latestcommit")]
        public Commit GetLatestCommitFromCurrentUser(string org, string repository)
        {
            return _sourceControl.GetLatestCommitForCurrentUser(org, repository);
        }

        /// <summary>
        /// List all branches for a repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The repository</param>
        /// <returns>List of repos</returns>
        [HttpGet]
        [Route("{org}/{repository}/branches")]
        public async Task<List<Branch>> Branches(string org, string repository)
            => await _giteaApi.GetBranches(org, repository);
 
        /// <summary>
        /// Returns information about a given branch
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="branch">Name of branch</param>
        /// <returns>The branch info</returns>
        [HttpGet]
        [Route("{org}/{repository}/branches/branch")]
        public async Task<Branch> Branch(string org, string repository, [FromQuery] string branch)
            => await _giteaApi.GetBranch(org, repository, branch);

        /// <summary>
        /// Discards all local changes for the logged in user and the local repository is updated with latest remote commit (origin/master)
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>Http response message as ok if reset operation is successful</returns>
        [HttpGet]
        [Route("{org}/{repository}/discard")]
        public ActionResult DiscardLocalChanges(string org, string repository)
        {
            try
            {
                if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(repository))
                {
                    return ValidationProblem("One or all of the input parameters are null");
                }

                _sourceControl.ResetCommit(org, repository);
                return Ok();
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Discards local changes to a specific file and the files is updated with latest remote commit (origin/master)
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="fileName">the name of the file</param>
        /// <returns>Http response message as ok if checkout operation is successful</returns>
        [HttpGet]
        [Route("{org}/{repository}/discard/{fileName}")]
        public ActionResult DiscardLocalChangesForSpecificFile(string org, string repository, string fileName)
        {
            try
            {
                if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(repository) || string.IsNullOrEmpty(fileName))
                {
                    return ValidationProblem("One or all of the input parameters are null");
                }

                _sourceControl.CheckoutLatestCommitForSpecificFile(org, repository, fileName);
                return Ok();
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
        [Route("{org}/{repository}/stage/{fileName}")]
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
        /// Action used to create a new app under the current org.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository.</param>
        /// <param name="datamodellingPreference">The prefered way of doing data modelling for this app. See <see cref="DatamodellingPreference"/> for options.
        /// XSD is the Altinn 2 way, while Json Schema is the Altinn 3 way. You can go from XSD to Json Schema, but there isn't an easy way to go from Json Schema to XSD.
        /// </param>
        /// <returns>
        /// An indication if app was created successful or not.
        /// </returns>
        [Authorize]
        [HttpPost]
        [Route("{org}")]
        public async Task<ActionResult<RepositoryModel>> CreateApp(string org, [FromQuery] string repository, [FromQuery] DatamodellingPreference datamodellingPreference = DatamodellingPreference.JsonSchema)
        {
            try
            {
                Guard.AssertValidAppRepoName(repository);
            }
            catch (ArgumentException)
            {
                return BadRequest($"{repository} is an invalid repository name.");
            }

            if (datamodellingPreference == DatamodellingPreference.Unknown)
            {
                datamodellingPreference = DatamodellingPreference.JsonSchema;
            }

            var config = new ServiceConfiguration
            {
                RepositoryName = repository,
                ServiceName = repository,
                DatamodellingPreference = datamodellingPreference
            };

            var repositoryResult = await _repository.CreateService(org, config);
            if (repositoryResult.RepositoryCreatedStatus == HttpStatusCode.Created)
            {
                return Created(repositoryResult.CloneUrl, repositoryResult);
            }
            else
            {
                return StatusCode((int)repositoryResult.RepositoryCreatedStatus, repositoryResult);
            }
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
        [Route("copyapp")]
        public async Task<ActionResult<RepositoryModel>> CopyApp([FromQuery] string org, [FromQuery] string sourceRepository, [FromQuery] string targetRepository)
        {
            try
            {
                Guard.AssertValidAppRepoName(targetRepository);
            }
            catch (ArgumentException)
            {
                return BadRequest($"{targetRepository} is an invalid repository name.");
            }

            try
            {
                Guard.AssertValidAppRepoName(sourceRepository);
            }
            catch (ArgumentException)
            {
                return BadRequest($"{sourceRepository} is an invalid repository name.");
            }

            var existingRepo = await _giteaApi.GetRepository(org, targetRepository);

            if (existingRepo != null)
            {
                return StatusCode(409);
            }

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                RepositoryModel repo = await _repository.CopyRepository(org, sourceRepository, targetRepository, developer);

                if (repo.RepositoryCreatedStatus == HttpStatusCode.Created)
                {
                    return Created(repo.CloneUrl, repo);
                }

                await _repository.DeleteRepository(org, targetRepository);
                return StatusCode((int)repo.RepositoryCreatedStatus);
            }
            catch (Exception e)
            {
                await _repository.DeleteRepository(org, targetRepository);
                return StatusCode(500, e);
            }
        }

        /// <summary>
        /// Clones the remote repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>The result of the cloning</returns>
        [HttpGet]
        [Route("{org}/{repository}/clone")]
        public string CloneRemoteRepository(string org, string repository)
        {
            return _sourceControl.CloneRemoteRepository(org, repository);
        }

        /// <summary>
        /// Halts the merge operation and keeps local changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>Http response message as ok if abort merge operation is successful</returns>
        [HttpGet]
        [Route("{org}/{repository}/abortmerge")]
        public ActionResult AbortMerge(string org, string repository)
        {
            try
            {
                if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(repository))
                {
                    return ValidationProblem("One or all of the input parameters are null");
                }

                _sourceControl.AbortMerge(org, repository);

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
        [Route("{org}/{repository}/contents")]
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
        [Route("{org}/{repository}/contents.zip")]
        public ActionResult ContentsZip(string org, string repository, [FromQuery] bool full)
        {
            string appRoot = null;
            try
            {
                appRoot = _repository.GetAppPath(org, repository);
            
                if (!Directory.Exists(appRoot))
                {
                    return BadRequest("User does not have a local clone of the repository.");
                }
            }
            catch (ArgumentOutOfRangeException)
            {
                return BadRequest("User does not have a local clone of the repository.");
            }

            var outStream = new MemoryStream();
            using (var archive = new ZipArchive(outStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                IEnumerable<string> changedFiles;
                if (full)
                {
                    changedFiles = GetFilesInDirectory(appRoot, new DirectoryInfo(appRoot));
                }
                else
                {
                    changedFiles = _sourceControl.Status(org, repository).Select(f => f.FilePath);
                }

                foreach (var changedFile in changedFiles)
                {
                    archive.CreateEntryFromFile(Path.Join(appRoot, changedFile), changedFile);
                }
            }
            
            outStream.Seek(0, SeekOrigin.Begin);

            return File(outStream, "application/zip", $"{org}-{repository}.zip");
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
