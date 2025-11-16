#nullable disable
namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Request model for creating a new branch
    /// </summary>
    public class CreateBranchRequest
    {
        /// <summary>
        /// Gets or sets the name of the branch to create
        /// </summary>
        public string BranchName { get; set; }
    }

    /// <summary>
    /// Request model for checking out a branch
    /// </summary>
    public class CheckoutBranchRequest
    {
        /// <summary>
        /// Gets or sets the name of the branch to checkout
        /// </summary>
        public string BranchName { get; set; }
    }

    /// <summary>
    /// Information about the current branch
    /// </summary>
    public class CurrentBranchInfo
    {
        /// <summary>
        /// Gets or sets the name of the current branch
        /// </summary>
        public string BranchName { get; set; }

        /// <summary>
        /// Gets or sets the SHA of the current commit
        /// </summary>
        public string CommitSha { get; set; }

        /// <summary>
        /// Gets or sets whether the branch is tracking a remote branch
        /// </summary>
        public bool IsTracking { get; set; }

        /// <summary>
        /// Gets or sets the name of the tracked remote branch
        /// </summary>
        public string RemoteName { get; set; }
    }

    /// <summary>
    /// Error response for uncommitted changes
    /// </summary>
    public class UncommittedChangesError
    {
        /// <summary>
        /// Gets or sets the error code
        /// </summary>
        public string ErrorCode { get; set; } = Filters.Git.GitErrorCodes.UncommittedChanges;

        /// <summary>
        /// Gets or sets the error type
        /// </summary>
        public string Error { get; set; }

        /// <summary>
        /// Gets or sets the error message
        /// </summary>
        public string Message { get; set; }

        /// <summary>
        /// Gets or sets the list of uncommitted files
        /// </summary>
        public System.Collections.Generic.List<UncommittedFile> UncommittedFiles { get; set; }

        /// <summary>
        /// Gets or sets the current branch name
        /// </summary>
        public string CurrentBranch { get; set; }

        /// <summary>
        /// Gets or sets the target branch name
        /// </summary>
        public string TargetBranch { get; set; }
    }

    /// <summary>
    /// Information about an uncommitted file
    /// </summary>
    public class UncommittedFile
    {
        /// <summary>
        /// Gets or sets the file path
        /// </summary>
        public string FilePath { get; set; }

        /// <summary>
        /// Gets or sets the file status
        /// </summary>
        public string Status { get; set; }
    }
}
