using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.Legacy;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// A small wrapper around loading legacy eFormidling configuration from ApplicationMetadata, to be able to use the same configuration as the new eFormidling service task.
/// </summary>
/// <remarks>Should be deleted when <see cref="EformidlingServiceTaskLegacy" /> is removed.</remarks>
public interface IEFormidlingLegacyConfigurationProvider
{
    /// <summary>
    /// Gets validated eFormidling configuration from ApplicationMetadata (legacy).
    /// </summary>
    /// <returns>Validated eFormidling configuration.</returns>
    Task<ValidAltinnEFormidlingConfiguration> GetLegacyConfiguration();
}

/// <inheritdoc />
internal sealed class EFormidlingLegacyConfigurationProvider : IEFormidlingLegacyConfigurationProvider
{
    private readonly IAppMetadata _appMetadata;

    public EFormidlingLegacyConfigurationProvider(IAppMetadata appMetadata)
    {
        _appMetadata = appMetadata;
    }

    public async Task<ValidAltinnEFormidlingConfiguration> GetLegacyConfiguration()
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        EFormidlingContract? eFormidling = applicationMetadata.EFormidling;

        if (eFormidling is null)
        {
            throw new ApplicationConfigException($"No legacy eFormidling configuration found in application metadata.");
        }

        return new ValidAltinnEFormidlingConfiguration(
            true, // Enabled prop is not used in legacy mode, as whether eFormidling is enabled or not is determined in the legacy service task.
            eFormidling.Receiver,
            eFormidling.Process,
            eFormidling.Standard,
            eFormidling.TypeVersion,
            eFormidling.Type,
            eFormidling.SecurityLevel,
            eFormidling.DPFShipmentType,
            eFormidling.DataTypes?.ToList() ?? []
        );
    }
}
