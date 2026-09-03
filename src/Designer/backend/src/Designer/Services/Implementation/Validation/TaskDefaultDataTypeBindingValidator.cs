using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Validation;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;

namespace Altinn.Studio.Designer.Services.Implementation.Validation;

public class TaskDefaultDataTypeBindingValidator(
    IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    IAppVersionService appVersionService
) : ITaskDefaultDataTypeBindingValidator
{
    private const string MissingBinding = "MISSING";
    private const string DataTypeNotFound = "NOT_FOUND";

    public async Task<IReadOnlyDictionary<string, string[]>> ValidateAsync(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    )
    {
        if (!appVersionService.IsV9App(editingContext))
        {
            return new Dictionary<string, string[]>();
        }

        AltinnAppGitRepository repository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            editingContext.Org,
            editingContext.Repo,
            editingContext.Developer
        );

        HashSet<string> dataTypeIds;
        try
        {
            var applicationMetadata = await repository.GetApplicationMetadata(cancellationToken);
            dataTypeIds =
                applicationMetadata.DataTypes?.Select(dataType => dataType.Id).ToHashSet(StringComparer.Ordinal) ?? [];
        }
        catch (Exception)
        {
            return new Dictionary<string, string[]>();
        }

        IEnumerable<string> processTaskIds;
        try
        {
            processTaskIds = repository.GetProcessDefinitions()?.Process?.Tasks?.Select(task => task.Id) ?? [];
        }
        catch (NotFoundHttpRequestException)
        {
            return new Dictionary<string, string[]>();
        }

        var errors = new Dictionary<string, List<string>>(StringComparer.Ordinal);

        foreach (string taskId in processTaskIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            LayoutSettings layoutSettings;
            try
            {
                layoutSettings = await repository.GetLayoutSettings(taskId, cancellationToken);
            }
            catch (FileNotFoundException)
            {
                AddError(errors, MissingBindingKey(taskId), MissingBinding);
                continue;
            }

            if (string.IsNullOrWhiteSpace(layoutSettings.DefaultDataType))
            {
                AddError(errors, MissingBindingKey(taskId), MissingBinding);
                continue;
            }

            if (!dataTypeIds.Contains(layoutSettings.DefaultDataType))
            {
                AddError(errors, NotFoundBindingKey(taskId, layoutSettings.DefaultDataType), DataTypeNotFound);
            }
        }

        return errors.ToDictionary(entry => entry.Key, entry => entry.Value.ToArray());
    }

    private static string MissingBindingKey(string taskId) => $"taskSettings[{taskId}].defaultDataType.missing";

    private static string NotFoundBindingKey(string taskId, string dataTypeId) =>
        $"taskSettings[{taskId}].defaultDataType.notFound.{dataTypeId}";

    private static void AddError(Dictionary<string, List<string>> errors, string key, string message)
    {
        if (!errors.TryGetValue(key, out List<string>? list))
        {
            list = [];
            errors[key] = list;
        }

        list.Add(message);
    }
}
