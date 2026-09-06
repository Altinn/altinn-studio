using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Reads the signature configuration of a BPMN task, for the signing task and its commands.
/// </summary>
internal static class SigningTaskConfiguration
{
    public static AltinnSignatureConfiguration Get(IProcessReader processReader, string taskId)
    {
        AltinnSignatureConfiguration? signatureConfiguration = processReader
            .GetAltinnTaskExtension(taskId)
            ?.SignatureConfiguration;

        if (signatureConfiguration is null)
        {
            throw new ApplicationConfigException(
                "SignatureConfig is missing in the signature process task configuration."
            );
        }

        return signatureConfiguration;
    }

    /// <summary>
    /// Whether the task uses runtime-delegated signing: signees are resolved by a provider and their access is
    /// delegated when the task is entered.
    /// </summary>
    public static bool IsRuntimeDelegated(AltinnSignatureConfiguration configuration) =>
        configuration is { SigneeProviderId: not null, SigneeStatesDataTypeId: not null };
}
