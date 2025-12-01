using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Tests.Mocks;

public class ProcessClientMock : IProcessClient
{
    private readonly ILogger<ProcessClient> _logger;
    private readonly Telemetry? _telemetry;
    private readonly AppSettings _appSettings;

    public ProcessClientMock(
        IOptions<AppSettings> appSettings,
        ILogger<ProcessClient> logger,
        Telemetry? telemetry = null
    )
    {
        _appSettings = appSettings.Value;
        _logger = logger;
        _telemetry = telemetry;
    }

    public Stream GetProcessDefinition()
    {
        using var activity = _telemetry?.StartGetProcessDefinitionActivity();
        string bpmnFilePath = Path.Join(
            _appSettings.AppBasePath,
            _appSettings.ConfigurationFolder,
            _appSettings.ProcessFolder,
            _appSettings.ProcessFileName
        );

        try
        {
            Stream processModel = File.OpenRead(bpmnFilePath);

            return processModel;
        }
        catch (Exception processDefinitionException)
        {
            _logger.LogError(
                $"Cannot find process definition file for this app. Have tried file location {bpmnFilePath}. Exception {processDefinitionException}"
            );
            throw;
        }
    }

    public Task<ProcessHistoryList> GetProcessHistory(string instanceGuid, string instanceOwnerPartyId)
    {
        throw new NotImplementedException();
    }
}
