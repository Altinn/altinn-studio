using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.14 Element <Policy/>  http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047119
    /// The <Policy/> element is the smallest entity that SHALL be presented to the PDP for evaluation.
    /// A<Policy/> element may be evaluated, in which case the evaluation procedure defined in Section 7.12 SHALL be used.
    /// The main components of this element are the<Target/>, <Rule/>, <CombinerParameters/>, <RuleCombinerParameters/>, <ObligationExpressions/> and<AdviceExpressions/>
    /// elements and the RuleCombiningAlgId attribute.
    ///
    /// A<Policy/> element MAY contain a<PolicyIssuer/> element. The interpretation of the <PolicyIssuer/> element is explained in the separate administrative policy profile[XACMLAdmin].
    ///
    /// The<Target/> element defines the applicability of the<Policy/> element to a set of decision requests.  If the <Target/> element within the<Policy/> element matches the
    /// request context, then the <Policy/> element MAY be used by the PDP in making its authorization decision.  See Section 7.12.
    ///
    /// The<Policy/> element includes a sequence of choices between <VariableDefinition/> and<Rule/> elements.
    /// Rules included in the<Policy/> element MUST be combined by the algorithm specified by the RuleCombiningAlgId attribute.
    /// The<ObligationExpressions/> element contains a set of obligation expressions that MUST be evaluated into obligations by the PDP and the resulting
    /// obligations MUST be fulfilled by the PEP in conjunction with the authorization decision.If the PEP does not understand, or cannot fulfill,
    /// any of the obligations, then it MUST act according to the PEP bias.See Section 7.2 and 7.18.
    ///
    /// The<AdviceExpressions/> element contains a set of advice expressions that MUST be evaluated into advice by the PDP.The resulting
    /// advice MAY be safely ignored by the PEP in conjunction with the authorization decision.See Section 7.18.
    ///
    ///
    /// The <Policy/> element is of PolicyType complex type.
    /// The<Policy/> element contains the following attributes and elements:
    ///
    /// PolicyId[Required]
    /// Policy identifier.It is the responsibility of the PAP to ensure that no two policies visible to the PDP have the same identifier.
    /// This MAY be achieved by following a predefined URN or URI scheme.If the policy identifier is in the form of a URL, then it MAY be resolvable.
    ///
    /// Version[Required]
    /// The version number of the Policy.
    ///
    /// RuleCombiningAlgId[Required]
    /// The identifier of the rule-combining algorithm by which the<Policy/>, <CombinerParameters/> and<RuleCombinerParameters/> components MUST be combined.
    /// Standard rule-combining algorithms are listed in Appendix Appendix C.Standard rule-combining algorithm identifiers are listed in Section B.9.
    ///
    /// MaxDelegationDepth[Optional]
    /// If present, limits the depth of delegation which is authorized by this policy.See the delegation profile [XACMLAdmin].
    ///
    /// <Description/> [Optional]
    /// A free-form description of the policy.See Section 5.2.
    ///
    /// <PolicyIssuer/> [Optional]
    /// Attributes of the issuer of the policy.
    ///
    /// <PolicyDefaults/> [Optional]
    /// Defines a set of default values applicable to the policy.The scope of the <PolicyDefaults/> element SHALL be the enclosing policy.
    ///
    /// <CombinerParameters/> [Optional]
    /// A sequence of parameters to be used by the rule-combining algorithm. The parameters apply to the combining algorithm as such and it is up to the
    /// specific combining algorithm to interpret them and adjust its behavior accordingly.
    ///
    /// <RuleCombinerParameters/> [Optional]
    /// A sequence of<RuleCombinerParameter/> elements that are associated with a particular <Rule/> element within the<Policy/>.. It is up to
    /// the specific combining algorithm to interpret them and adjust its behavior accordingly.
    ///
    /// <Target/> [Required]
    /// The <Target/> element defines the applicability of a<Policy/> to a set of decision requests.
    /// The<Target/> element MAY be declared by the creator of the <Policy/> element, or it MAY be computed from the<Target/> elements of the
    /// referenced<Rule/> elements either as an intersection or as a union.
    ///
    /// <VariableDefinition/> [Any Number]
    /// Common function definitions that can be referenced from anywhere in a rule where an expression can be found.
    ///
    /// <Rule/> [Any Number]
    /// A sequence of rules that MUST be combined according to the RuleCombiningAlgId attribute.Rules whose <Target/> elements and conditions match the
    /// decision request MUST be considered.  Rules whose <Target/> elements or conditions do not match the decision request SHALL be ignored.
    ///
    /// <ObligationExpressions/> [Optional]
    /// A conjunctive sequence of obligation expressions which MUST be evaluated into obligations byt the PDP.The corresponsding obligations MUST be fulfilled by the PEP in conjunction with the
    /// authorization decision.See Section 7.18 for a description of how the set of obligations to be returned by the PDP SHALL be determined.See section 7.2 about enforcement of obligations.
    ///
    /// <AdviceExpressions/> [Optional]
    /// A conjunctive sequence of advice expressions which MUST evaluated into advice by the PDP. The corresponding advice provide supplementary information to the
    /// PEP in conjunction with the authorization decision.See Section 7.18 for a description of how the set of advice to be returned by the PDP SHALL be determined.
    /// </summary>
    public class XacmlPolicy
    {
        private readonly ICollection<XacmlAdviceExpression> adviceExpressions = new Collection<XacmlAdviceExpression>();

        private readonly ICollection<XacmlCombinerParameter> choiseCombinerParameters = new Collection<XacmlCombinerParameter>();
        private readonly ICollection<XacmlCombinerParameter> combinerParameters = new Collection<XacmlCombinerParameter>();

        private readonly ICollection<XacmlRule> rule = new Collection<XacmlRule>();
        private readonly ICollection<XacmlRuleCombinerParameters> ruleCombinerParameters = new Collection<XacmlRuleCombinerParameters>();

        private readonly ICollection<XacmlObligation> obligations = new Collection<XacmlObligation>();
        private readonly ICollection<XacmlObligationExpression> obligationExpressions = new Collection<XacmlObligationExpression>();

        private readonly ICollection<XacmlVariableDefinition> variableDefinitions = new Collection<XacmlVariableDefinition>();

        private XacmlTarget target;
        private Uri policyId;
        private Uri ruleCombiningAlgId;
        private string version = "1.0";

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlPolicy"/> class.
        /// </summary>
        /// <param name="policyId">Policy identifier.It is the responsibility of the PAP to ensure that no two policies visible to the PDP have the same identifier.</param>
        /// <param name="ruleCombiningAlgId">The identifier of the rule-combining algorithm by which the<Policy/>, <CombinerParameters/> and<RuleCombinerParameters/> components MUST be combined.</param>
        /// <param name="target">The <Target/> element defines the applicability of a<Policy/> to a set of decision requests.</param>
        public XacmlPolicy(Uri policyId, Uri ruleCombiningAlgId, XacmlTarget target)
        {
            Guard.ArgumentNotNull(policyId, nameof(policyId));
            Guard.ArgumentNotNull(ruleCombiningAlgId, nameof(ruleCombiningAlgId));
            Guard.ArgumentNotNull(target, nameof(target));
            this.policyId = policyId;
            this.ruleCombiningAlgId = ruleCombiningAlgId;
            this.target = target;
        }

        /// <summary>
        /// A free-form description of the policy.See Section 5.2.
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Attributes of the issuer of the policy.
        /// </summary>
        public XacmlPolicyIssuer PolicyIssuer { get; set; }

        /// <summary>
        /// The <XPathVersion/> element SHALL specify the version of the XPath specification to be used by <AttributeSelector/> elements and XPath-based functions in the policy set or policy.
        /// </summary>
        public Uri XPathVersion { get; set; }

        /// <summary>
        /// The <Target/> element defines the applicability of a<Policy/> to a set of decision requests.
        /// </summary>
        public XacmlTarget Target
        {
            get
            {
                return this.target;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.target = value;
            }
        }

        /// <summary>
        /// A sequence of parameters to be used by the rule-combining algorithm. The parameters apply to the combining algorithm as such and it is up to the specific combining algorithm to interpret them and adjust its behavior accordingly.
        /// </summary>
        public ICollection<XacmlCombinerParameter> CombinerParameters
        {
            get
            {
                return this.combinerParameters;
            }
        }

        /// <summary>
        /// A sequence of<RuleCombinerParameter/> elements that are associated with a particular <Rule/> element within the<Policy/>..
        /// It is up to the specific combining algorithm to interpret them and adjust its behavior accordingly.
        /// </summary>
        public ICollection<XacmlRuleCombinerParameters> RuleCombinerParameters
        {
            get
            {
                return this.ruleCombinerParameters;
            }
        }

        /// <summary>
        /// Common function definitions that can be referenced from anywhere in a rule where an expression can be found.
        /// </summary>
        public ICollection<XacmlVariableDefinition> VariableDefinitions
        {
            get
            {
                return this.variableDefinitions;
            }
        }

        /// <summary>
        /// A sequence of parameters to be used by the rule-combining algorithm. The parameters apply to the combining algorithm as such and it is up to the specific combining algorithm to interpret them and adjust its behavior accordingly.
        /// </summary>
        public ICollection<XacmlCombinerParameter> ChoiceCombinerParameters
        {
            get
            {
                return this.choiseCombinerParameters;
            }
        }

        /// <summary>
        /// A sequence of rules that MUST be combined according to the RuleCombiningAlgId attribute.Rules whose <Target/>
        /// elements and conditions match the decision request MUST be considered.  Rules whose <Target/> elements or conditions do not match the decision request SHALL be ignored.
        /// </summary>
        public ICollection<XacmlRule> Rules
        {
            get
            {
                return this.rule;
            }
        }

        /// <summary>
        /// A conjunctive sequence of obligation expressions which MUST be evaluated into obligations byt the PDP.The corresponsding obligations MUST be fulfilled by the PEP in conjunction with the
        /// authorization decision.See Section 7.18 for a description of how the set of obligations to be returned by the PDP SHALL be determined.See section 7.2 about enforcement of obligations.
        /// </summary>
        public ICollection<XacmlObligation> Obligations
        {
            get
            {
                return this.obligations;
            }
        }

        /// <summary>
        ///  Policy identifier.It is the responsibility of the PAP to ensure that no two policies visible to the PDP have the same identifier.This MAY be achieved by following a predefined URN or URI scheme.If the policy identifier is in the form of a URL, then it MAY be resolvable.
        /// </summary>
        public Uri PolicyId
        {
            get
            {
                return this.policyId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.policyId = value;
            }
        }

        /// <summary>
        /// The version number of the Policy.
        /// </summary>
        public string Version
        {
            get
            {
                return this.version;
            }

            set
            {
                if (value != null)
                {
                    if (System.Text.RegularExpressions.Regex.IsMatch(value, @"(\d+\.)*\d+"))
                    {
                        this.version = value;
                    }
                    else
                    {
                        throw new ArgumentException("Wrong VersionType format", nameof(value));
                    }
                }
            }
        }

        /// <summary>
        /// The identifier of the rule-combining algorithm by which the<Policy/>, <CombinerParameters/> and<RuleCombinerParameters/> components MUST be combined.
        /// Standard rule-combining algorithms are listed in Appendix Appendix C.Standard rule-combining algorithm identifiers are listed in Section B.9.
        /// </summary>
        public Uri RuleCombiningAlgId
        {
            get
            {
                return this.ruleCombiningAlgId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.ruleCombiningAlgId = value;
            }
        }

        /// <summary>
        /// If present, limits the depth of delegation which is authorized by this policy.See the delegation profile [XACMLAdmin].
        /// </summary>
        public int? MaxDelegationDepth { get; set; }

        /// <summary>
        /// A conjunctive sequence of obligation expressions which MUST be evaluated into obligations byt the PDP.The corresponsding obligations MUST be fulfilled by the PEP in conjunction with the
        /// authorization decision.See Section 7.18 for a description of how the set of obligations to be returned by the PDP SHALL be determined.See section 7.2 about enforcement of obligations.
        /// </summary>
        public ICollection<XacmlObligationExpression> ObligationExpressions
        {
            get
            {
                return this.obligationExpressions;
            }
        }

        /// <summary>
        /// A conjunctive sequence of advice expressions which MUST evaluated into advice by the PDP. The corresponding advice provide supplementary information to the
        /// PEP in conjunction with the authorization decision.See Section 7.18 for a description of how the set of advice to be returned by the PDP SHALL be determined.
        /// </summary>
        public ICollection<XacmlAdviceExpression> AdviceExpressions
        {
            get
            {
                return this.adviceExpressions;
            }
        }

        /// <summary>
        /// The namespaces used in Policy
        /// </summary>
        internal IDictionary<string, string> Namespaces { get; set; }
    }
}
