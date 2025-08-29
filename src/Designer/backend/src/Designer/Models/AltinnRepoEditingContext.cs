using System;
using System.Text.RegularExpressions;
using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// A context class representing an Altinn repository in editing mode.
    /// This class in part of internal domain model and should not be exposed to the outside world.
    /// </summary>
    public class AltinnRepoEditingContext : AltinnRepoContext
    {
        /// <summary>
        /// Developer that is editing the repository.
        /// </summary>
        public string Developer { get; }

        private AltinnRepoEditingContext(string org, string repo, string developer) : base(org, repo)
        {
            ValidateDeveloper(developer);
            Developer = developer;
        }

        private static void ValidateDeveloper(string developer)
        {
            Guard.AssertNotNullOrEmpty(developer, nameof(developer));
            if (!Regex.IsMatch(developer, "^[a-zA-Z0-9][a-zA-Z0-9-_\\.]*$"))
            {
                throw new ArgumentException("Provided developer name is not valid");
            }
        }

        public static AltinnRepoEditingContext FromOrgRepoDeveloper(string org, string repo, string developer)
        {
            return new AltinnRepoEditingContext(org, repo, developer);
        }
    }
}
