using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Xml.Linq;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// Entity for any elements in XML.
    /// </summary>
    public abstract class XacmlAnyElement
    {
        private readonly ICollection<XAttribute> attributes = new Collection<XAttribute>();
        private readonly ICollection<XElement> elements = new Collection<XElement>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAnyElement"/> class.
        /// </summary>
        protected XacmlAnyElement()
        {
        }

        /// <summary>
        /// Gets xML attributes.
        /// </summary>
        public ICollection<XAttribute> Attributes
        {
            get { return this.attributes; }
        }

        /// <summary>
        /// Gets xML elements.
        /// </summary>
        public ICollection<XElement> Elements
        {
            get { return this.elements; }
        }
    }
}
