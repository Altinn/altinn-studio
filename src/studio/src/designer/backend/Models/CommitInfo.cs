namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// commit information
    /// </summary>
    public class CommitInfo
    {
        /// <summary>
        /// Gets or sets message for the commit
        /// </summary>
        public string Message { get; set; }

        /// <summary>
        /// Gets or sets organisation for the commit
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// Gets or sets the repository name
        /// </summary>
        public string Repository { get; set; }
    }
}
