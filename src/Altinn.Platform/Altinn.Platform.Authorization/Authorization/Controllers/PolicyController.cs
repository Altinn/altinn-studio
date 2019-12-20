using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Interface;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Contains all actions related to managing authorization rules
    /// </summary>
    [Route("authorization/api/v1/policies")]
    [ApiController]
    public class PolicyController : ControllerBase
    {
        private readonly ILogger<PolicyController> logger;
        private readonly IPolicyRetrievalPoint _prp;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyController"/> class.
        /// </summary>
        /// <param name="prp">The policy retrieval point.</param>
        /// <param name="logger">logger</param>
        public PolicyController(
            IPolicyRetrievalPoint prp,
            ILogger<PolicyController> logger)
        {
            _prp = prp;
            this.logger = logger;
        }

        /// <summary>
        /// Saves policy file to storage
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        [HttpPost]
        public async Task<ActionResult> WritePolicy([FromQuery] string org, [FromQuery] string app)
        {
            if (string.IsNullOrWhiteSpace(org))
            {
                return BadRequest("Organisation must be defined in query string");
            }

            if (string.IsNullOrWhiteSpace(app))
            {
                return BadRequest("App must be defined in query string");
            }

            // Use Request.Body to capture raw data from body to support other format than JSON
            Stream content = Request.Body;

            // Request.Body returns Stream of type FrameRequestStream which can only be read once
            // Copy Request.Body to another stream that supports seeking so the content can be read multiple times
            string contentString = await new StreamReader(content, Encoding.UTF8).ReadToEndAsync();

            if (string.IsNullOrWhiteSpace(contentString))
            {
                return BadRequest("Policy file cannot be empty");
            }

            byte[] byteArray = Encoding.UTF8.GetBytes(contentString);
            Stream dataStream = new MemoryStream(byteArray);

            try
            {
                bool successfullyStored = await _prp.WritePolicyAsync(org, app, dataStream);

                if (successfullyStored)
                {
                    return Ok();
                }
            }
            catch (ArgumentException ex)
            {
                logger.LogError(ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                logger.LogError(ex.ToString());
                return StatusCode(500);
            }

            return BadRequest("Something went wrong in the upload of file to storage");
        }
    }
}
