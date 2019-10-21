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
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// This is the controller responsible for Policy Enformcent Point endpoint.
    /// It returns a Xacml Context Reponse based on a Context Request
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class DecisionController : ControllerBase
    {
        private readonly IContextHandler _contextHandler;
        private readonly IPolicyRetrievalPoint _prp;

        /// <summary>
        /// Initializes a new instance of the <see cref="DecisionController"/> class.
        /// </summary>
        /// <param name="contextHandler">The Context handler</param>
        /// <param name="policyRetrievalPoint">The policy Retrieval point</param>
        public DecisionController(IContextHandler contextHandler, IPolicyRetrievalPoint policyRetrievalPoint)
        {
            _contextHandler = contextHandler;
            _prp = policyRetrievalPoint;
        }

        /// <summary>
        /// Decision Point endpoint to authorize Xacml Context Requests
        /// </summary>
        /// <param name="model">A Generic model</param>
        [HttpPost]
        public ActionResult Post([FromBody] XacmlRequestApiModel model)
        {
            XacmlContextRequest request = null;
            XacmlContextResponse xacmlContextResponse = null;
            try
            {
                request = ParseApiBody(model);
            }
            catch (Exception)
            {
                XacmlContextResult result = new XacmlContextResult(XacmlContextDecision.Indeterminate)
                {
                    Status = new XacmlContextStatus(XacmlContextStatusCode.SyntaxError)
                };
                xacmlContextResponse = new XacmlContextResponse(result);
            }

            if (request != null)
            {
                PolicyDecisionPoint pdp = new PolicyDecisionPoint(_contextHandler, _prp);
                xacmlContextResponse = pdp.Authorize(request);
            }

            string accept = HttpContext.Request.Headers["Accept"];
            if (!string.IsNullOrEmpty(accept) && accept.Equals("application/json"))
            {
               XacmlJsonResponse jsonReponse = XacmlJsonXmlConverter.ConvertResponse(xacmlContextResponse);
               return Ok(jsonReponse);
            }
                
            StringBuilder builder = new StringBuilder();
            using (XmlWriter writer = XmlWriter.Create(builder))
            {
                XacmlSerializer.WriteContextResponse(writer, xacmlContextResponse);
            }

            string xml = builder.ToString();

            return Content(xml);
        }

        private XacmlContextRequest ParseApiBody(XacmlRequestApiModel model)
        {
            XacmlContextRequest request = null;

            if (Request.ContentType.Contains("application/json"))
            {
                XacmlJsonRequestRoot jsonRequest;
                jsonRequest = (XacmlJsonRequestRoot)JsonConvert.DeserializeObject(model.BodyContent, typeof(XacmlJsonRequestRoot));
                request = XacmlJsonXmlConverter.ConvertRequest(jsonRequest.Request);
            }
            else if (Request.ContentType.Contains("application/xml"))
            {
                using (XmlReader reader = XmlReader.Create(new StringReader(model.BodyContent)))
                {
                    request = XacmlParser.ReadContextRequest(reader);
                }
            }

            return request;
        }
    }
}
