using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// XACML 5.40 Element <AdviceExpression/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503891
    /// The <AdviceExpression/> element evaluates to an advice and SHALL contain an identifier for an advice and a set of expressions that form
    /// arguments of the supplemental information defined by the advice.  The AppliesTo attribute SHALL indicate the effect for which this advice must be provided to the PEP.
    ///
    /// The <AdviceExpression/> element is of AdviceExpressionType complexType.  See Section 7.16 for a description of how the set of advice to be returned by the PDP is determined.
    /// The<AdviceExpression/> element contains the following elements and attributes:
    ///
    /// AdviceId[Required]
    /// Advice identifier.The value of the advice identifier MAY be interpreted by the PEP.
    ///
    /// AppliesTo [Required]
    /// The effect for which this advice must be provided to the PEP.
    ///
    /// <AttributeAssignmentExpression/> [Optional]
    /// Advice arguments in the form of expressions. The expressions SHALL be evaluated by the PDP to constant <AttributeValue /> elements or bags, which shall be the
    /// attribute assignments in the<Advice /> returned to the PEP.If an <AttributeAssignmentExpression /> evaluates to an atomic attribute value, then there MUST be
    /// one resulting <AttributeAssignment /> which MUST contain this single attribute value.If the <AttributeAssignmentExpression /> evaluates to a bag, then there
    /// MUST be a resulting <AttributeAssignment /> for each of the values in the bag. If the bag is empty, there shall be no <AttributeAssignment /> from this
    /// <AttributeAssignmentExpression />.  The values of the advice arguments MAY be interpreted by the PEP.
    /// </summary>
    public class XacmlAdviceExpression
    {
        private readonly ICollection<XacmlAttributeAssignmentExpression> attributeAssignmentExpressions = new Collection<XacmlAttributeAssignmentExpression>();
        private Uri adviceId;
        private XacmlEffectType appliesTo;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAdviceExpression"/> class.
        /// </summary>
        /// <param name="adviceId">Advice identifier.The value of the advice identifier MAY be interpreted by the PEP.</param>
        /// <param name="appliesTo">The effect for which this advice must be provided to the PEP.</param>
        public XacmlAdviceExpression(Uri adviceId, XacmlEffectType appliesTo)
        {
            Guard.ArgumentNotNull(adviceId, nameof(adviceId));
            this.adviceId = adviceId;
            this.appliesTo = appliesTo;
        }

        /// <summary>
        /// Advice identifier.The value of the advice identifier MAY be interpreted by the PEP.
        /// </summary>
        public Uri AdviceId
        {
            get
            {
                return this.adviceId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.adviceId = value;
            }
        }

        /// <summary>
        /// The effect for which this advice must be provided to the PEP.
        /// </summary>
        public XacmlEffectType AppliesTo
        {
            get
            {
                return this.appliesTo;
            }

            set
            {
                this.appliesTo = value;
            }
        }

        /// <summary>
        /// Advice arguments in the form of expressions. The expressions SHALL be evaluated by the PDP to constant <AttributeValue /> elements or bags, which shall be the
        /// attribute assignments in the<Advice /> returned to the PEP.If an <AttributeAssignmentExpression /> evaluates to an atomic attribute value, then there MUST be
        /// one resulting <AttributeAssignment /> which MUST contain this single attribute value.If the <AttributeAssignmentExpression /> evaluates to a bag, then there
        /// MUST be a resulting <AttributeAssignment /> for each of the values in the bag. If the bag is empty, there shall be no <AttributeAssignment /> from this
        /// <AttributeAssignmentExpression />.  The values of the advice arguments MAY be interpreted by the PEP.
        /// </summary>
        public ICollection<XacmlAttributeAssignmentExpression> AttributeAssignmentExpressions
        {
            get
            {
                return this.attributeAssignmentExpressions;
            }
        }
    }
}
