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
    public class DecisionsController : ControllerBase
    {
        private readonly IContextHandler _contextHandler;
        private readonly IPolicyRetrievalPoint _prp;

        /// <summary>
        /// Initializes a new instance of the <see cref="DecisionController"/> class.
        /// </summary>
        /// <param name="contextHandler">The Context handler</param>
        /// <param name="policyRetrievalPoint">The policy Retrieval point</param>
        public DecisionsController(IContextHandler contextHandler, IPolicyRetrievalPoint policyRetrievalPoint)
        {
            _contextHandler = contextHandler;
            _prp = policyRetrievalPoint;
        }

        /// <summary>
        /// Decision Point endpoint to authorize multiple Xacml Context Requests
        /// </summary>
        /// <param name="xacmlRequests">A list of request</param>
        [HttpPost]
        public ActionResult Post([FromBody] List<XacmlJsonRequest> xacmlRequests)
        {
            List<XacmlJsonResponse> response = new List<XacmlJsonResponse>();

            foreach (XacmlJsonRequest request in xacmlRequests)
            {
                XacmlContextRequest xmlRequest = XacmlJsonXmlConverter.ConvertRequest(request);
                xmlRequest = _contextHandler.Enrich(xmlRequest);
                XacmlPolicy policy = _prp.GetPolicy(xmlRequest);
                PolicyDecisionPoint pdp = new PolicyDecisionPoint();
                XacmlContextResponse xmlResponse = pdp.Authorize(xmlRequest, policy);
                response.Add(XacmlJsonXmlConverter.ConvertResponse(xmlResponse));
            }

            return Ok(response);
        }
    }
}
