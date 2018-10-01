using System.Collections.Generic;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// TODO - Improve GIT model and views
    /// </summary>
    public class RepositoryModel
    {
        private List<string> files = new List<string>();

        /// <summary>
        /// Gets or sets the Url to the repository
        /// </summary>
        public string Url { get; set; }

        /// <summary>
        /// Gets or sets the Name for the repository
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets the list of files
        /// </summary>
        public List<string> Files
        {
            get
            {
                return this.files;
            }
        }
    }
}
