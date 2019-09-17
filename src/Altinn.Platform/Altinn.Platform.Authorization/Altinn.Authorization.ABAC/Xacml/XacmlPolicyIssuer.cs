using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.3 Element <PolicyIssuer/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503856
    /// The <PolicyIssuer/> element contains attributes describing the issuer of the policy or policy set. The use of the policy issuer
    /// element is defined in a separate administration profile [XACMLAdmin]. A PDP which does not implement the administration profile MUST
    /// report an error or return an Indeterminate result if it encounters this element.
    ///
    /// The <PolicyIssuer/> element is of PolicyIssuerType complex type.
    /// The<PolicyIssuer/> element contains the following elements:
    ///
    /// <Content/> [Optional]
    /// Free form XML describing the issuer.See Section 5.45.
    ///
    /// <Attribute/> [Zero to many]
    /// An attribute of the issuer.See Section 5.46.
    /// </summary>
    public class XacmlPolicyIssuer
    {
        private readonly ICollection<XacmlAttribute> attributes = new Collection<XacmlAttribute>();

        /// <summary>
        /// Free form XML describing the issuer.See Section 5.45.
        /// </summary>
        public string Content { get; set; }

        /// <summary>
        /// An attribute of the issuer.See Section 5.46.
        /// </summary>
        public ICollection<XacmlAttribute> Attributes
        {
            get
            {
                return this.attributes;
            }
        }
    }
}
