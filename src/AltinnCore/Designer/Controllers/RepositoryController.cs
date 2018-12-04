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
        private readonly IRepository _repository;
        private readonly ISourceControl _sourceControl;
        private readonly IGitea _giteaApi;
        private readonly ServiceRepositorySettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositoryController"/> class.
        /// </summary>
        /// <param name="repositoryService">repositoryService the repository service</param>
        /// <param name="sourceControl">the source control service handler</param>
        /// <param name="giteaWrapper">the gitea wrapper</param>
        /// <param name="repositorySettings">Settings for repository</param>
        public RepositoryController(IRepository repositoryService, ISourceControl sourceControl, IGitea giteaWrapper, IOptions<ServiceRepositorySettings> repositorySettings)
        {
            _repository = repositoryService;
            _sourceControl = sourceControl;
            _giteaApi = giteaWrapper;
            _settings = repositorySettings.Value;
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
    }
}
