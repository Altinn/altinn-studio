namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.25 Element <Expression/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503878
    /// The <Expression /> element is not used directly in a policy.
    /// The <Expression /> element signifies that an element that extends the ExpressionType and is a member of the <Expression /> element substitution group SHALL appear in its place.
    ///
    /// The following elements are in the <Expression/> element substitution group:
    /// <Apply/>, <AttributeSelector/>, <AttributeValue/>, <Function/>, <VariableReference/> and<AttributeDesignator/>.
    ///
    /// This interface is implemtend by the above types to make it possible to have a generic property on the XacmlExpression type.
    /// </summary>
    public interface IXacmlExpression
    {
    }
}
