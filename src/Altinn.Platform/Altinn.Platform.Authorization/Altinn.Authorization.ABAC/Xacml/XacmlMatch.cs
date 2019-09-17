using System;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.9 Element <Match/>
    /// The <Match/> element SHALL identify a set of entities by matching attribute values in an <Attributes/> element of the request context with the embedded attribute value.
    ///
    /// The <Match/> element is of MatchType complex type.
    ///
    /// The <Match/> element contains the following attributes and elements:
    ///
    /// MatchId [Required]
    /// Specifies a matching function.The value of this attribute MUST be of type xs:anyURI with legal values documented in Section 7.6.
    ///
    /// <AttributeValue/> [Required]
    /// Embedded attribute value.
    ///
    /// <AttributeDesignator/> [Required choice]
    /// MAY be used to identify one or more attribute values in an<Attributes/> element of the request context.
    ///
    /// <AttributeSelector/> [Required choice]
    /// MAY be used to identify one or more attribute values in a<Content/> element of the request context.
    /// </summary>
    public class XacmlMatch
    {
        private Uri matchId;
        private XacmlAttributeValue attributeValue;
        private XacmlAttributeDesignator attributeDesignator;
        private XacmlAttributeSelector attributeSelector;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlMatch"/> class.
        /// </summary>
        /// <param name="matchId">Specifies a matching function.The value of this attribute MUST be of type xs:anyURI with legal values documented in Section 7.6.</param>
        /// <param name="attributeValue">Embedded attribute value.</param>
        /// <param name="attributeDesignator">MAY be used to identify one or more attribute values in an<Attributes/> element of the request context.</param>
        public XacmlMatch(Uri matchId, XacmlAttributeValue attributeValue, XacmlAttributeDesignator attributeDesignator)
        {
            Guard.ArgumentNotNull(matchId, nameof(matchId));
            Guard.ArgumentNotNull(attributeValue, nameof(attributeValue));
            Guard.ArgumentNotNull(attributeDesignator, nameof(attributeDesignator));
            this.matchId = matchId;
            this.attributeValue = attributeValue;
            this.attributeDesignator = attributeDesignator;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlMatch"/> class.
        /// </summary>
        /// <param name="matchId">Specifies a matching function.The value of this attribute MUST be of type xs:anyURI with legal values documented in Section 7.6.</param>
        /// <param name="attributeValue">Embedded attribute value.</param>
        /// <param name="attributeSelector">MAY be used to identify one or more attribute values in a<Content/> element of the request context.</param>
        public XacmlMatch(Uri matchId, XacmlAttributeValue attributeValue, XacmlAttributeSelector attributeSelector)
        {
            Guard.ArgumentNotNull(matchId, nameof(matchId));
            Guard.ArgumentNotNull(attributeValue, nameof(attributeValue));
            Guard.ArgumentNotNull(attributeSelector, nameof(attributeSelector));
            this.matchId = matchId;
            this.attributeValue = attributeValue;
            this.attributeSelector = attributeSelector;
        }

        /// <summary>
        /// Embedded attribute value.
        /// </summary>
        public XacmlAttributeValue AttributeValue
        {
            get
            {
                return this.attributeValue;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.attributeValue = value;
            }
        }

        /// <summary>
        /// MAY be used to identify one or more attribute values in an<Attributes/> element of the request context.
        /// </summary>
        public XacmlAttributeDesignator AttributeDesignator
        {
            get
            {
                return this.attributeDesignator;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.attributeDesignator = value;
            }
        }

        /// <summary>
        /// MAY be used to identify one or more attribute values in a<Content/> element of the request context.
        /// </summary>
        public XacmlAttributeSelector AttributeSelector
        {
            get
            {
                return this.attributeSelector;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.attributeSelector = value;
            }
        }

        /// <summary>
        /// Specifies a matching function.The value of this attribute MUST be of type xs:anyURI with legal values documented in Section 7.6.
        /// </summary>
        public Uri MatchId
        {
            get
            {
                return this.matchId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.matchId = value;
            }
        }

        /// <summary>
        /// Matches the context attribute against the Policy.
        /// </summary>
        /// <param name="xacmlAttributeValue">A xacml attribute value</param>
        /// <returns>A boolean indicating it is a match</returns>
        public bool IsMatch(XacmlAttributeValue xacmlAttributeValue)
        {
            if (this.AttributeValue.DataType.OriginalString.Equals(xacmlAttributeValue.DataType.OriginalString))
            {
                return AttributeMatcher.MatchAttributes(this.AttributeValue.Value, xacmlAttributeValue.Value, this.MatchId.OriginalString);
            }
            else
            {
                // Returns false if datatype is different even the values are the same
                return false;
            }
        }

        /// <summary>
        /// Matches a string attribute against the policy.
        /// </summary>
        /// <param name="contextValue">The value from context.</param>
        /// <returns>A bool telling if it is a match</returns>
        public bool IsMatch(string contextValue)
        {
            return AttributeMatcher.MatchAttributes(this.AttributeValue.Value, contextValue, this.MatchId.OriginalString);
        }
    }
}
