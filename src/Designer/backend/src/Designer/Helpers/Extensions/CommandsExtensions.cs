#nullable disable
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Helpers.Extensions;

public static class CommandsExtensions
{
    public static void StageAllChanges(LibGit2Sharp.Repository repository)
    {
        Commands.Stage(repository, "*");
    }
}
