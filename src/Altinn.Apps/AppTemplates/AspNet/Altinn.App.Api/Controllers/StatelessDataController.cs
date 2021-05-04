using System;
using System.Threading.Tasks;

using Altinn.App.Api.Filters;

using Altinn.App.Common.Serialization;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// The stateless data controller handles creation and calculation of data elements not related to an instance.
    /// </summary>
    [AutoValidateAntiforgeryTokenIfAuthCookie]
    [Route("{org}/{app}/v1/data")]
    public class StatelessDataController : ControllerBase
    {
        private readonly ILogger<DataController> _logger;
        private readonly IAltinnApp _altinnApp;
        private readonly IAppResources _appResourcesService;
        private readonly IPrefill _prefillService;

        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        /// <summary>
        /// The stateless data controller is responsible for creating and updating stateles data elements.
        /// </summary>
        /// <param name="logger">The logger</param>
        /// <param name="altinnApp">The app logic for current application</param>
        /// <param name="appResourcesService">The apps resource service</param>
        /// <param name="prefillService">A service with prefill related logic.</param>
        public StatelessDataController(
            ILogger<DataController> logger,
            IAltinnApp altinnApp,
            IAppResources appResourcesService,
            IPrefill prefillService)
        {
            _logger = logger;

            _altinnApp = altinnApp;
            _appResourcesService = appResourcesService;
            _prefillService = prefillService;
        }

        /// <summary>
        /// Create a new data object of the defined data type
        /// </summary>
        /// <param name="dataType">The data type id</param>
        /// <returns>Return a new instance of the data object including prefill and initial calculations</returns>
        [Authorize]
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 200)]
        public async Task<ActionResult> Post([FromQuery] string dataType)
        {
            if (string.IsNullOrEmpty(dataType))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            if (string.IsNullOrEmpty(classRef))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            object appModel = _altinnApp.CreateNewAppModel(classRef);

            int? partyId = HttpContext.User.GetPartyIdAsInt();

            if (partyId.HasValue)
            {
                // runs prefill from repo configuration if config exists
                await _prefillService.PrefillDataModel(partyId.ToString(), dataType, appModel);
            }

            await _altinnApp.RunCalculation(appModel);

            return Ok(appModel);
        }

        /// <summary>
        /// Runs calculations on the provided data object of the defined defined data type
        /// </summary>
        /// <param name="dataType">The data type id</param>
        /// <returns>Return the updated data object</returns>
        [Authorize]
        [HttpPut]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 200)]
        public async Task<ActionResult> Put([FromQuery] string dataType)
        {
            if (string.IsNullOrEmpty(dataType))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            if (string.IsNullOrEmpty(classRef))
            {
                return BadRequest($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
            }

            if (Request.ContentLength == null || Request.ContentLength <= 0)
            {
                return BadRequest("No data found in content.");
            }

            ModelDeserializer deserializer = new ModelDeserializer(_logger, _altinnApp.GetAppModelType(classRef));
            object appModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

            if (!string.IsNullOrEmpty(deserializer.Error))
            {
                return BadRequest(deserializer.Error);
            }

            if (appModel == null)
            {
                return BadRequest("No data found in content");
            }

            await _altinnApp.RunCalculation(appModel);

            return Ok(appModel);
        }
    }
}
