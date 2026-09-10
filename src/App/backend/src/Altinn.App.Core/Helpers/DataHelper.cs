using System.Reflection;
using Altinn.App.Core.Internal.App;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Helper class for handling data
/// </summary>
public static class DataHelper
{
    /// <summary>
    /// Identifies updated data values texts by extracting data fields from data object and comparing to dictionary of current values.
    /// </summary>
    /// <param name="dataFields">The data fields to monitor</param>
    /// <param name="currentDataValues">The current dictionary of data values </param>
    /// <param name="dataType">The type of the updated data objects</param>
    /// <param name="updatedData">The updated data object</param>
    /// <returns>A dictionary with the new or changed data values</returns>
    public static Dictionary<string, string?> GetUpdatedDataValues(
        List<DataField>? dataFields,
        Dictionary<string, string?> currentDataValues,
        string dataType,
        object updatedData
    ) => GetUpdatedDataValues(dataFields, currentDataValues, dataType, updatedData, metadataPropertyName: null);

    /// <summary>
    /// Identifies updated data values texts by extracting data fields from data object and comparing to dictionary of current values.
    /// </summary>
    /// <param name="dataFields">The data fields to monitor</param>
    /// <param name="currentDataValues">The current dictionary of data values </param>
    /// <param name="dataType">The type of the updated data objects</param>
    /// <param name="updatedData">The updated data object</param>
    /// <param name="metadataPropertyName">
    /// The <c>applicationmetadata.json</c> property <paramref name="dataFields"/> was read from —
    /// <c>presentationFields</c> or <c>dataFields</c>. Only used to name the offending configuration when
    /// the fields turn out to be unusable, so the app owner is told which of the two to go and fix.
    /// </param>
    /// <returns>A dictionary with the new or changed data values</returns>
    /// <remarks>
    /// Internal because only the app backend knows which of the two properties it read the fields from.
    /// The public overload above is the one apps call, and it reports both property names.
    /// </remarks>
    internal static Dictionary<string, string?> GetUpdatedDataValues(
        List<DataField>? dataFields,
        Dictionary<string, string?> currentDataValues,
        string dataType,
        object updatedData,
        string? metadataPropertyName
    )
    {
        Dictionary<string, string?> dataFieldValues = GetDataFieldValues(
            dataFields,
            dataType,
            updatedData,
            metadataPropertyName
        );
        return CompareDictionaries(currentDataValues, dataFieldValues);
    }

    /// <summary>
    /// Re-sets the listed data fields to their default value in the data object.
    /// </summary>
    /// <param name="dataFields">The data fields to monitor</param>
    /// <param name="data">The data object</param>
    public static void ResetDataFields(List<string> dataFields, object data)
    {
        foreach (string dataField in dataFields)
        {
            string fixedPath = dataField.Replace("-", string.Empty);
            string[] keys = fixedPath.Split(".");
            ResetDataField(keys, data);
        }
    }

    private static void ResetDataField(string[] keys, object data, int index = 0)
    {
        string key = keys[index];
        Type current = data.GetType();
        bool isLastKey = (keys.Length - 1) == index;

        PropertyInfo? property = current.GetProperty(
            key,
            BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance
        );

        if (property == null)
        {
            return;
        }

        object? propertyValue = property.GetValue(data, null);

        if (propertyValue == null)
        {
            return;
        }

        if (isLastKey)
        {
            object? defaultValue = property.PropertyType.IsValueType
                ? Activator.CreateInstance(property.PropertyType)
                : null;
            property.SetValue(data, defaultValue);
            return;
        }

        ResetDataField(keys, propertyValue, index + 1);
    }

