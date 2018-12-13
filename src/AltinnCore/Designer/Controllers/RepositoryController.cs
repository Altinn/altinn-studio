using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// This is the API controller for functionality related to repositories.
    /// </summary>
    public class RepositoryController : ControllerBase
    {
        private readonly IGitea _giteaApi;
        private readonly ServiceRepositorySettings _settings;
        private readonly ISourceControl _sourceControl;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositoryController"/> class.
        /// </summary>
        /// <param name="giteaWrapper">the gitea wrapper</param>
        /// <param name="repositorySettings">Settings for repository</param>
        /// <param name="sourceControl">The source control service</param>
        public RepositoryController(IGitea giteaWrapper, IOptions<ServiceRepositorySettings> repositorySettings, ISourceControl sourceControl)
        {
            _giteaApi = giteaWrapper;
            _settings = repositorySettings.Value;
            _sourceControl = sourceControl;
        }

        /// <summary>
        /// Returns a list over repositories
        /// </summary>
        /// <param name="repositorySearch">The search params</param>
        /// <returns>List of repostories that user has access to.</returns>
        [HttpGet]
        public List<Repository> Search(RepositorySearch repositorySearch)
        {
            SearchResults repositorys = _giteaApi.SearchRepository(repositorySearch.OnlyAdmin, repositorySearch.KeyWord, repositorySearch.Page).Result;
            return repositorys.Data;
        }

        /// <summary>
        /// List of all organizations a user has access to.
        /// </summary>
        /// <returns>A list over all organizations user has access to</returns>
        [HttpGet]
        public List<Organization> Organizations()
        {
            string sessionId = Request.Cookies[_settings.GiteaCookieName];
            List<Organization> orglist = _giteaApi.GetUserOrganizations(sessionId).Result;
            return orglist;
        }

        /// <summary>
        /// Returns a specic organization
        /// </summary>
        /// <param name="id">The organization name</param>
        /// <returns>The organization</returns>
        [HttpGet]
        public ActionResult<Organization> Organization(string id)
        {
            Organization org = _giteaApi.GetOrganization(id).Result;
            if (org != null)
            {
                return org;
            }

            return NotFound();
        }

        /// <summary>
        /// This method returns the status of a given repository 
        /// </summary>
        /// <param name="org">The organization or user owning the repo</param>
        /// <param name="repository">The repository</param>
        /// <returns>The repository status</returns>
        [HttpGet]
        public RepoStatus RepoStatus(string org, string repository)
        {
            _sourceControl.FetchRemoteChanges(org, repository);
            return _sourceControl.RepositoryStatus(org, repository);
        }

        /// <summary>
        /// Pull remote changes for a given repo
        /// </summary>
        /// <param name="owner">The owner of the repository</param>
        /// <param name="repository">Name of the repository</param>
        [HttpGet]
        public void PullRepo(string owner, string repository)
        {
            _sourceControl.PullRemoteChanges(owner, repository);
        }

        /// <summary>
        /// Pushes changes for a given repo
        /// </summary>
        /// <param name="commitInfo">Info about the commit</param>
        [HttpPost]
        public void CommitAndPushRepo(CommitInfo commitInfo)
        {
            _sourceControl.PushChangesForRepository(commitInfo);
        }
    }
}
