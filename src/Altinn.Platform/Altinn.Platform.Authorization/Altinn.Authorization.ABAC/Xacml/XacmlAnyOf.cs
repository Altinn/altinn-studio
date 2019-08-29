using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.7 Element <AnyOf />
    /// The <AnyOf /> element SHALL contain a disjunctive sequence of <AllOf /> elements.
    /// The<AnyOf/> element is of AnyOfType complex type.
    /// The<AnyOf/> element contains the following elements:
    /// <AllOf/> [One to Many, Required] See Section 5.8.
    /// </summary>
    public class XacmlAnyOf
    {
        private readonly ICollection<XacmlAllOf> allOf = new NoNullCollection<XacmlAllOf>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAnyOf"/> class.
        /// </summary>
        /// <param name="allOf">All of.</param>
        public XacmlAnyOf(IEnumerable<XacmlAllOf> allOf)
        {
            if (allOf == null)
            {
                throw new ArgumentNullException(nameof(allOf));
            }

            foreach (var item in allOf)
            {
                this.allOf.Add(item);
            }
        }

        /// <summary>
        /// Gets a value AllOf.
        /// </summary>
        public ICollection<XacmlAllOf> AllOf
        {
            get
            {
                return this.allOf;
            }
        }

        /// <summary>
        /// Helper class to prevent null objects.
        /// </summary>
        /// <typeparam name="T">The type.</typeparam>
        private class NoNullCollection<T> : Collection<T>
        {
            protected override void InsertItem(int index, T item)
            {
                if (item == null)
                {
                    throw new ArgumentNullException(nameof(item));
                }

                base.InsertItem(index, item);
            }
        }
    }
}
