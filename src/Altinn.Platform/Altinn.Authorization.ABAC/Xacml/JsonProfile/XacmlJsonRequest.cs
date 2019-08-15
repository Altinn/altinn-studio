using System;
using System.Collections.Generic;
using System.Text;

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
        /// Gets or sets the ReturnPolicyIdList. Optional. Default false
        /// </summary>
        public bool ReturnPolicyIdList { get; set; }

        /// <summary>
        /// Sets or gets the combined decision
        /// </summary>
        public bool CombinedDecision { get; set; }

        public string XPathVersion { get; set; }

        /// <summary>
        /// The Category object corresponds to the XML <Attributes/> element. Just like the <Attributes/> element is
        /// specific to a given XACML attribute category, the Category object in JSON is specific to a given XACML attribute category.
        /// </summary>
        public List<XacmlJsonCategory> Category { get; set; }

        public List<XacmlJsonCategory> Resource { get; set; }

        public List<XacmlJsonCategory> Action { get; set; }

        public List<XacmlJsonCategory> AccessSubject { get; set; }

        public List<XacmlJsonCategory> RecipientSubject { get; set; }

        public List<XacmlJsonCategory> IntermediarySubject { get; set; }

        public List<XacmlJsonCategory> RequestingMachine { get; set; }

        public XacmlJsonMultiRequests MultiRequests { get; set; }
    }
}
