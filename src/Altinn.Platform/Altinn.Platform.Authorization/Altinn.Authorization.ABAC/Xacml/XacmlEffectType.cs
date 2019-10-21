namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// The EffectType simple type defines the values allowed for the Effect attribute of the <Rule/> element and for the
    /// FulfillOn attribute of the <ObligationExpression/> and <AdviceExpression/> elements.
    /// </summary>
    public enum XacmlEffectType
    {
        /// <summary>
        /// Permits a action if rules is fulfilled
        /// </summary>
        Permit,

        /// <summary>
        /// Denies a action if a rule is fullfilled
        /// </summary>
        Deny,
    }
}
