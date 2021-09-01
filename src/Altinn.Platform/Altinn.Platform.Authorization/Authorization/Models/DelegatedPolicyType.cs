namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model defines the different types of delegation policies and why it is relevant for a given coveredby (recipient).
    /// </summary>
    public enum DelegatedPolicyType
    {
        /// <summary>
        /// Not set
        /// </summary>
        None = 0,

        /// <summary>
        /// Direct delegations. The policy includes rights given directly to the recipient.
        /// </summary>
        DirectlyDelegated = 1,

        /// <summary>
        /// Inherited via key role. The policy includes rights given to a party where the recipient has a key role, thus inheriting all rights given to the party.
        /// </summary>
        InheritedViaKeyRole = 2,

        /// <summary>
        /// Inherited as subunit. If offeredby is a subunit, rights given from its parent to the recipient also applies to the subunit.
        /// </summary>
        InheritedAsSubunit = 3,

        /// <summary>
        /// Inherited as subunit via keyrole. If offeredby is a subunit, rights given from its parent to a party in which the recipient has a key role also applies to the subunit.
        /// </summary>
        InheritedAsSubunitViaKeyrole = 4
    }
}
