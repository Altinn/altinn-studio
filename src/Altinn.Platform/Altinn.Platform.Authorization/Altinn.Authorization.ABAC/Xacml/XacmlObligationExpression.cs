using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.39 Element <ObligationExpression/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047144
    ///
    /// The <ObligationExpression/> element evaluates to an obligation and SHALL contain an identifier for an obligation and a set of expressions
    /// that form arguments of the action defined by the obligation.
    /// The FulfillOn attribute SHALL indicate the effect for which this obligation must be fulfilled by the PEP.
    ///
    /// The <ObligationExpression/> element is of ObligationExpressionType complexType.  See Section 7.18 for a description of how the set of obligations to be returned by the PDP is determined.
    ///
    /// The<ObligationExpression/> element contains the following elements and attributes:
    ///
    /// ObligationId[Required]
    /// Obligation identifier.The value of the obligation identifier SHALL be interpreted by the PEP.
    ///
    /// FulfillOn [Required]
    /// The effect for which this obligation must be fulfilled by the PEP.
    ///
    /// <AttributeAssignmentExpression/> [Optional]
    /// Obligation arguments in the form of expressions. The expressions SHALL be evaluated by the PDP to constant <AttributeValue/> elements or bags,
    /// which shall be the attribute assignments in the<Obligation/> returned to the PEP.If an <AttributeAssignmentExpression/> evaluates to an atomic attribute
    /// value, then there MUST be one resulting <AttributeAssignment/> which MUST contain this single attribute value.If the <AttributeAssignmentExpression/> evaluates to a bag,
    /// then there MUST be a resulting <AttributeAssignment/> for each of the values in the bag. If the bag is empty, there shall be no <AttributeAssignment/> from this <AttributeAssignmentExpression/>.
    /// The values of the obligation arguments SHALL be interpreted by the PEP.
    /// </summary>
    public class XacmlObligationExpression
    {
        private readonly ICollection<XacmlAttributeAssignmentExpression> attributeAssignmentExpressions = new Collection<XacmlAttributeAssignmentExpression>();
        private Uri obligationId;
        private XacmlEffectType fulfillOn;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlObligationExpression"/> class.
        /// </summary>
        /// <param name="obligationId">Obligation identifier.The value of the obligation identifier SHALL be interpreted by the PEP.</param>
        /// <param name="effectType">The effecttype</param>
        public XacmlObligationExpression(Uri obligationId, XacmlEffectType effectType)
        {
            Guard.ArgumentNotNull(obligationId, nameof(obligationId));
            this.obligationId = obligationId;
            this.fulfillOn = effectType;
        }

        /// <summary>
        /// Obligation identifier.The value of the obligation identifier SHALL be interpreted by the PEP.
        /// </summary>
        public Uri ObligationId
        {
            get
            {
                return this.obligationId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.obligationId = value;
            }
        }

        /// <summary>
        /// The effect for which this obligation must be fulfilled by the PEP.
        /// </summary>
        public XacmlEffectType FulfillOn
        {
            get
            {
                return this.fulfillOn;
            }

            set
            {
                this.fulfillOn = value;
            }
        }

        /// <summary>
        /// Obligation arguments in the form of expressions.The expressions SHALL be evaluated by the PDP to constant<AttributeValue/> elements or bags,
        /// which shall be the attribute assignments in the<Obligation/> returned to the PEP.If an <AttributeAssignmentExpression/> evaluates to an atomic attribute
        /// value, then there MUST be one resulting <AttributeAssignment/> which MUST contain this single attribute value.If the <AttributeAssignmentExpression/> evaluates to a bag,
        /// then there MUST be a resulting <AttributeAssignment/> for each of the values in the bag. If the bag is empty, there shall be no <AttributeAssignment/> from this <AttributeAssignmentExpression/>.
        /// The values of the obligation arguments SHALL be interpreted by the PEP.
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
