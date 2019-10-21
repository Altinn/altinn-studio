using System;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// From XACML Documentation http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503883
    /// 5.30 Element <AttributeSelector/>
    /// The<AttributeSelector/> element produces a bag of unnamed and uncategorized attribute values.The values shall be constructed from
    /// the node(s) selected by applying the XPath expression given by the element's Path attribute to the XML content indicated by the element's
    /// Category attribute.Support for the<AttributeSelector/> element is OPTIONAL.
    /// See section 7.3.7 for details of<AttributeSelector/> evaluation.
    ///
    /// The<AttributeSelector/> element is of AttributeSelectorType complex type
    ///
    /// The<AttributeSelector/> element has the following attributes:
    /// Category[Required]
    /// This attribute SHALL specify the attributes category of the <Content/> element containing the XML from which nodes will be selected. It also indicates the
    /// attributes category containing the applicable ContextSelectorId attribute, if the element includes a ContextSelectorId xml attribute.
    ///
    /// ContextSelectorId[Optional]
    /// This attribute refers to the attribute (by its AttributeId) in the request context in the category given by the Category attribute.
    /// The referenced attribute MUST have data type urn:oasis:names:tc:xacml:3.0:data-type:xpathExpression, and must select a single node in the<Content/> element.
    /// The XPathCategory attribute of the referenced attribute MUST be equal to the Category attribute of the attribute selector.
    ///
    /// Path[Required]
    /// This attribute SHALL contain an XPath expression to be evaluated against the specified XML content.
    /// See Section 7.3.7 for details of the XPath evaluation during <AttributeSelector/> processing.
    ///
    /// DataType[Required]
    /// The attribute specifies the datatype of the values returned from the evaluation of this <AttributeSelector/> element.
    ///
    /// MustBePresent[Required]
    /// This attribute governs whether the element returns “Indeterminate” or an empty bag in the event the XPath expression selects no node.
    /// See Section 7.3.5.  Also see Sections 7.17.2 and 7.17.3.
    /// </summary>
    public class XacmlAttributeSelector : IXacmlExpression
    {
        private Uri dataType;
        private bool? mustBePresent;
        private Uri category;
        private string path;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeSelector"/> class.
        /// </summary>
        /// <param name="path">This attribute SHALL contain an XPath expression to be evaluated against the specified XML content.</param>
        /// <param name="dataType">The attribute specifies the datatype of the values returned from the evaluation of this <AttributeSelector/> element.</param>
        public XacmlAttributeSelector(string path, Uri dataType)
        {
            Guard.ArgumentNotNull(path, nameof(path));
            Guard.ArgumentNotNull(dataType, nameof(dataType));
            this.path = path;
            this.dataType = dataType;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAttributeSelector"/> class.
        /// </summary>
        /// <param name="category">This attribute SHALL specify the attributes category of the <Content/> element containing the XML from which nodes will be selected. It also indicates the
        /// attributes category containing the applicable ContextSelectorId attribute, if the element includes a ContextSelectorId xml attribute.</param>
        /// <param name="path">This attribute SHALL contain an XPath expression to be evaluated against the specified XML content.</param>
        /// <param name="dataType">The attribute specifies the datatype of the values returned from the evaluation of this <AttributeSelector/> element.</param>
        /// <param name="mustBePresent">This attribute governs whether the element returns “Indeterminate” or an empty bag in the event the XPath expression selects no node.</param>
        public XacmlAttributeSelector(Uri category, string path, Uri dataType, bool mustBePresent)
        {
            Guard.ArgumentNotNull(category, nameof(category));
            Guard.ArgumentNotNull(path, nameof(path));

            if (path.Length == 0)
            {
                throw new ArgumentException("Value cannot be empty.", nameof(path));
            }

            Guard.ArgumentNotNull(dataType, nameof(dataType));
            this.dataType = dataType;
            this.category = category;
            this.path = path;
            this.mustBePresent = mustBePresent;
        }

        /// <summary>
        /// Gets or sets this attribute SHALL specify the attributes category of the <Content/> element containing the XML from which nodes will be selected. It also indicates the
        /// attributes category containing the applicable ContextSelectorId attribute, if the element includes a ContextSelectorId xml attribute.
        /// </summary>
        public Uri Category
        {
            get
            {
                return this.category;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.category = value;
            }
        }

        /// <summary>
        /// Gets or sets this attribute refers to the attribute (by its AttributeId) in the request context in the category given by the Category attribute.
        /// The referenced attribute MUST have data type urn:oasis:names:tc:xacml:3.0:data-type:xpathExpression, and must select a single node in the<Content/> element.
        /// The XPathCategory attribute of the referenced attribute MUST be equal to the Category attribute of the attribute selector.
        /// </summary>
        public Uri ContextSelectorId { get; set; }

        /// <summary>
        /// Gets or sets this attribute SHALL contain an XPath expression to be evaluated against the specified XML content.
        /// </summary>
        public string Path
        {
            get
            {
                return this.path;
            }

            set
            {
                if (value == null)
                {
                    throw new ArgumentNullException(nameof(value));
                }

                if (value.Length == 0)
                {
                    throw new ArgumentException("Value cannot be empty.", nameof(value));
                }

                this.path = value;
            }
        }

        /// <summary>
        /// The attribute specifies the datatype of the values returned from the evaluation of this <AttributeSelector/> element.
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
        /// This attribute governs whether the element returns “Indeterminate” or an empty bag in the event the XPath expression selects no node.
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
    }
}
