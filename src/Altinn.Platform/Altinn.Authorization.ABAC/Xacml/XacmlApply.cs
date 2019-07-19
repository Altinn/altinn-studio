using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// From Xacml Specification 5.27 http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503880
    /// The <Apply/> element denotes application of a function to its arguments, thus encoding a function call.
    /// The <Apply/> element can be applied to any combination of the members of the <Expression/> element substitution group.  See Section 5.25.
    ///
    /// The <Apply/> element is of ApplyType complex type.
    /// The<Apply/> element contains the following attributes and elements:
    /// 
    /// FunctionId[Required]
    /// The identifier of the function to be applied to the arguments.XACML-defined functions are described in Appendix A.3.
    ///
    /// <Description/> [Optional]
    /// A free-form description of the <Apply/> element.
    ///
    /// <Expression/> [Optional]
    /// Arguments to the function, which may include other functions.
    /// </summary>
    public class XacmlApply : IXacmlExpression
    {
        private readonly ICollection<IXacmlExpression> parameters = new Collection<IXacmlExpression>();
        private Uri functionId;

        /// <summary>
        /// Gets or sets A free-form description of the <Apply/> element.
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlApply"/> class.
        /// </summary>
        /// <param name="functionId">The identifier of the function to be applied to the arguments.XACML-defined functions are described in Appendix A.3.</param>
        public XacmlApply(Uri functionId)
        {
            Guard.ArgumentNotNull(functionId, nameof(functionId));
            this.functionId = functionId;
        }

       /// <summary>
       /// The collection of parameters for the Apply object
       /// </summary>
        public ICollection<IXacmlExpression> Parameters
        {
            get
            {
                return this.parameters;
            }
        }

        /// <summary>
        /// The identifier of the function to be applied to the arguments.XACML-defined functions are described in Appendix A.3 of the XACML documentation
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
