namespace Altinn.Platform.Authentication.Repositories
{
    /// <summary>
    /// Organisation repository of valid organisations. 
    /// </summary>
    public interface IOrganisationRepository
    {
        /// <summary>
        /// Lookups an organisation and returns the altinn org identifier.
        /// </summary>
        /// <param name="organisationNumber">organisation number</param>
        /// <returns>altinn org identifier</returns>
        public string LookupOrg(string organisationNumber);

        /// <summary>
        /// Trigger harvest of organisation repository.
        /// </summary>
        public void HarvestOrgs();
    }
}
