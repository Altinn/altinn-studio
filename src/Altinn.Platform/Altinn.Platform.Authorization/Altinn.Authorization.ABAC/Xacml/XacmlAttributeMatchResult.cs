namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// Internal enum to be used in matching of attributes
    /// </summary>
    public enum XacmlAttributeMatchResult
    {
        /// <summary>
        /// Permits a action if rules is fulfilled
        /// </summary>
        NoMatch,

        /// <summary>
        /// A Required attribute in the policy is missing
        /// </summary>
        RequiredAttributeMissing,

        /// <summary>
        /// All attributes matches
        /// </summary>
        Match,

        /// <summary>
        /// There are to many attributes with same id / datatype than allowed
        /// </summary>
        ToManyAttributes,

        /// <summary>
        /// The number of attributes in bag failed
        /// </summary>
        BagSizeConditionFailed,
    }
}
