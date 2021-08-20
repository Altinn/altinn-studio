namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Model holding details for creating a pull request
    /// </summary>
    public class CreatePullRequestOption
    {
        /// <summary>
        /// The name of the branch the changes should be pulled into.
        /// </summary>
        public string Base { get; set; }

        /// <summary>
        /// The name of the branch where your changes are implemented. 
        /// </summary>
        public string Head { get; set; }

        /// <summary>
        /// The contents of the pull request.
        /// </summary>
        public string Body { get; set; }

        /// <summary>
        /// The title of the pull request
        /// </summary>
        public string Title { get; set; }
    }
}
