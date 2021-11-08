using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions to handle repository settings aka Altinn Studio settings.
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("/designer/api/v1/{org}/{repository}")]
    public class RepositorySettingsController : ControllerBase
    {
        private readonly AltinnGitRepository _altinnGitRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositorySettingsController"/> class.
        /// </summary>
        /// <param name="repositoryFactory">An instance <see cref="IAltinnGitRepositoryFactory"/> that knows how to get repositories.</param>
        public RepositorySettingsController(IAltinnGitRepositoryFactory repositoryFactory)
        {
            var org = RouteData.Values["org"].ToString();
            var repository = RouteData.Values["repository"].ToString();
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            _altinnGitRepository = repositoryFactory.GetAltinnGitRepository(org, repository, developer);
        }

        /// <summary>
        /// Gets the settings for the repository. This is the same as can be found in
        /// .AltinnStudio\settings.json
        /// </summary>
        [HttpGet]
        public ActionResult<AltinnStudioSettings> Get()
        {
            return Ok(_altinnGitRepository.AltinnStudioSettings);
        }

        /// <summary>
        /// PUT api/<RepositorySettingsController>/5 
        /// </summary>
        [HttpPut("{id}")]
        public void Put(int id, [FromBody] string value)
        {
        }
    }
}
