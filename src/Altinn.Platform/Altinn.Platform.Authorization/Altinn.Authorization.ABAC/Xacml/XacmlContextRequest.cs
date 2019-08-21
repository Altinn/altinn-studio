using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.42 Element <Request/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047147
    /// The <Request/> element is an abstraction layer used by the policy language.  For simplicity of expression, this document describes
    /// policy evaluation in terms of operations on the context.  However a conforming PDP is not required to actually instantiate the context
    /// in the form of an XML document.  But, any system conforming to the XACML specification MUST produce exactly the same authorization decisions as
    /// if all the inputs had been transformed into the form of an <Request/> element.
    /// The<Request/> element contains<Attributes/> elements.There may be multiple<Attributes/> elements with the same
    /// Category attribute if the PDP implements the multiple decision profile, see[Multi].  Under other conditions,
    /// it is a syntax error if there are multiple<Attributes/> elements with the same Category (see Section 7.19.2 for error codes).
    ///
    /// The <Request/> element is of RequestType complex type.
    /// The<Request/> element contains the following elements and attributes:
    ///
    /// ReturnPolicyIdList[Required]
    /// This attribute is used to request that the PDP return a list of all fully applicable policies and policy sets which were used
    /// in the decision as a part of the decision response.
    ///
    /// CombinedDecision [Required]
    /// This attribute is used to request that the PDP combines multiple decisions into a single decision.The use of this attribute
    /// is specified in [Multi]. If the PDP does not implement the relevant functionality in [Multi], then the PDP must return an
    /// Indeterminate with a status code of urn:oasis:names:tc:xacml:1.0:status:processing-error if it receives a request with this attribute set to “true”.
    ///
    /// <RequestDefaults/> [Optional]
    /// Contains default values for the request, such as XPath version. See section 5.43.
    ///
    /// <Attributes/> [One to Many]
    /// Specifies information about attributes of the request context by listing a sequence of<Attribute/>
    /// elements associated with an attribute category.One or more<Attributes/> elements are allowed.
    /// Different<Attributes/> elements with different categories are used to represent information about the subject,
    /// resource, action, environment or other categories of the access request.
    ///
    /// <MultiRequests/> [Optional]
    /// Lists multiple request contexts by references to the <Attributes/> elements.Implementation of this
    /// element is optional.The semantics of this element is defined in [Multi]. If the implementation does not
    /// implement this element, it MUST return an Indeterminate result if it encounters this element.See section 5.50.
    /// </summary>
    public class XacmlContextRequest
    {
        private readonly ICollection<XacmlContextRequestReference> requestReferences = new Collection<XacmlContextRequestReference>();
        private readonly ICollection<XacmlContextAttributes> attributes = new Collection<XacmlContextAttributes>();

        /// <summary>
        /// Constructor user only for XACML 3.0
        /// </summary>
        /// <param name="returnPolicyIdList">This attribute is used to request that the PDP return a list of all fully applicable policies and policy sets which were used
        /// in the decision as a part of the decision response.</param>
        /// <param name="combinedDecision">  /// This attribute is used to request that the PDP combines multiple decisions into a single decision.The use of this attribute
        /// is specified in [Multi]. If the PDP does not implement the relevant functionality in [Multi], then the PDP must return an
        /// Indeterminate with a status code of urn:oasis:names:tc:xacml:1.0:status:processing-error if it receives a request with this attribute set to “true”.</param>
        /// <param name="attributes">Specifies information about attributes of the request context by listing a sequence of<Attribute/>
        /// elements associated with an attribute category.One or more<Attributes/> elements are allowed.
        /// Different<Attributes/> elements with different categories are used to represent information about the subject,
        /// resource, action, environment or other categories of the access request.</param>
        public XacmlContextRequest(bool returnPolicyIdList, bool combinedDecision, IEnumerable<XacmlContextAttributes> attributes)
        {
            if (attributes == null)
            {
                throw new ArgumentNullException(nameof(attributes));
            }

            this.ReturnPolicyIdList = returnPolicyIdList;
            this.CombinedDecision = combinedDecision;

            foreach (var item in attributes)
            {
                this.attributes.Add(item);
            }
        }

        /// <summary>
        /// This attribute is used to request that the PDP return a list of all fully applicable policies and policy sets which were used
        /// in the decision as a part of the decision response.
        /// </summary>
        public bool ReturnPolicyIdList { get; set; }

        /// <summary>
        /// This attribute is used to request that the PDP combines multiple decisions into a single decision.The use of this attribute
        /// is specified in [Multi]. If the PDP does not implement the relevant functionality in [Multi], then the PDP must return an
        /// Indeterminate with a status code of urn:oasis:names:tc:xacml:1.0:status:processing-error if it receives a request with this attribute set to “true”.
        /// </summary>
        public bool CombinedDecision { get; set; }

        /// <summary>
        /// The XPATH version used
        /// </summary>
        public Uri XPathVersion { get; set; }

        /// <summary>
        /// Specifies information about attributes of the request context by listing a sequence of<Attribute/>
        /// elements associated with an attribute category.One or more<Attributes/> elements are allowed.
        /// Different<Attributes/> elements with different categories are used to represent information about the subject,
        /// resource, action, environment or other categories of the access request.
        /// </summary>
        public ICollection<XacmlContextAttributes> Attributes
        {
            get
            {
                return this.attributes;
            }
        }

        /// <summary>
        /// The <RequestReference /> element defines an instance of a request in terms of references to <Attributes/> elements.
        /// The semantics of this element are defined in [Multi]. Support for this element is optional.
        /// </summary>
        public ICollection<XacmlContextRequestReference> RequestReferences
        {
            get
            {
                return this.requestReferences;
            }
        }
    }
}
