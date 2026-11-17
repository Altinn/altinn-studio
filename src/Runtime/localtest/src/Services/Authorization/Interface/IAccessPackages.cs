namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// The access packages ("tilgangspakker") a subject holds for a party, as bare identifiers such as <c>lonn</c>
    /// </summary>
    public interface IAccessPackages
    {
        /// <summary>
        /// Gets the access packages the user holds for the party: those held for the party itself and, when the party
        /// is a sub-unit, those held for its main unit
        /// </summary>
        /// <param name="userId">The user id</param>
        /// <param name="partyId">The party the user acts for</param>
        Task<List<string>> GetAccessPackagesForUser(int userId, int partyId);

        /// <summary>
        /// Gets the access packages the system user holds for the party: its packages when the party is the system
        /// user's own organization or one of its sub-units, and none otherwise
        /// </summary>
        /// <param name="systemUserId">The system user id (uuid)</param>
        /// <param name="partyId">The party the system user acts for</param>
        Task<List<string>> GetAccessPackagesForSystemUser(string systemUserId, int partyId);
    }
}