    /// <summary>
    /// Retrieves data values from a data object based on a list of data fields.
    /// </summary>
    private static Dictionary<string, string?> GetDataFieldValues(
        List<DataField>? dataFields,
        string dataType,
        object data,
        string? metadataPropertyName
    )
    {
        Dictionary<string, string?> dataFieldValues = new Dictionary<string, string?>();

        if (dataFields == null)
        {
            return dataFieldValues;
        }

        foreach (DataField field in dataFields)
        {
            // Skip the entries belonging to other data types rather than stopping at the first one.
            // This loop used to `break` here, which made the result depend on the order the entries
            // happen to be written in: an entry for another data type sitting ahead of a matching one
            // ended the pass, and every matching entry after it was silently never computed.
            if (dataType != field.DataTypeId)
            {
                continue;
            }

            // Every id becomes a key in instance.presentationTexts / instance.dataValues, so two entries
            // sharing one cannot both be stored. Dictionary.Add would report only "an item with the same
            // key has already been added", which says nothing about applicationmetadata.json being at
            // fault - the analyzer rule ALTINNAPP0900 rejects this at build time, and this is the backstop
            // for an app that was built before it existed. Keep the wording aligned with that rule.
            if (dataFieldValues.ContainsKey(field.Id))
            {
                throw CreateDuplicateFieldIdException(dataFields, field, dataType, metadataPropertyName);
            }

            string fixedPath = field.Path.Replace("-", string.Empty);
            string[] keys = fixedPath.Split(".");

            string? value = GetValueFromDatamodel(keys, data);
            dataFieldValues.Add(field.Id, value);
        }

        return dataFieldValues;
    }

    /// <summary>
    /// Builds the exception for two field entries sharing an id. Scanning for the first claimant here
    /// rather than tracking it in the loop keeps the successful path allocation-free. The scan is
    /// restricted to <paramref name="dataType"/> so it names the entry actually in the dictionary,
    /// whichever entries the loop above chose to visit.
    /// </summary>
    private static ApplicationConfigException CreateDuplicateFieldIdException(
        List<DataField> dataFields,
        DataField duplicate,
        string dataType,
        string? metadataPropertyName
    )
    {
        string firstPath = dataFields.First(f => f.Id == duplicate.Id && f.DataTypeId == dataType).Path;

        // Name both properties when the caller did not say which one it read: quoting a single
        // "presentationFields/dataFields" would send the reader looking for a property that does
        // not exist in the file.
        string collection = metadataPropertyName is null
            ? "'presentationFields' or 'dataFields'"
            : $"'{metadataPropertyName}'";

        return new ApplicationConfigException(
            $"applicationmetadata.json declares the id '{duplicate.Id}' twice in {collection}, on "
                + $"'{firstPath}' and on '{duplicate.Path}', and both name the dataTypeId '{dataType}'. Each "
                + "entry's id is the key its value is stored under on the instance, so the two cannot both "
                + "survive. Give each entry its own id."
        );
    }

    /// <summary>
    /// Compares entries in the new dictionary with the original dictionary.
    /// </summary>
    /// <param name="originalDictionary">The original dictionary</param>
    /// <param name="newDictionary">The updated dictionary</param>
    /// <returns>A dictionary containing changed and new entries not represented in the original dictionary.</returns>
    private static Dictionary<string, string?> CompareDictionaries(
        Dictionary<string, string?>? originalDictionary,
        Dictionary<string, string?> newDictionary
    )
    {
        if (originalDictionary == null)
        {
            return newDictionary;
        }

        Dictionary<string, string?> updatedValues = [];

        foreach (KeyValuePair<string, string?> entry in newDictionary)
        {
            string key = entry.Key;
            string? value = entry.Value;

            if (originalDictionary.TryGetValue(key, out string? originalValue) && originalValue != value)
            {
                updatedValues.Add(key, value);
            }
            else if (!originalDictionary.ContainsKey(key))
            {
                updatedValues.Add(key, value);
            }
        }

        return updatedValues;
    }

    private static string? GetValueFromDatamodel(string[] keys, object data, int index = 0)
    {
        string key = keys[index];
        bool isLastKey = (keys.Length - 1) == index;
        Type current = data.GetType();

        PropertyInfo? property = current.GetProperty(
            key,
            BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance
        );

        if (property == null)
        {
            string errorMessage =
                $"Could not find the field {string.Join(".", keys)}, property {key} is not defined in the data model.";
            throw new IndexOutOfRangeException(errorMessage);
        }
        else
        {
            object? propertyValue = property.GetValue(data, null);
            if (isLastKey)
            {
                return propertyValue == null ? null : propertyValue.ToString();
            }
            else
            {
                // no need to look further down, it is not defined yet.
                if (propertyValue == null)
                {
                    return null;
                }

                // recurivly assign values
                return GetValueFromDatamodel(keys, propertyValue, index + 1);
            }
        }
    }
}
