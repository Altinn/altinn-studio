using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.24 Element <VariableReference/>
    ///
    /// The <VariableReference/> element is used to reference a value defined within the same encompassing <Policy/> element.
    /// The <VariableReference/> element SHALL refer to the <VariableDefinition/> element by identifier equality on the value of their respective VariableId attributes.
    /// One and only one <VariableDefinition/> MUST exist within the same encompassing <Policy/> element to which the <VariableReference/> refers.
    /// There MAY be zero or more <VariableReference/> elements that refer to the same <VariableDefinition/> element.
    ///
    /// The <VariableReference/> element is of the VariableReferenceType complex type, which is of the ExpressionType complex type and is a
    /// member of the <Expression/> element substitution group.  The <VariableReference/> element MAY appear any place where an <Expression/> element occurs in the schema.
    /// The<VariableReference/> element has the following attribute:
    ///
    /// VariableId[Required]
    /// The name used to refer to the value defined in a<VariableDefinition/> element.
    /// </summary>
    public class XacmlVariableReference : IXacmlExpression
    {
        private string variableId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlVariableReference"/> class.
        /// </summary>
        /// <param name="variableId">The name used to refer to the value defined in a<VariableDefinition/> element.</param>
        public XacmlVariableReference(string variableId)
        {
            if (variableId == null)
            {
                throw new ArgumentNullException(nameof(variableId));
            }

            if (variableId.Length == 0)
            {
                throw new ArgumentException("Value cannot be empty.", nameof(variableId));
            }

            this.variableId = variableId;
        }

        /// <summary>
        /// The name used to refer to the value defined in a<VariableDefinition/> element.
        /// </summary>
        public string VariableId
        {
            get
            {
                return this.variableId;
            }

            set
            {
                if (variableId == null)
                {
                    throw new ArgumentNullException(nameof(variableId));
                }

                if (variableId.Length == 0)
                {
                    throw new ArgumentException("Value cannot be empty.", nameof(variableId));
                }

                this.variableId = value;
            }
        }
    }
}
