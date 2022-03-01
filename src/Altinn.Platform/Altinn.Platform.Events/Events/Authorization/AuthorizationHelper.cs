using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Authorization
{
    /// <summary>
    /// Authorization Helper for 
    /// </summary>
    public class AuthorizationHelper
    {
        private readonly IPDP _pdp;
 
        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationHelper"/> class.
        /// </summary>
        /// <param name="pdp">The policy decision point</param>
        public AuthorizationHelper(IPDP pdp)
        {
            _pdp = pdp;
         }

        /// <summary>
        /// Authorizes and filters events based on authorization
        /// </summary>
        /// <param name="consumer">The event consumer</param>
        /// <param name="cloudEvents">The list of events</param>
        /// <returns>A list of authorized events</returns>
        public async Task<List<CloudEvent>> AuthorizeEvents(ClaimsPrincipal consumer, List<CloudEvent> cloudEvents)
        {
            XacmlJsonRequestRoot xacmlJsonRequest = CloudEventXacmlMapper.CreateMultiDecisionRequest(consumer, cloudEvents);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(xacmlJsonRequest);
            List<CloudEvent> authorizedEventsList = new List<CloudEvent>();

            foreach (XacmlJsonResult result in response.Response)
            {
                if (DecisionHelper.ValidateDecisionResult(result, consumer))
                {
                    string eventId = string.Empty;

                    // Loop through all attributes in Category from the response
                    foreach (XacmlJsonCategory category in result.Category)
                    {
                        var attributes = category.Attribute;

                        foreach (var attribute in attributes)
                        {
                            if (attribute.AttributeId.Equals(AltinnXacmlUrns.EventId))
                            {
                                eventId = attribute.Value;
                            }
                        }
                    }

                    // Find the instance that has been validated to add it to the list of authorized instances.
                    CloudEvent authorizedEvent = cloudEvents.First(i => i.Id == eventId);
                    authorizedEventsList.Add(authorizedEvent);
                }
            }

            return authorizedEventsList;
        }

        /// <summary>
        /// Method to authorize access to an Altinn App event
        /// </summary>
        public async Task<bool> AuthorizeConsumerForAltinnAppEvent(CloudEvent cloudEvent, string consumer)
        {
            XacmlJsonRequestRoot xacmlJsonRequest = CloudEventXacmlMapper.CreateDecisionRequest(cloudEvent, consumer);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(xacmlJsonRequest);
            return ValidateResult(response);
        }

        private bool ValidateResult(XacmlJsonResponse response)
        {
            if (response.Response[0].Decision.Equals(XacmlContextDecision.Permit.ToString()))
            {
                return true;
            }

            return false;
        }
    }
}
