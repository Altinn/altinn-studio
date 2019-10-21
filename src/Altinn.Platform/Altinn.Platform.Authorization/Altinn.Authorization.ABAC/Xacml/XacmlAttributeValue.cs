using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Xml.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.31 Element <AttributeValue/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503884
    /// The<AttributeValue/> element SHALL contain a literal attribute value.
    ///
    /// The <AttributeValue/> element is of AttributeValueType complex type.
    /// The<AttributeValue/> element has the following attributes:
    ///
    /// DataType[Required]
    /// The data-type of the attribute value.
    /// </summary>
    public class XacmlAttributeValue : XacmlAnyElement, IXacmlExpression
    {
        private Uri dataType;
        private string value;
        private readonly ICollection<XAttribute> attributes = new Collection<XAttribute>();
        private readonly ICollection<XElement> elements = new Collection<XElement>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeValue"/> class.
        /// </summary>
        /// <param name="dataType">The data-type of the attribute value.</param>
        public XacmlAttributeValue(Uri dataType)
        {
            Guard.ArgumentNotNull(dataType, nameof(dataType));
            this.dataType = dataType;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeValue"/> class.
        /// </summary>
        /// <param name="dataType">The data-type of the attribute value.</param>
        /// <param name="value">The value.</param>
        public XacmlAttributeValue(Uri dataType, string value)
        {
            Guard.ArgumentNotNull(dataType, nameof(dataType));
            Guard.ArgumentNotNull(value, nameof(value));
            this.dataType = dataType;
            this.value = value;
        }

        /// <summary>
        /// The value of the attribute
        /// </summary>
        public virtual string Value
        {
            get
            {
                return this.value;
            }

            set
            {
                this.value = value;
            }
        }

        /// <summary>
        /// Gets or sets the data-type of the attribute value.
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
        /// The attributes.
        /// </summary>
        public ICollection<XAttribute> Attributes
        {
            get { return this.attributes; }
        }

        /// <summary>
        /// Gets the elements.
        /// </summary>
        public ICollection<XElement> Elements
        {
            get { return this.elements; }
        }

        /// <summary>
        /// Match Attribute value against input attribute value.
        /// </summary>
        /// <param name="matchFunction">The match function.</param>
        /// <param name="policyAttributeValue">The policy Attribute.</param>
        /// <returns>A bool indicating it is a match.</returns>
        public bool MatchAttributeValues(Uri matchFunction, XacmlAttributeValue policyAttributeValue)
        {
            return AttributeMatcher.MatchAttributes(this.value, policyAttributeValue.Value, matchFunction.OriginalString);
        }
    }
}
