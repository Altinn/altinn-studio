using System.Diagnostics;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Default validator for signing tasks. Validates that all parties have signed the current task.
/// </summary>
internal sealed class SigningTaskValidator : IValidator
{
    private readonly IProcessReader _processReader;
    private readonly ISigningService _signingService;
    private readonly IAppMetadata _appMetadata;

    /// <summary>
    /// Initializes a new instance of the <see cref="SigningTaskValidator"/> class.
    /// </summary>
    public SigningTaskValidator(
        ILogger<SigningTaskValidator> logger,
        IProcessReader processReader,
        ISigningService signingService,
        IAppMetadata appMetadata
    )
    {
        _processReader = processReader;
        _signingService = signingService;
        _appMetadata = appMetadata;
    }

    /// <summary>
    /// We implement <see cref="ShouldRunForTask"/> instead.
    /// </summary>
    public string TaskId => "*";

    /// <summary>
    /// Only runs for tasks that are of type "signing".
    /// </summary>
    public bool ShouldRunForTask(string taskId)
    {
        AltinnTaskExtension? taskConfig;
        try
        {
            taskConfig = _processReader.GetAltinnTaskExtension(taskId);
        }
        catch (Exception)
        {
            return false;
        }

        if (taskConfig is null)
        {
            return false;
        }

        AltinnSignatureConfiguration? signingConfiguration = taskConfig.SignatureConfiguration;

        return signingConfiguration?.RunDefaultValidator is true && taskConfig.TaskType is "signing";
    }

    public bool NoIncrementalValidation => true;

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        throw new UnreachableException(
            "HasRelevantChanges should not be called because NoIncrementalValidation is true."
        );
    }

    /// <inheritdoc />
    /// <remarks>Validates that all required parties have signed the current task.</remarks>
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        AltinnSignatureConfiguration signingConfiguration =
            (_processReader.GetAltinnTaskExtension(taskId)?.SignatureConfiguration)
            ?? throw new ApplicationConfigException("Signing configuration not found in AltinnTaskExtension");

        ApplicationMetadata appMetadataResult = await _appMetadata.GetApplicationMetadata();

        List<SigneeContext> signeeContextsResult = await _signingService.GetSigneeContexts(
            dataAccessor,
            signingConfiguration,
            null,
            CancellationToken.None
        );

        DataType signatureDataType =
            appMetadataResult.DataTypes.FirstOrDefault(x => x.Id == signingConfiguration.SignatureDataType)
            ?? throw new ApplicationConfigException("Didn't find signature data type in app metadata");

        int signedCount = signeeContextsResult.Count(signeeContext => signeeContext.SignDocument is not null);
        bool haveMinimumAmountOfSignatures = signedCount >= signatureDataType.MinCount;
        bool allSigneesHaveSigned = signeeContextsResult.All(signeeContext => signeeContext.SignDocument is not null);

        if (haveMinimumAmountOfSignatures && allSigneesHaveSigned)
        {
            return [];
        }

        return
        [
            new ValidationIssue
            {
                Code = ValidationIssueCodes.DataElementCodes.MissingSignatures,
                Severity = ValidationIssueSeverity.Error,
                Description = language switch
                {
                    LanguageConst.Nb or null => "Det mangler påkrevde signaturer.",
                    LanguageConst.Nn => "Det manglar påkravde signaturar.",
                    _ => "Required signatures are missing.",
                },
            },
        ];
    }
}
