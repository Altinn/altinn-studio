using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.18 Element <RuleCombinerParameters/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047123
    ///
    /// The <RuleCombinerParameters/> element conveys parameters associated with a particular rule within a policy for a rule-combining algorithm.
    /// Each<RuleCombinerParameters/> element MUST be associated with a rule contained within the same policy.If multiple<RuleCombinerParameters/>
    /// elements reference the same rule, they SHALL be considered equal to one<RuleCombinerParameters/> element containing the concatenation of all the sequences
    /// of <CombinerParameters/> contained in all the aforementioned<RuleCombinerParameters/> elements, such that the order of occurrence of
    /// the <RuleCominberParameters/> elements is preserved in the concatenation of the <CombinerParameter/> elements.
    /// Note that none of the rule-combining algorithms specified in XACML 3.0 is parameterized.
    ///
    /// The <RuleCombinerParameters/> element contains the following attribute:
    ///
    /// RuleIdRef[Required]
    /// The identifier of the<Rule/> contained in the policy.
    /// Support for the<RuleCombinerParameters/> element is optional, only if support for combiner parameters is not implemented.
    /// </summary>
    public class XacmlRuleCombinerParameters : XacmlCombinerParameters
    {
        private string ruleIdRef;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlRuleCombinerParameters"/> class.
        /// </summary>
        /// <param name="ruleIdRef">The identifier of the<Rule/> contained in the policy.</param>
        public XacmlRuleCombinerParameters(string ruleIdRef)
            : base()
        {
            Guard.ArgumentNotNull(ruleIdRef, nameof(ruleIdRef));
            this.ruleIdRef = ruleIdRef;
        }

        /// <summary>
        /// The identifier of the<Rule/> contained in the policy.
        /// </summary>
        public string RuleIdRef
        {
            get
            {
                return this.ruleIdRef;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.ruleIdRef = value;
            }
        }
    }
}
