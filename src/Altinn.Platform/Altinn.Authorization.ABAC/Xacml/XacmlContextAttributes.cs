using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// Defines the context attributes
    /// </summary>
    public class XacmlContextAttributes
    {
        private readonly ICollection<XacmlAttribute> attributes = new Collection<XacmlAttribute>();
        private Uri category;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextAttributes"/> class.
        /// </summary>
        /// <param name="category">The category.</param>
        public XacmlContextAttributes(Uri category)
            : this(category, null)
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextAttributes" /> class.
        /// </summary>
        /// <param name="category">The category.</param>
        /// <param name="attributes">The attributes.</param>
        /// <exception cref="System.ArgumentNullException">category</exception>
        public XacmlContextAttributes(Uri category, IEnumerable<XacmlAttribute> attributes)
        {
            Guard.ArgumentNotNull(category, nameof(category));
            this.Category = category;
            if (attributes != null)
            {
                foreach (var item in attributes)
                {
                    this.attributes.Add(item);
                }
            }
        }

        /// <summary>
        /// Gets or sets the identifier.
        /// </summary>
        /// <value>
        /// The identifier.
        /// </value>
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the content.
        /// </summary>
        /// <value>
        /// The content.
        /// </value>
        public string Content { get; set; }

        /// <summary>
        /// Gets or sets the attributes.
        /// </summary>
        /// <value>
        /// The attributes.
        /// </value>
        public ICollection<XacmlAttribute> Attributes
        {
            get
            {
                return this.attributes;
            }
        }

        /// <summary>
        /// Gets or sets the category.
        /// </summary>
        /// <value>
        /// The category.
        /// </value>
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
    }
}
