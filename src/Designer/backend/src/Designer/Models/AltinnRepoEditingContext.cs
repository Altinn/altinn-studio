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

        /// <summary>
        /// Optional branch to check out when working on this repository.
        /// </summary>
        public string Branch { get; }

        private AltinnRepoEditingContext(string org, string repo, string developer, string branch = null) : base(org, repo)
        {
            ValidateDeveloper(developer);
            branch = NormalizeBranch(branch);
            ValidateBranch(branch);
            Developer = developer;
            Branch = branch;
        }

        private static void ValidateDeveloper(string developer)
        {
            Guard.AssertNotNullOrEmpty(developer, nameof(developer));
            if (!Regex.IsMatch(developer, "^[a-zA-Z0-9][a-zA-Z0-9-_\\.]*$"))
            {
                throw new ArgumentException("Provided developer name is not valid");
            }
        }

        private static void ValidateBranch(string branch)
        {
            if (branch == null)
            {
                return;
            }

            foreach (char c in branch)
            {
                if (char.IsWhiteSpace(c))
                {
                    throw new ArgumentException("Provided branch name is not valid");
                }
            }
        }

        private static string NormalizeBranch(string branch)
        {
            if (string.IsNullOrWhiteSpace(branch))
            {
                return null;
            }

            string trimmed = branch.Trim();
            return trimmed.Length == 0 ? null : trimmed;
        }

        public static AltinnRepoEditingContext FromOrgRepoDeveloper(string org, string repo, string developer, string branch = null)
        {
            return new AltinnRepoEditingContext(org, repo, developer, branch);
        }
    }
}
