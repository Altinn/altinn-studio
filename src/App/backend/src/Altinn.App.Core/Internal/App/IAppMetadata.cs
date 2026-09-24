using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// The app's own configuration files, read from memory. The values follow the files on disk in Development, so read
/// the property when the value is needed rather than keeping it in a service that lives for the whole app.
/// </summary>
public interface IAppMetadata
{
    /// <summary>
    /// <c>config/applicationmetadata.json</c> with the runtime values the app adds: the frontend feature flags, the
    /// external api ids and the default <c>onEntry</c>. Parsed once per version of the file and shared by every
    /// reader, so it must not be changed.
    /// </summary>
    /// <exception cref="ApplicationConfigException">When the file does not deserialize.</exception>
    public ApplicationMetadata ApplicationMetadata { get; }

    /// <summary>
    /// <c>config/authorization/policy.xml</c> as a string.
    /// </summary>
    /// <exception cref="FileNotFoundException">When the app has no policy file.</exception>
    public string XacmlPolicy { get; }

    /// <summary>
    /// <c>config/process/process.bpmn</c> as a string.
    /// </summary>
    /// <exception cref="ApplicationConfigException">When the app has no process file.</exception>
    public string ProcessDefinition { get; }

    /// <summary>
    /// <see cref="ApplicationMetadata"/> as a task, for code written when the file was read from disk.
    /// </summary>
    [Obsolete("The file is in memory. Use the ApplicationMetadata property.")]
    public Task<ApplicationMetadata> GetApplicationMetadata() => Task.FromResult(ApplicationMetadata);

    /// <summary>
    /// <see cref="XacmlPolicy"/> as a task, for code written when the file was read from disk.
    /// </summary>
    [Obsolete("The file is in memory. Use the XacmlPolicy property.")]
    public Task<string> GetApplicationXACMLPolicy() => Task.FromResult(XacmlPolicy);

    /// <summary>
    /// <see cref="ProcessDefinition"/> as a task, for code written when the file was read from disk.
    /// </summary>
    [Obsolete("The file is in memory. Use the ProcessDefinition property.")]
    public Task<string> GetApplicationBPMNProcess() => Task.FromResult(ProcessDefinition);
}
