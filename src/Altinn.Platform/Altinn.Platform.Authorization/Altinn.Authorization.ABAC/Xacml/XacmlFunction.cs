using System;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.28 Element <Function/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047133
    /// The <Function/> element SHALL be used to name a function as an argument to the function defined by the parent <Apply/> element.
    ///
    /// The <Function/> element is of FunctionType complex type.
    /// The<Function/> element contains the following attribute:
    /// FunctionId[Required]
    /// The identifier of the function.
    /// </summary>
    public class XacmlFunction : IXacmlExpression
    {
        private Uri functionId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlFunction"/> class.
        /// </summary>
        /// <param name="functionId">The identifier of the function.</param>
        public XacmlFunction(Uri functionId)
        {
            Guard.ArgumentNotNull(functionId, nameof(functionId));
            this.functionId = functionId;
        }

        /// <summary>
        /// Gets or sets the identifier of the function.
        /// </summary>
        public Uri FunctionId
        {
            get
            {
                return this.functionId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.functionId = value;
            }
        }
    }
}
