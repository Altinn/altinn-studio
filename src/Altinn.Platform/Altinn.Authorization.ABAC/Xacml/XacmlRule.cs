using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// From XACML Specification https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047126
    /// The <Rule/> element SHALL define the individual rules in the policy.  The main components of this element are the <Target/>, <Condition/>,
    /// <ObligationExpressions/>  and <AdviceExpressions/>  elements and the Effect attribute.
    /// A<Rule/> element may be evaluated, in which case the evaluation procedure defined in Section 7.10 SHALL be used.
    ///
    /// The <Rule/> element is of RuleType complex type.
    /// The<Rule/> element contains the following attributes and elements:
    ///
    /// RuleId[Required]
    /// A string identifying this rule.
    /// 
    /// Effect[Required]
    /// Rule effect.The value of this attribute is either “Permit” or “Deny”.
    ///
    /// <Description/> [Optional]
    /// A free-form description of the rule.
    ///
    /// <Target/> [Optional]
    /// Identifies the set of decision requests that the <Rule/> element is intended to evaluate.If this element is omitted, then the target for the<Rule/> SHALL be defined by
    /// the <Target/> element of the enclosing <Policy/> element.See Section 7.7 for details.
    ///
    /// <Condition/> [Optional]
    /// A predicate that MUST be satisfied for the rule to be assigned its Effect value.
    ///
    /// <ObligationExpressions/> [Optional]
    /// A conjunctive sequence of obligation expressions which MUST be evaluated into obligations byt the PDP.The corresponsding obligations MUST be fulfilled by the
    /// PEP in conjunction with the authorization decision.
    /// See Section 7.18 for a description of how the set of obligations to be returned by the PDP SHALL be determined.See section 7.2 about enforcement of obligations.
    ///
    /// <AdviceExpressions/> [Optional]
    /// A conjunctive sequence of advice expressions which MUST evaluated into advice by the PDP. The corresponding advice provide supplementary information to the PEP in conjunction with the
    /// authorization decision.See Section 7.18 for a description of how the set of advice to be returned by the PDP SHALL be determined.
    /// </summary>
    public class XacmlRule
    {
        private readonly ICollection<XacmlObligationExpression> obligations = new Collection<XacmlObligationExpression>();
        private readonly ICollection<XacmlAdviceExpression> advices = new Collection<XacmlAdviceExpression>();
        private string ruleId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlRule"/> class.
        /// </summary>
        /// <param name="ruleId">The rule identifier.</param>
        /// <param name="effect">The rule effect.</param>
        public XacmlRule(string ruleId, XacmlEffectType effect)
        {
            Guard.ArgumentNotNull(ruleId, nameof(ruleId));
            this.ruleId = ruleId;
            this.Effect = effect;
        }

        /// <summary>
        /// Gets or sets A free-form description of the rule.
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Get or sets Target that Identifies the set of decision requests that the <Rule/> element is intended to evaluate.If this element is omitted,
        /// then the target for the<Rule/> SHALL be defined by the <Target/> element of the enclosing <Policy/> element.See Section 7.7 for details.
        /// </summary>
        public XacmlTarget Target { get; set; }

        /// <summary>
        ///  A predicate that MUST be satisfied for the rule to be assigned its Effect value.
        /// </summary>
        public XacmlExpression Condition { get; set; }

        /// <summary>
        ///  Gets or set A string identifying this rule.
        /// </summary>
        public string RuleId
        {
            get
            {
                return this.ruleId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.ruleId = value;
            }
        }

        /// <summary>
        /// Gets or set Rule effect.The value of this attribute is either “Permit” or “Deny”.
        /// </summary>
        public XacmlEffectType Effect { get; set; }

        /// <summary>
        /// A conjunctive sequence of obligation expressions which MUST be evaluated into obligations byt the PDP.The corresponsding obligations MUST be fulfilled by the PEP in
        /// conjunction with the authorization decision.
        /// See Section 7.18 for a description of how the set of obligations to be returned by the PDP SHALL be determined.See section 7.2 about enforcement of obligations. 
        /// </summary>
        public ICollection<XacmlObligationExpression> Obligations
        {
            get
            {
                return this.obligations;
            }
        }

        /// <summary>
        /// A conjunctive sequence of advice expressions which MUST evaluated into advice by the PDP. The corresponding advice provide supplementary information to the PEP in conjunction with the
        /// authorization decision.See Section 7.18 for a description of how the set of advice to be returned by the PDP SHALL be determined.
        /// </summary>
        public ICollection<XacmlAdviceExpression> Advices
        {
            get
            {
                return this.advices;
            }
        }
    }
}
