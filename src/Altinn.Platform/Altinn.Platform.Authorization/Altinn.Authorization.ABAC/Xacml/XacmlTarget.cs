using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// The <Target/> element identifies the set of decision requests that the parent element is intended to evaluate.
    /// The <Target/> element SHALL appear as a child of a <PolicySet/> and <Policy/> element and MAY appear as a child of a <Rule/> element
    /// The<Target/> element SHALL contain a conjunctive sequence of<AnyOf/> elements.For the parent of the<Target/> element to be applicable to the decision
    /// request, there MUST be at least one positive match between each <AnyOf/> element of the<Target/> element and the corresponding section of the <Request/> element.
    ///
    /// The <Target/> element is of TargetType complex type.
    /// The<Target/> element contains the following elements:
    ///
    /// <AnyOf/> [Zero to Many]
    /// Matching specification for attributes in the context.If this element is missing, then the target SHALL match all contexts.
    /// </summary>
    public class XacmlTarget
    {
        private readonly ICollection<XacmlAnyOf> anyOf = new Collection<XacmlAnyOf>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlTarget"/> class.
        /// </summary>
        /// <param name="anyOf">Matching specification for attributes in the context.If this element is missing, then the target SHALL match all contexts.</param>
        public XacmlTarget(IEnumerable<XacmlAnyOf> anyOf)
        {
            if (anyOf != null)
            {
                foreach (var item in anyOf)
                {
                    this.anyOf.Add(item);
                }
            }
        }

        /// <summary>
        /// Matching specification for attributes in the context.If this element is missing, then the target SHALL match all contexts.
        /// </summary>
        public ICollection<XacmlAnyOf> AnyOf
        {
            get
            {
                return this.anyOf;
            }
        }
    }
}
