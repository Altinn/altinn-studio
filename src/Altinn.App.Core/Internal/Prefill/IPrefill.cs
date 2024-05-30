namespace Altinn.App.Core.Internal.Prefill;

/// <summary>
/// The prefill service
/// </summary>
public interface IPrefill
{
    /// <summary>
    /// Prefills the data model based on key/values in the dictionary.
    /// </summary>
    /// <param name="dataModel">The data model object</param>
    /// <param name="externalPrefill">External given prefill</param>
    /// <param name="continueOnError">Ignore errors when true, throw on errors when false</param>
    void PrefillDataModel(object dataModel, Dictionary<string, string> externalPrefill, bool continueOnError = false);

    /// <summary>
    /// Prefills the data model based on the prefill json configuration file
    /// </summary>
    /// <param name="partyId">The partyId of the instance owner</param>
    /// <param name="dataModelName">The data model name</param>
    /// <param name="dataModel">The data model object</param>
    /// <param name="externalPrefill">External given prefill</param>
    Task PrefillDataModel(
        string partyId,
        string dataModelName,
        object dataModel,
        Dictionary<string, string>? externalPrefill = null
    );
}
