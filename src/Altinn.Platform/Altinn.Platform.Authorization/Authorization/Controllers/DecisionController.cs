using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

using Altinn.Authorization.ABAC;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Authorization.Services.Interface;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// This is the controller responsible for Policy Enformcent Point endpoint.
    /// It returns a Xacml Context Reponse based on a Context Request
    /// </summary>
    [Route("authorization/api/v1/[controller]")]
    [ApiController]
    public class DecisionController : ControllerBase
    {
        private readonly IContextHandler _contextHandler;
        private readonly IPolicyRetrievalPoint _prp;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DecisionController"/> class.
        /// </summary>
        /// <param name="contextHandler">The Context handler</param>
        /// <param name="policyRetrievalPoint">The policy Retrieval point</param>
        /// <param name="logger">the logger.</param>
        public DecisionController(IContextHandler contextHandler, IPolicyRetrievalPoint policyRetrievalPoint, ILogger<DecisionController> logger)
        {
            _contextHandler = contextHandler;
            _prp = policyRetrievalPoint;
            _logger = logger;
        }

        /// <summary>
        /// Decision Point endpoint to authorize Xacml Context Requests
        /// </summary>
        /// <param name="model">A Generic model</param>
        [HttpPost]
        public async Task<ActionResult> Post([FromBody] XacmlRequestApiModel model)
        {
            try
            {
                if (Request.ContentType.Contains("application/json"))
                {
                    return await AuthorizeJsonRequest(model);
                }
                else
                {
                    return await AuthorizeXmlRequest(model);
                }
            }
            catch
            {
                XacmlContextResult result = new XacmlContextResult(XacmlContextDecision.Indeterminate)
                {
                    Status = new XacmlContextStatus(XacmlContextStatusCode.SyntaxError)
                };

                XacmlContextResponse xacmlContextResponse = new XacmlContextResponse(result);

                if (Request.ContentType.Contains("application/json"))
                {
                    XacmlJsonResponse jsonResult = XacmlJsonXmlConverter.ConvertResponse(xacmlContextResponse);
                    return Ok(jsonResult);
                }
                else
                {
                    return CreateResponse(xacmlContextResponse);
                }
            }
        }

        /// <summary>
        /// Test method. Should be deleted?
        /// </summary>
        /// <returns>test string</returns>
        [HttpGet]
        public string Get()
        {
            return "test string";
        }

        private async Task<XacmlJsonResponse> Authorize(XacmlJsonRequest decisionRequest)
        {
            if (decisionRequest.MultiRequests == null || decisionRequest.MultiRequests.RequestReference == null
                || decisionRequest.MultiRequests.RequestReference.Count < 2)
            {
                XacmlContextRequest request = XacmlJsonXmlConverter.ConvertRequest(decisionRequest);
                XacmlContextResponse xmlResponse = await Authorize(request);
                return XacmlJsonXmlConverter.ConvertResponse(xmlResponse);
            }
            else
            {
                XacmlJsonResponse multiResponse = new XacmlJsonResponse();
                foreach (XacmlJsonRequestReference xacmlJsonRequestReference in decisionRequest.MultiRequests.RequestReference)
                {
                    XacmlJsonRequest jsonMultiRequestPart = new XacmlJsonRequest();

                    foreach (string refer in xacmlJsonRequestReference.ReferenceId)
                    {
                        IEnumerable<XacmlJsonCategory> resourceCategoriesPart = decisionRequest.Resource.Where(i => i.Id.Equals(refer));

                        if (resourceCategoriesPart != null && resourceCategoriesPart.Count() > 0)
                        {
                            if (jsonMultiRequestPart.Resource == null)
                            {
                                jsonMultiRequestPart.Resource = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.Resource.AddRange(resourceCategoriesPart);
                        }

                        IEnumerable<XacmlJsonCategory> subjectCategoriesPart = decisionRequest.AccessSubject.Where(i => i.Id.Equals(refer));

                        if (subjectCategoriesPart != null && subjectCategoriesPart.Count() > 0)
                        {
                            if (jsonMultiRequestPart.AccessSubject == null)
                            {
                                jsonMultiRequestPart.AccessSubject = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.AccessSubject.AddRange(subjectCategoriesPart);
                        }

                        IEnumerable<XacmlJsonCategory> actionCategoriesPart = decisionRequest.Action.Where(i => i.Id.Equals(refer));

                        if (actionCategoriesPart != null && actionCategoriesPart.Count() > 0)
                        {
                            if (jsonMultiRequestPart.Action == null)
                            {
                                jsonMultiRequestPart.Action = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.Action.AddRange(actionCategoriesPart);
                        }
                    }

                    XacmlContextResponse partResponse = await Authorize(XacmlJsonXmlConverter.ConvertRequest(jsonMultiRequestPart));
                    XacmlJsonResponse xacmlJsonResponsePart = XacmlJsonXmlConverter.ConvertResponse(partResponse);

                    if (multiResponse.Response == null)
                    {
                        multiResponse.Response = new List<XacmlJsonResult>();
                    }

                    multiResponse.Response.Add(xacmlJsonResponsePart.Response.First());
                }

                return multiResponse;
            }
        }

        private async Task<ActionResult> AuthorizeXmlRequest(XacmlRequestApiModel model)
        {
            XacmlContextRequest request;
            using (XmlReader reader = XmlReader.Create(new StringReader(model.BodyContent)))
            {
                request = XacmlParser.ReadContextRequest(reader);
            }

            XacmlContextResponse xacmlContextResponse = await Authorize(request);
            return CreateResponse(xacmlContextResponse);
        }

        private async Task<ActionResult> AuthorizeJsonRequest(XacmlRequestApiModel model)
        {
            XacmlJsonRequestRoot jsonRequest =
                (XacmlJsonRequestRoot)JsonConvert.DeserializeObject(model.BodyContent, typeof(XacmlJsonRequestRoot));

            XacmlJsonResponse jsonResponse = await Authorize(jsonRequest.Request);

            return Ok(jsonResponse);
        }

        private ActionResult CreateResponse(XacmlContextResponse xacmlContextResponse)
        {
            StringBuilder builder = new StringBuilder();
            using (XmlWriter writer = XmlWriter.Create(builder))
            {
                XacmlSerializer.WriteContextResponse(writer, xacmlContextResponse);
            }

            string xml = builder.ToString();

            return Content(xml);
        }

        private async Task<XacmlContextResponse> Authorize(XacmlContextRequest decisionRequest)
        {
            decisionRequest = await this._contextHandler.Enrich(decisionRequest);

            _logger.LogInformation($"// DecisionController // Authorize // Enriched request: {JsonConvert.SerializeObject(decisionRequest)}.");
            XacmlPolicy policy = await this._prp.GetPolicyAsync(decisionRequest);

            PolicyDecisionPoint pdp = new PolicyDecisionPoint();
            XacmlContextResponse xacmlContextResponse = pdp.Authorize(decisionRequest, policy);
            _logger.LogInformation($"// DecisionController // Authorize // XACML ContextResponse: {JsonConvert.SerializeObject(xacmlContextResponse)}.");
            return xacmlContextResponse;
        }
    }
}
