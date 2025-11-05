#nullable disable
using System;
using System.IO;
using System.Linq;

namespace Altinn.Studio.Designer.Migrations.SqlScripts;

public class SqlScriptsReadHelper
{
    public static string ReadSqlScript(string scriptName)
    {
        string resourceNameEnding = scriptName.Replace('/', '.');
        if (!resourceNameEnding.EndsWith(".sql"))
        {
            throw new ArgumentException("Invalid script name");
        }

        var assembly = typeof(SqlScriptsReadHelper).Assembly;
        string resourceName = assembly.GetManifestResourceNames()
            .Single(x => x.EndsWith(resourceNameEnding));

        using Stream stream = assembly.GetManifestResourceStream(resourceName);
        using StreamReader reader = new(stream!);
        return reader.ReadToEnd();
    }
}
