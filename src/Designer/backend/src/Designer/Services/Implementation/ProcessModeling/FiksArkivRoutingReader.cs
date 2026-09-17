using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.Extensions.Configuration;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling;

internal static class FiksArkivRoutingReader
{
    public static async Task<FiksArkivRouting> ReadAsync(string appDirectory, CancellationToken cancellationToken)
    {
        if (!Directory.Exists(appDirectory))
            return new(null, null, "missingConfiguration");

        // Studio cannot execute app startup code to resolve custom option bindings. These API/type
        // references conservatively disable outcome shortcuts; the expression editor remains available.
        foreach (string file in Directory.EnumerateFiles(appDirectory, "*.cs", SearchOption.AllDirectories))
        {
            if (
                Path.GetRelativePath(appDirectory, file)
                    .Split(Path.DirectorySeparatorChar)
                    .Any(p => p is "bin" or "obj")
            )
                continue;
            string source = await File.ReadAllTextAsync(file, cancellationToken);
            if (
                source.Contains("WithFiksArkivConfig", StringComparison.Ordinal)
                || source.Contains("ConfigureFiksArkiv", StringComparison.Ordinal)
                || source.Contains("FiksArkivSettings", StringComparison.Ordinal)
            )
                return new(null, null, "customConfiguration");
        }

        try
        {
            FiksArkivRouting routing = ReadSettings(appDirectory);
            foreach (string file in Directory.EnumerateFiles(appDirectory, "appsettings.*.json"))
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (ReadSettings(appDirectory, file) != routing)
                    return new(null, null, "environmentDependent");
            }
            return routing.SuccessAction == routing.FailureAction ? new(null, null, "identicalActions") : routing;
        }
        catch (InvalidDataException)
        {
            return new(null, null, "invalidConfiguration");
        }
        catch (FormatException)
        {
            return new(null, null, "invalidConfiguration");
        }
    }

    private static FiksArkivRouting ReadSettings(string appDirectory, string? environmentFile = null)
    {
        var builder = new ConfigurationBuilder().AddJsonFile(
            Path.Combine(appDirectory, "appsettings.json"),
            optional: true
        );
        if (environmentFile is not null)
            builder.AddJsonFile(environmentFile, optional: false);
        using var configuration = (ConfigurationRoot)builder.Build();
        string? success = configuration["FiksArkivSettings:successHandling:action"];
        string? failure = configuration["FiksArkivSettings:errorHandling:action"];
        if (
            configuration.GetSection("FiksArkivSettings:successHandling:action").GetChildren().Any()
            || configuration.GetSection("FiksArkivSettings:errorHandling:action").GetChildren().Any()
        )
            throw new FormatException("Fiks Arkiv outcome actions must be scalar values.");
        return new(
            string.IsNullOrWhiteSpace(success) ? null : success,
            string.IsNullOrWhiteSpace(failure) ? "reject" : failure
        );
    }
}
