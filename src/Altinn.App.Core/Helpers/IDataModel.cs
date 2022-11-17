using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Interface for accessing fields in the data model
/// </summary>
public interface IDataModelAccessor
{
    /// <summary>
    /// Get model data based on key and optionally indicies
    /// </summary>
    /// <remarks>
    /// Inline indicies in the key "Bedrifter[1].Ansatte[1].Alder" will override
    /// normal indicies, and if both "Bedrifter" and "Ansatte" is lists,
    /// "Bedrifter[1].Ansatte.Alder", will fail, because the indicies will be reset
    /// after an inline index is used
    /// </remarks>
    object? GetModelData(string key, ReadOnlySpan<int> indicies = default);

    /// <summary>
    /// Get the count of data elements set in a group (enumerable)
    /// </summary>
    int? GetModelDataCount(string key, ReadOnlySpan<int> indicies = default);

    /// <summary>
    /// Return a full dataModelBiding from a context aware binding by adding indicies
    /// </summary>
    /// <example>
    /// key = "bedrift.ansatte.navn"
    /// indicies = [1,2]
    /// => "bedrift[1].ansatte[2].navn"
    /// </example>
    string AddIndicies(string key, ReadOnlySpan<int> indicies = default);

    /// <summary>
    /// Remove a value from the wrapped datamodel
    /// </summary>
    void RemoveField(string key);

    /// <summary>
    /// Verify that a Key is a valid lookup for the datamodel 
    /// </summary>
    bool VerifyKey(string key);
}



