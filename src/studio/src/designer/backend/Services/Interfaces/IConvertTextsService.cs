namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for converting texts files into new format.
    /// </summary>
    public interface IConvertTextsService
    {
        /// <summary>
        /// Converts all texts files in a specific repository for a specific organisation.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        public void ConvertV1TextsToV2(string org, string repo, string developer);
    }
}
