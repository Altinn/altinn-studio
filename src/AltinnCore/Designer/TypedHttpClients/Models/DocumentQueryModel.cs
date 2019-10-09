namespace AltinnCore.Designer.TypedHttpClients.Models
{
    /// <summary>
    /// Model used for querying DocumentDb
    /// </summary>
    public class DocumentQueryModel
    {
        /// <summary>
        /// Number of documents to find
        /// </summary>
        public int? Count { get; set; }

        /// <summary>
        /// The property to order by
        /// </summary>
        public string OrderBy { get; set; }

        /// <summary>
        /// The sorting order
        /// ASCENDING | DESCENDING
        /// </summary>
        public string SortOrder { get; set; }
    }
}
