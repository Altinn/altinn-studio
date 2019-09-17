using System;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.29 Element <AttributeDesignator/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503882
    ///
    /// The<AttributeDesignator/> element retrieves a bag of values for a named attribute from the request context.A named attribute SHALL
    /// be considered present if there is at least one attribute that matches the criteria set out below.
    ///
    /// The<AttributeDesignator/> element SHALL return a bag containing all the attribute values that are matched by the named attribute.
    /// In the event that no matching attribute is present in the context, the MustBePresent attribute governs whether this element returns an empty bag or “Indeterminate”.
    /// See Section 7.3.5.
    /// The<AttributeDesignator/> MAY appear in the<Match/> element and MAY be passed to the <Apply/> element as an argument.
    /// The<AttributeDesignator/> element is of the AttributeDesignatorType complex type.
    ///
    /// A named attribute SHALL match an attribute if the values of their respective Category, AttributeId, DataType and Issuer attributes match.
    /// The attribute designator’s Category MUST match, by identifier equality, the Category of the <Attributes/> element in which the attribute is present.
    /// The attribute designator’s AttributeId MUST match, by identifier equality, the AttributeId of the attribute.  The attribute designator’s
    /// DataType MUST match, by identifier equality, the DataType of the same attribute.
    /// If the Issuer attribute is present in the attribute designator, then it MUST match, using the “urn:oasis:names:tc:xacml:1.0:function:string-equal” function,
    /// the Issuer of the same attribute.If the Issuer is not present in the attribute designator, then the matching of the attribute to the named attribute SHALL be
    /// governed by AttributeId and DataType attributes alone.
    ///
    /// The<AttributeDesignatorType/> contains the following attributes:
    ///
    /// Category[Required]
    /// This attribute SHALL specify the Category with which to match the attribute.
    ///
    /// AttributeId[Required]
    /// This attribute SHALL specify the AttributeId with which to match the attribute.
    ///
    /// DataType[Required]
    /// The bag returned by the <AttributeDesignator/> element SHALL contain values of this data-type.
    ///
    /// Issuer[Optional]
    /// This attribute, if supplied, SHALL specify the Issuer with which to match the attribute.
    ///
    /// MustBePresent[Required]
    /// This attribute governs whether the element returns “Indeterminate” or an empty bag in the event the named attribute is absent from the request context.See Section 7.3.5.
    /// Also see Sections 7.19.2 and 7.19.3.
    /// </summary>
    public class XacmlAttributeDesignator : IXacmlExpression
    {
        private Uri attributeId;
        private Uri dataType;
        private string issuer;
        private bool? mustBePresent;
        private Uri category;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeDesignator"/> class.
        /// </summary>
        /// <param name="attributeId"> This attribute SHALL specify the AttributeId with which to match the attribute.</param>
        /// <param name="dataType">The bag returned by the <AttributeDesignator/> element SHALL contain values of this data-type.</param>
        public XacmlAttributeDesignator(Uri attributeId, Uri dataType)
        {
            Guard.ArgumentNotNull(attributeId, nameof(attributeId));
            Guard.ArgumentNotNull(dataType, nameof(dataType));
            this.attributeId = attributeId;
            this.dataType = dataType;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeDesignator"/> class.
        /// </summary>
        /// <param name="category">This attribute SHALL specify the Category with which to match the attribute.</param>
        /// <param name="attributeId">This attribute SHALL specify the AttributeId with which to match the attribute.</param>
        /// <param name="dataType">The bag returned by the <AttributeDesignator/> element SHALL contain values of this data-type.</param>
        /// <param name="mustBePresent"> This attribute governs whether the element returns “Indeterminate” or an empty bag in the event the named attribute is absent from the request context.See Section 7.3.5.</param>
        public XacmlAttributeDesignator(Uri category, Uri attributeId, Uri dataType, bool mustBePresent)
        {
            Guard.ArgumentNotNull(category, nameof(category));
            Guard.ArgumentNotNull(attributeId, nameof(attributeId));
            Guard.ArgumentNotNull(dataType, nameof(dataType));
            this.attributeId = attributeId;
            this.dataType = dataType;
            this.mustBePresent = mustBePresent;
            this.category = category;
        }

        /// <summary>
        /// This attribute SHALL specify the AttributeId with which to match the attribute.
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
        /// The bag returned by the <AttributeDesignator/> element SHALL contain values of this data-type.
        /// </summary>
        public Uri DataType
        {
            get
            {
                return this.dataType;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.dataType = value;
            }
        }

        /// <summary>
        /// This attribute, if supplied, SHALL specify the Issuer with which to match the attribute.
        /// </summary>
        public string Issuer
        {
            get
            {
                return this.issuer;
            }

            set
            {
                this.issuer = value;
            }
        }

        /// <summary>
        /// This attribute governs whether the element returns “Indeterminate” or an empty bag in the event the named attribute is absent from the request context.See Section 7.3.5.
        /// </summary>
        public bool? MustBePresent
        {
            get
            {
                return this.mustBePresent;
            }

            set
            {
                this.mustBePresent = value;
            }
        }

        /// <summary>
        /// This attribute SHALL specify the Category with which to match the attribute.
        /// </summary>
        public Uri Category
        {
            get
            {
                return this.category;
            }

            set
            {
                this.category = value;
            }
        }
    }
}
