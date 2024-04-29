using System.IO;
using System.Linq;

namespace Altinn.Studio.Designer.Migrations.InitialSqlScripts;

public class InitialScriptsReadHelper
{
    public static string ReadInitialSqlScript(string scriptName)
    {
        var assembly = typeof(InitialScriptsReadHelper).Assembly;
        string resourceName = assembly.GetManifestResourceNames()
            .Single(x => x.EndsWith(scriptName));

        using Stream stream = assembly.GetManifestResourceStream(resourceName);
        using StreamReader reader = new(stream);
        return reader.ReadToEnd();
    }
}
