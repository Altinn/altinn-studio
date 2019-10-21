using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.48 Element <Result/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047153
    /// The <Result/> element represents an authorization decision result.  It MAY include a set of obligations that MUST be fulfilled by the PEP.
    /// If the PEP does not understand or cannot fulfill an obligation, then the action of the PEP is determined by its bias, see section 7.1.
    /// It MAY include a set of advice with supplemental information which MAY be safely ignored by the PEP.
    ///
    /// The<Result/> element is of ResultType complex type.
    /// The<Result/> element contains the following attributes and elements:
    ///
    /// <Decision/> [Required]
    /// The authorization decision: “Permit”, “Deny”, “Indeterminate” or “NotApplicable”.
    ///
    /// <Status/> [Optional]
    /// Indicates whether errors occurred during evaluation of the decision request, and optionally, information about those errors.
    /// If the <Response/> element contains <Result/> elements whose <Status/> elements are all identical, and the <Response/> element is
    /// contained in a protocol wrapper that can convey status information, then the common status information MAY be placed in the protocol
    /// wrapper and this <Status/> element MAY be omitted from all <Result/> elements.
    ///
    /// <Obligations/> [Optional]
    /// A list of obligations that MUST be fulfilled by the PEP.If the PEP does not understand or cannot fulfill an obligation, then the action of the
    /// PEP is determined by its bias, see section 7.2.  See Section 7.18 for a description of how the set of obligations to be returned by the PDP is determined.
    ///
    /// <AssociatedAdvice/> [Optional]
    /// A list of advice that provide supplemental information to the PEP.If the PEP does not understand an advice, the PEP may safely
    /// ignore the advice.See Section 7.18 for a description of how the set of advice to be returned by the PDP is determined.
    ///
    /// <Attributes/> [Optional]
    /// A list of attributes that were part of the request. The choice of which attributes are included here is made with the
    /// IncludeInResult attribute of the<Attribute/> elements of the request.See section 5.46.
    ///
    /// <PolicyIdentifierList/> [Optional]
    /// If the ReturnPolicyIdList attribute in the<Request/> is true (see section 5.42), a PDP that implements this optional feature
    /// MUST return a list of all policies which were found to be fully applicable. That is, all policies where both the<Target/>
    /// matched and the <Condition/> evaluated to true, whether or not the <Effect/> was the same or different from the<Decision/>.
    /// </summary>
    public class XacmlContextResult
    {
        private readonly ICollection<XacmlObligation> obligations = new Collection<XacmlObligation>();

        #region XACML3.0
        private readonly ICollection<XacmlAdvice> advices = new Collection<XacmlAdvice>();
        private readonly ICollection<XacmlContextAttributes> attributes = new Collection<XacmlContextAttributes>();
        private readonly ICollection<XacmlContextPolicyIdReference> policyIdReferences = new Collection<XacmlContextPolicyIdReference>();
        private readonly ICollection<XacmlContextPolicySetIdReference> policySetIdReferences = new Collection<XacmlContextPolicySetIdReference>();
        #endregion

        private XacmlContextDecision decision;
        private XacmlContextStatus status;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextResult"/> class.
        /// </summary>
        /// <param name="decision">The authorization decision.</param>
        /// <param name="status">The status.</param>
        public XacmlContextResult(XacmlContextDecision decision, XacmlContextStatus status)
        {
            Guard.ArgumentNotNull(status, nameof(status));
            this.decision = decision;
            this.status = status;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextResult"/> class.
        /// </summary>
        /// <param name="decision">The authorization decision.</param>
        /// <remarks>
        /// Used only from XACML 2.0/3.0.
        /// </remarks>
        public XacmlContextResult(XacmlContextDecision decision)
        {
            this.decision = decision;
        }

        /// <summary>
        /// Gets or sets the authorization decision.
        /// </summary>
        /// <remarks>See [XacmlCore, 6.11] for more details.</remarks>
        public XacmlContextDecision Decision
        {
            get
            {
                return this.decision;
            }

            set
            {
                this.decision = value;
            }
        }

        /// <summary>
        /// Gets or sets the status.
        /// </summary>
        /// <remarks>
        /// See [XacmlCore, 6.12] for more details.
        /// Optional in XACML2.0/3.0
        /// </remarks>
        public XacmlContextStatus Status
        {
            get
            {
                return this.status;
            }

            set
            {
                this.status = value;
            }
        }

        /// <summary>
        /// Gets the obligations.
        /// </summary>
        public ICollection<XacmlObligation> Obligations
        {
            get
            {
                return this.obligations;
            }
        }

        /// <summary>
        /// Gets or sets the resource identifier.
        /// </summary>
        public string ResourceId { get; set; }

        /// <summary>
        /// Gets the advices.
        /// </summary>
        /// <remarks>Used only for XACML V3.0</remarks>
        public ICollection<XacmlAdvice> Advices
        {
            get
            {
                return this.advices;
            }
        }

        /// <summary>
        /// Gets the attributes.
        /// </summary>
        /// <remarks>Used only for XACML V3.0</remarks>
        public ICollection<XacmlContextAttributes> Attributes
        {
            get
            {
                return this.attributes;
            }
        }

        /// <summary>
        /// Gets the policy identifier references.
        /// </summary>
        /// <remarks>Used only for XACML V3.0</remarks>
        public ICollection<XacmlContextPolicyIdReference> PolicyIdReferences
        {
            get
            {
                return this.policyIdReferences;
            }
        }

        /// <summary>
        /// Gets the policy set identifier references.
        /// </summary>
        /// <remarks>Used only for XACML V3.0</remarks>
        public ICollection<XacmlContextPolicySetIdReference> PolicySetIdReferences
        {
            get
            {
                return this.policySetIdReferences;
            }
        }
    }
}
