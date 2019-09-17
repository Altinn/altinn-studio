namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// The <Expression/> element is not used directly in a policy.
    /// The <Expression/> element signifies that an element that extends the ExpressionType and is a member of the <Expression/> element substitution group SHALL appear in its place.
    ///
    /// The following elements are in the <Expression/> element substitution group:
    /// <Apply/>, <AttributeSelector/>, <AttributeValue/>, <Function/>, <VariableReference/> and<AttributeDesignator/>.
    /// </summary>
    public class XacmlExpression
    {
        /// <summary>
        /// Defines the Given Expression Type for the Expression. Can be of type <Apply/>, <AttributeSelector/>, <AttributeValue/>, <Function/>, <VariableReference/> and<AttributeDesignator/>.
        /// </summary>
        public IXacmlExpression Property { get; set; }
    }
}
