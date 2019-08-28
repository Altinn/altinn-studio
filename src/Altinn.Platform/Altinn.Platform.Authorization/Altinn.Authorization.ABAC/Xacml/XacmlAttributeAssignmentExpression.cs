using System;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.41 Element <AttributeAssignmentExpression/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503894
    /// The<AttributeAssignmentExpression/> element is used for including arguments in
    /// obligations and advice.It SHALL contain an AttributeId and an expression which SHALL by evaluated into the
    /// corresponding attribute value.The value specified SHALL be understood by the PEP, but it is not further specified by
    /// XACML.See Section 7.16.  Section 4.2.4.3 provides a number of examples of arguments included in obligations.
    ///
    /// The <AttributeAssignmentExpression/> element is of AttributeAssignmentExpressionType complex type.
    /// The <AttributeAssignmentExpression/> element contains the following attributes:
    ///
    /// <Expression/> [Required]
    /// The expression which evaluates to a constant attribute value or a bag of zero or more attribute values.See section 5.25.
    ///
    /// AttributeId[Required]
    /// The attribute identifier. The value of the AttributeId attribute in the resulting <AttributeAssignment/> element MUST be equal to this value.
    ///
    /// Category[Optional]
    /// An optional category of the attribute.If this attribute is missing, the attribute has no category.The value of the Category attribute in the resulting
    /// <AttributeAssignment/> element MUST be equal to this value.
    ///
    /// Issuer[Optional]
    /// An optional issuer of the attribute.If this attribute is missing, the attribute has no issuer.The value of the Issuer attribute in the resulting
    /// <AttributeAssignment/> element MUST be equal to this value.
    /// </summary>
    public class XacmlAttributeAssignmentExpression : XacmlExpression
    {
        private Uri attributeId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeAssignmentExpression"/> class.
        /// </summary>
        /// <param name="attributeId">The attribute identifier. The value of the AttributeId attribute in the resulting <AttributeAssignment/> element MUST be equal to this value.</param>
        /// <param name="expressionElement">The expression which evaluates to a constant attribute value or a bag of zero or more attribute values.See section 5.25.</param>
        public XacmlAttributeAssignmentExpression(Uri attributeId, IXacmlExpression expressionElement)
        {
            Guard.ArgumentNotNull(attributeId, nameof(attributeId));
            Guard.ArgumentNotNull(expressionElement, nameof(expressionElement));
            this.attributeId = attributeId;
            this.Property = expressionElement;
        }

        /// <summary>
        /// An optional category of the attribute.If this attribute is missing, the attribute has no category.The value of the Category attribute in the resulting
        /// <AttributeAssignment/> element MUST be equal to this value.
        /// </summary>
        public Uri Category { get; set; }

        /// <summary>
        /// An optional issuer of the attribute.If this attribute is missing, the attribute has no issuer.The value of the Issuer attribute in the resulting
        /// <AttributeAssignment/> element MUST be equal to this value.
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// The attribute identifier. The value of the AttributeId attribute in the resulting <AttributeAssignment/> element MUST be equal to this value.
        /// </summary>
        public Uri AttributeId
        {
            get
            {
                return this.attributeId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.attributeId = value;
            }
        }
    }
}
