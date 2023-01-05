namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Model for parameters used for repository search
    /// </summary>
    public class RepositorySearch
    {
        /// <summary>
        /// Gets or sets keyword that is used to seatch repository
        /// </summary>
        public string KeyWord { get; set; }

        /// <summary>
        /// Gets or sets whether only admin has access to the repository
        /// </summary>
        public bool OnlyAdmin { get; set; }

        /// <summary>
        /// Gets or sets whether only local repositories must be searched
        /// </summary>
        public bool OnlyLocalRepositories { get; set; }

        /// <summary>
        /// Gets or sets page size
        /// </summary>
        public int PageSize { get; set; }

        /// <summary>
        /// Gets or sets page
        /// </summary>
        public int Page { get; set; }
    }
}
