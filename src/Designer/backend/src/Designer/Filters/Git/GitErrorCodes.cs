#nullable disable
namespace Altinn.Studio.Designer.Filters.Git
{
    public class GitErrorCodes
    {
        public const string NonFastForwardError = "GT_01";
        public const string RepositoryNotFound = "GT_02";
        public const string SessionExpired = nameof(SessionExpired);
        public const string UncommittedChanges = "GT_04";
    }
}
