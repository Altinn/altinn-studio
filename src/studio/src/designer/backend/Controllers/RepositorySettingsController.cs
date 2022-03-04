using System;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions to handle repository settings aka Altinn Studio settings.
    /// </summary>
    [AutoValidateAntiforgeryToken]
    [ApiController]
    [Authorize]
    [Route("/designer/api/v1/{org}/{repository}/repositorysettings")]
    public class RepositorySettingsController : ControllerBase
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositorySettingsController"/> class.
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">An instance <see cref="IAltinnGitRepositoryFactory"/> that knows how to get repositories.</param>
        public RepositorySettingsController(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;            
        }

        /// <summary>
        /// Gets the settings for the repository. This is the same as can be found in
        /// .AltinnStudio\settings.json
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<AltinnStudioSettings>> Get(string org, string repository)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            AltinnStudioSettings settings;
            try
            {
                var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);
                settings = await altinnGitRepository.GetAltinnStudioSettings();
            }
            catch (DirectoryNotFoundException)
            {
                return NotFound(new ProblemDetails() { Title = "Not found", Detail = $"Could not find repository {org}/{repository} for user {developer}", Status = (int)HttpStatusCode.NotFound });
            }

            return Ok(settings);
        }

        /// <summary>
        /// Updates the settings on disk with the provided settings.
        /// This will overwrite the current on-disk settings.
        /// </summary>
        [HttpPut]
        public async Task<ActionResult> Put(string org, string repository, [FromBody] AltinnStudioSettings settings)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            if (ModelState.IsValid)
            {
                var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);
                await altinnGitRepository.SaveAltinnStudioSettings(settings);
                return Ok(settings);
            }
            else
            {
                return BadRequest(ModelState);
            }
        }
    }
}
