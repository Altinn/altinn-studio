using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Temporary controller containing a single endpoint for converting texts files
    /// in old format to texts files in new format; *.text.json with key:value pairs.
    /// </summary>
    /// <remarks>Might consider moving this logic to the TextsController</remarks>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/v1/{org}/{repo}/convertTexts")]
    public class ConvertV1TextsToV2Controller : ControllerBase
    {
        private readonly IConvertTextsService _convertTextsService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ConvertV1TextsToV2Controller"/> class.
        /// </summary>
        /// <param name="convertTextsService">The texts service.</param>
        public ConvertV1TextsToV2Controller(IConvertTextsService convertTextsService)
        {
            _convertTextsService = convertTextsService;
        }

        /// <summary>
        /// Endpoint for converting all texts files to the new flat
        /// format in a specific repository for a specific organisation.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        [HttpPut]
        [Produces("application/json")]
        public ActionResult Put(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            _convertTextsService.ConvertV1TextsToV2(org, repo, developer);

            return NoContent();
        }
    }
}
