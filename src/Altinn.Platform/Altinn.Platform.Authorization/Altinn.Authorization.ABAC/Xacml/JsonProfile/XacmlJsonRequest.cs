using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// 4.2 Representation of the XACML request in JSON
    /// An XACML request is represented as an object with a single member named "Request". The value of the "Request" member is a Request object.
    /// http://docs.oasis-open.org/xacml/xacml-json-http/v1.1/csprd01/xacml-json-http-v1.1-csprd01.html
    /// </summary>
    public class XacmlJsonRequest
    {
        /// <summary>
        /// Gets or sets a value indicating whether the PolicyIdList should be returned. Optional. Default false.
        /// </summary>
        public bool ReturnPolicyIdList { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether it is a combined decision.
        /// </summary>
        public bool CombinedDecision { get; set; }

        /// <summary>
        /// Gets or sets the xpath version.
        /// </summary>
        public string XPathVersion { get; set; }

        /// <summary>
        /// Gets or sets the Category object corresponds to the XML <Attributes/> element. Just like the <Attributes/> element is
        /// specific to a given XACML attribute category, the Category object in JSON is specific to a given XACML attribute category.
        /// </summary>
        public List<XacmlJsonCategory> Category { get; set; }

        /// <summary>
        /// Gets or sets the resource attributes.
        /// </summary>
        public List<XacmlJsonCategory> Resource { get; set; }

        /// <summary>
        /// Gets or sets the action attributes.
        /// </summary>
        public List<XacmlJsonCategory> Action { get; set; }

        /// <summary>
        /// Gets or sets the subject attributes.
        /// </summary>
        public List<XacmlJsonCategory> AccessSubject { get; set; }

        /// <summary>
        /// Gets or sets the recipent subjet.
        /// </summary>
        public List<XacmlJsonCategory> RecipientSubject { get; set; }

        /// <summary>
        /// Gets or sets the intermediary subjects attributes.
        /// </summary>
        public List<XacmlJsonCategory> IntermediarySubject { get; set; }

        /// <summary>
        /// Gets or sets attributes about requsting machine.
        /// </summary>
        public List<XacmlJsonCategory> RequestingMachine { get; set; }

        /// <summary>
        /// Gets or sets references to multiple requests.
        /// </summary>
        public XacmlJsonMultiRequests MultiRequests { get; set; }
    }
}
