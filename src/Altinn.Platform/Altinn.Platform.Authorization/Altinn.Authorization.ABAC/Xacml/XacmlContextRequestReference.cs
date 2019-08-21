using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.51 Element <RequestReference/>  http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047156
    ///
    /// The <RequestReference/> element defines an instance of a request in terms of references to <Attributes/> elements.
    /// The semantics of this element are defined in [Multi]. Support for this element is optional.
    ///
    /// The <RequestReference/> element contains the following elements.
    ///
    /// <AttributesReference/> [one to many]
    /// A reference to an<Attributes/> element in the enclosing <Request/> element.See section 5.52.
    /// </summary>
    public class XacmlContextRequestReference
    {
        private readonly ICollection<string> attributeRefereneces = new Collection<string>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextRequestReference"/> class.
        /// </summary>
        /// <param name="references"> A reference to an<Attributes/> element in the enclosing <Request/> element.See section 5.52.</param>
        public XacmlContextRequestReference(IEnumerable<string> references)
        {
            foreach (var item in references)
            {
                this.attributeRefereneces.Add(item);
            }
        }

        /// <summary>
        ///  A reference to an<Attributes/> element in the enclosing <Request/> element.See section 5.52.
        /// </summary>
        public ICollection<string> AttributeReferences
        {
            get
            {
                return this.attributeRefereneces;
            }
        }
    }
}
