using System;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    ///  5.36 Element <AttributeAssignment/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047141
    /// The <AttributeAssignment/> element is used for including arguments in obligation and advice expressions.
    /// It SHALL contain an AttributeId and the corresponding attribute value, by extending the AttributeValueType type definition.
    /// The <AttributeAssignment/> element MAY be used in any way that is consistent with the schema syntax, which is a sequence of xs:any elements.
    /// The value specified SHALL be understood by the PEP, but it is not further specified by XACML. See Section 7.18.  Section 4.2.4.3
    /// provides a number of examples of arguments included in obligation.expressions.
    ///
    /// The <AttributeAssignment/> element is of AttributeAssignmentType complex type.
    /// The<AttributeAssignment/> element contains the following attributes:
    ///
    /// AttributeId[Required]
    /// The attribute Identifier.
    ///
    /// Category [Optional]
    /// An optional category of the attribute. If this attribute is missing, the attribute has no category.The PEP SHALL interpret the significance and meaning of any Category attribute.
    /// Non-normative note: an expected use of the category is to disambiguate attributes which are relayed from the request.
    ///
    /// Issuer[Optional]
    /// An optional issuer of the attribute.If this attribute is missing, the attribute has no issuer.The PEP SHALL interpret the significance and meaning of any Issuer attribute.
    /// Non-normative note: an expected use of the issuer is to disambiguate attributes which are relayed from the request.
    /// </summary>
    public class XacmlAttributeAssignment : XacmlAttributeValue
    {
        private Uri attributeId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeAssignment"/> class.
        /// </summary>
        /// <param name="attributeId"> The attribute Identifier.</param>
        /// <param name="dataType">The datatype</param>
        public XacmlAttributeAssignment(Uri attributeId, Uri dataType)
            : base(dataType)
        {
            Guard.ArgumentNotNull(attributeId, nameof(attributeId));
            this.attributeId = attributeId;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeAssignment"/> class.
        /// </summary>
        /// <param name="attributeId">The attribute Identifier.</param>
        /// <param name="dataType">The datatype.</param>
        /// <param name="value">The value.</param>
        public XacmlAttributeAssignment(Uri attributeId, Uri dataType, string value)
            : base(dataType)
        {
            Guard.ArgumentNotNull(attributeId, nameof(attributeId));
            Guard.ArgumentNotNull(value, nameof(value));
            this.attributeId = attributeId;
            base.Value = value;
        }

        /// <summary>
        /// An optional category of the attribute. If this attribute is missing, the attribute has no category.The PEP SHALL interpret the significance and meaning of any Category attribute.
        /// Non-normative note: an expected use of the category is to disambiguate attributes which are relayed from the request.
        /// </summary>
        public Uri Category { get; set; }

        /// <summary>
        /// An optional issuer of the attribute.If this attribute is missing, the attribute has no issuer.The PEP SHALL interpret the significance and meaning of any Issuer attribute.
        /// Non-normative note: an expected use of the issuer is to disambiguate attributes which are relayed from the request.
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// Gets or sets the AttributeId
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

        /// <summary>
        /// Gets or sets the value.
        /// </summary>
        public override string Value
        {
            get
            {
                return base.Value;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                base.Value = value;
            }
        }
    }
}
