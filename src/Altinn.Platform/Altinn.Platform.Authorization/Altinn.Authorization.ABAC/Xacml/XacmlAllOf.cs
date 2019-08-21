using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.8 Element <AllOf/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503861
    /// The <AllOf/> element SHALL contain a conjunctive sequence of <Match/> elements.
    ///
    /// The <AllOf/> element is of AllOfType complex type.
    /// The<AllOf/> element contains the following elements.
    ///
    /// <Match/> [One to Many]
    /// A conjunctive sequence of individual matches of the attributes in the request context and the embedded attribute values.See Section 5.9.
    /// </summary>
    public class XacmlAllOf
    {
        private readonly ICollection<XacmlMatch> matches = new Collection<XacmlMatch>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAllOf"/> class.
        /// </summary>
        /// <param name="matches">The matches.</param>
        public XacmlAllOf(IEnumerable<XacmlMatch> matches)
        {
            if (matches == null)
            {
                throw new ArgumentNullException(nameof(matches));
            }

            foreach (var item in matches)
            {
                if (item == null)
                {
                    throw new ArgumentException("Enumeration cannot contains null values.", nameof(matches));
                }

                this.matches.Add(item);
            }

            if (this.matches.Count == 0)
            {
                throw new ArgumentException("Enumeration cannot be empty.", nameof(matches));
            }
        }

        /// <summary>
        /// Gets the matches.
        /// </summary>
        public ICollection<XacmlMatch> Matches
        {
            get
            {
                return this.matches;
            }
        }
    }
}
