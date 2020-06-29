using System.IO;

using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.App.Api.Controllers
{
    [Route("{org}/{app}/api/texts/{language}")]
    [Authorize]
    public class TextsController : ControllerBase
    {
        private readonly IAppResources _appResourceService;
        private readonly IMemoryCache _memoryCache;


        public TextsController(IAppResources appResourcesService, IMemoryCache memoryCache)
        {
            _appResourceService = appResourcesService;
            _memoryCache = memoryCache;
        }

        /// <summary>
        /// Method to retrieve textresources
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The text resource file content or 404</returns>
        [HttpGet]
        public IActionResult Get(string org, string app, [FromRoute] string language)
        {
            string defaultLang = "nb";
            string id;
            byte[] fileContent;

            if (!string.IsNullOrEmpty(language) && language.Length != 2)
            {
                return BadRequest($"Provided language {language} is invalid. Language code should consists of two characters.");
            }

            if (!string.IsNullOrEmpty(language))
            {
                id = $"resource.{language}.json";

                if (!_memoryCache.TryGetValue(id, out fileContent))
                {
                    // Id not in cache, getting the text resource from Storage
                    fileContent = _appResourceService.GetText(org, app, id);
                }

                if (fileContent != null)
                {
                    return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
                }
            }

            id = $"resource.{defaultLang}.json";
            if (!_memoryCache.TryGetValue(id, out fileContent))
            {
                // Id not in cache, getting the text resource from Storage
                fileContent = _appResourceService.GetText(org, app, id);
            }

            if (fileContent != null)
            {
                return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
            }

            return StatusCode(404);
        }

    }
}
