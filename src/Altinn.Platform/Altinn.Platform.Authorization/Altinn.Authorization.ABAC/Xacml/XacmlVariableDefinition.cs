namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.23 Element <VariableDefinition/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047128
    ///
    /// The <VariableDefinition/> element SHALL be used to define a value that can be referenced by a <VariableReference/> element.
    /// The name supplied for its VariableId attribute SHALL NOT occur in the VariableId attribute of any other <VariableDefinition/>
    /// element within the encompassing policy.  The <VariableDefinition/> element MAY contain undefined <VariableReference/> elements,
    /// but if it does, a corresponding <VariableDefinition/> element MUST be defined later in the encompassing policy.
    /// <VariableDefinition/> elements MAY be grouped together or MAY be placed close to the reference in the encompassing policy.
    /// There MAY be zero or more references to each <VariableDefinition/> element.
    ///
    /// The <VariableDefinition/> element is of VariableDefinitionType complex type.  The <VariableDefinition/> element has the following elements and attributes:
    ///
    /// <Expression/> [Required]
    /// Any element of ExpressionType complex type.
    ///
    /// VariableId [Required]
    /// The name of the variable definition.
    /// </summary>
    public class XacmlVariableDefinition : XacmlExpression
    {
        private string variableId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlVariableDefinition"/> class.
        /// </summary>
        /// <param name="variableId">The name of the variable definition.</param>
        public XacmlVariableDefinition(string variableId)
            : base()
        {
            this.VariableId = variableId;
        }

        /// <summary>
        /// The name of the variable definition.
        /// </summary>
        public string VariableId
        {
            get
            {
                return this.variableId;
            }

            set
            {
                this.variableId = value;
            }
        }
    }
}
