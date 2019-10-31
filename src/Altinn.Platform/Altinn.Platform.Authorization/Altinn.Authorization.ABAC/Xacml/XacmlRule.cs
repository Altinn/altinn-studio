using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
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
        /// Gets or sets Target that Identifies the set of decision requests that the <Rule/> element is intended to evaluate.If this element is omitted,
        /// then the target for the<Rule/> SHALL be defined by the <Target/> element of the enclosing <Policy/> element.See Section 7.7 for details.
        /// </summary>
        public XacmlTarget Target { get; set; }

        /// <summary>
        ///  Gets or sets a predicate that MUST be satisfied for the rule to be assigned its Effect value.
        /// </summary>
        public XacmlExpression Condition { get; set; }

        /// <summary>
        ///  Gets or sets A string identifying this rule.
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
        /// Gets or sets Rule effect.The value of this attribute is either “Permit” or “Deny”.
        /// </summary>
        public XacmlEffectType Effect { get; set; }

        /// <summary>
        /// Gets a conjunctive sequence of obligation expressions which MUST be evaluated into obligations byt the PDP.The corresponsding obligations MUST be fulfilled by the PEP in
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
        /// Evauluat the condition.
        /// </summary>
        /// <param name="request">The xacml context request.</param>
        /// <returns>The match result.</returns>
        public XacmlAttributeMatchResult EvaluateCondition(XacmlContextRequest request)
        {
            Type conditionType = this.Condition.Property.GetType();

            if (conditionType == typeof(XacmlFunction))
            {
                return XacmlAttributeMatchResult.NoMatch;
            }
            else if (conditionType == typeof(XacmlApply))
            {
                XacmlApply xacmlApply = this.Condition.Property as XacmlApply;
                return xacmlApply.Evalute(request);
            }

            return XacmlAttributeMatchResult.NoMatch;
        }

        /// <summary>
        /// Gets a conjunctive sequence of advice expressions which MUST evaluated into advice by the PDP. The corresponding advice provide supplementary information to the PEP in conjunction with the
        /// authorization decision.See Section 7.18 for a description of how the set of advice to be returned by the PDP SHALL be determined.
        /// </summary>
        public ICollection<XacmlAdviceExpression> Advices
        {
            get
            {
                return this.advices;
            }
        }

        /// <summary>
        /// Match Policy Attributes and request attributes of the same category.
        /// </summary>
        /// <param name="request">The request.</param>
        /// <param name="category">The attribute category.</param>
        /// <returns>The match result.</returns>
        public XacmlAttributeMatchResult MatchAttributes(XacmlContextRequest request, string category)
        {
            Dictionary<string, ICollection<XacmlAttribute>> requestAttributes = this.GetCategoryAttributes(request, category);

            XacmlAttributeMatchResult xacmlAttributeMatchResult = XacmlAttributeMatchResult.NoMatch;

            if (this.Target == null)
            {
                // If the rules does not have any target, it is a match anyway
                return XacmlAttributeMatchResult.Match;
            }

            bool foundCategoryInAnyOf = false;

            foreach (XacmlAnyOf anyOf in this.Target.AnyOf)
            {
                foreach (XacmlAllOf allOf in anyOf.AllOf)
                {
                    bool allAttributesInAllOfMatched = true;
                    bool matchinAttributeCategoryFoundInAllOf = false;

                    foreach (XacmlMatch xacmlMatch in allOf.Matches)
                    {
                        if (xacmlMatch.AttributeDesignator.Category.Equals(category))
                        {
                            matchinAttributeCategoryFoundInAllOf = true;

                            if (requestAttributes.ContainsKey(xacmlMatch.AttributeDesignator.AttributeId.OriginalString))
                            {
                                bool attributeValueMatched = false;
                                foreach (XacmlAttribute xacmlAttribute in requestAttributes[xacmlMatch.AttributeDesignator.AttributeId.OriginalString])
                                {
                                    foreach (XacmlAttributeValue attValue in xacmlAttribute.AttributeValues)
                                    {
                                        if (xacmlMatch.IsMatch(attValue))
                                        {
                                            attributeValueMatched = true;
                                            break;
                                        }
                                    }
                                }

                                if (!attributeValueMatched)
                                {
                                    allAttributesInAllOfMatched = false;
                                }
                            }
                            else
                            {
                                allAttributesInAllOfMatched = false;
                                if (xacmlMatch.AttributeDesignator.MustBePresent.HasValue && xacmlMatch.AttributeDesignator.MustBePresent.Value)
                                {
                                    xacmlAttributeMatchResult = XacmlAttributeMatchResult.RequiredAttributeMissing;
                                }
                            }
                        }
                    }

                    if (allAttributesInAllOfMatched && matchinAttributeCategoryFoundInAllOf)
                    {
                        // All allOff matches for attributes in a anyOff did match.
                        xacmlAttributeMatchResult = XacmlAttributeMatchResult.Match;
                    }

                    if (matchinAttributeCategoryFoundInAllOf)
                    {
                        foundCategoryInAnyOf = true;
                    }
                }
            }

            if (!foundCategoryInAnyOf)
            {
                // If none of the attributes in policy is for this category it is for any attributes of this category
                return XacmlAttributeMatchResult.Match;
            }

            return xacmlAttributeMatchResult;
        }

        private Dictionary<string, ICollection<XacmlAttribute>> GetCategoryAttributes(XacmlContextRequest request, string category)
        {
            Dictionary<string, ICollection<XacmlAttribute>> categoryAttributes = new Dictionary<string, ICollection<XacmlAttribute>>();
            foreach (XacmlContextAttributes attributes in request.Attributes)
            {
                if (attributes.Category.Equals(category))
                {
                    foreach (XacmlAttribute attribute in attributes.Attributes)
                    {
                        if (categoryAttributes.Keys.Contains(attribute.AttributeId.OriginalString))
                        {
                            categoryAttributes[attribute.AttributeId.OriginalString].Add(attribute);
                        }
                        else
                        {
                            ICollection<XacmlAttribute> newCollection = new Collection<XacmlAttribute>();
                            newCollection.Add(attribute);

                            categoryAttributes.Add(attribute.AttributeId.OriginalString, newCollection);
                        }
                    }
                }
            }

            return categoryAttributes;
        }
    }
}
