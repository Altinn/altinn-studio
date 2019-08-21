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

        /// <summary>
        /// The xpath version
        /// </summary>
        public string XPathVersion { get; set; }

        /// <summary>
        /// The Category object corresponds to the XML <Attributes/> element. Just like the <Attributes/> element is
        /// specific to a given XACML attribute category, the Category object in JSON is specific to a given XACML attribute category.
        /// </summary>
        public List<XacmlJsonCategory> Category { get; set; }

        /// <summary>
        /// The resource attributes
        /// </summary>
        public List<XacmlJsonCategory> Resource { get; set; }

        /// <summary>
        /// The action attributes
        /// </summary>
        public List<XacmlJsonCategory> Action { get; set; }

        /// <summary>
        /// The subject attributes
        /// </summary>
        public List<XacmlJsonCategory> AccessSubject { get; set; }

        /// <summary>
        /// The recipent subjet
        /// </summary>
        public List<XacmlJsonCategory> RecipientSubject { get; set; }

        /// <summary>
        /// The intermediary subjects attributes
        /// </summary>
        public List<XacmlJsonCategory> IntermediarySubject { get; set; }

        /// <summary>
        /// Attributes about requsting machine
        /// </summary>
        public List<XacmlJsonCategory> RequestingMachine { get; set; }

        /// <summary>
        /// References to multiple requests
        /// </summary>
        public XacmlJsonMultiRequests MultiRequests { get; set; }
    }
}
