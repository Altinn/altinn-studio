using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.46 Element <Attribute/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503899
    /// The<Attribute/> element is the central abstraction of the request context.It contains attribute meta-data and one or more attribute values.
    /// The attribute meta-data comprises the attribute identifier and the attribute issuer.  <AttributeDesignator/> elements in the policy MAY refer to attributes by means of this meta-data.
    ///
    /// The <Attribute/> element is of AttributeType complex type.
    /// The<Attribute/> element contains the following attributes and elements:
    ///
    /// AttributeId[Required]
    /// The Attribute identifier.A number of identifiers are reserved by XACML to denote commonly used attributes.  See Appendix B.
    ///
    /// Issuer[Optional]
    /// The Attribute issuer.  For example, this attribute value MAY be an x500Name that binds to a public key, or it may be some other identifier exchanged out-of-band by issuing and relying parties.
    ///
    /// IncludeInResult [Default: false]
    /// Whether to include this attribute in the result. This is useful to correlate requests with their responses in case of multiple requests.
    ///
    /// <AttributeValue/> [One to Many]
    /// One or more attribute values.Each attribute value MAY have contents that are empty, occur once or occur multiple times.
    /// </summary>
    public class XacmlAttribute
    {
        private readonly ICollection<XacmlAttributeValue> attributeValues = new Collection<XacmlAttributeValue>();
        private Uri attributeId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttribute"/> class.
        /// </summary>
        /// <param name="attributeId">The Attribute identifier.A number of identifiers are reserved by XACML to denote commonly used attributes.  See Appendix B.</param>
        /// <param name="includeInResult">Whether to include this attribute in the result. This is useful to correlate requests with their responses in case of multiple requests.</param>
        public XacmlAttribute(Uri attributeId, bool includeInResult)
        {
            Guard.ArgumentNotNull(attributeId, nameof(attributeId));
            this.attributeId = attributeId;
            this.IncludeInResult = includeInResult;
        }

        /// <summary>
        /// Gets or sets the issuer.
        /// </summary>
        /// <value>
        /// The issuer.
        /// </value>
        public string Issuer { get; set; }

        /// <summary>
        /// Gets or sets the attribute identifier.
        /// </summary>
        /// <value>
        /// The attribute identifier.
        /// </value>
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
        /// Gets or sets a value indicating whether [include in result].
        /// </summary>
        /// <value>
        ///   <c>true</c> if [include in result]; otherwise, <c>false</c>.
        /// </value>
        public bool IncludeInResult { get; set; }

        /// <summary>
        /// Gets the attribute values.
        /// </summary>
        /// <value>
        /// The attribute values.
        /// </value>
        public ICollection<XacmlAttributeValue> AttributeValues
        {
            get
            {
                return this.attributeValues;
            }
        }
    }
}
