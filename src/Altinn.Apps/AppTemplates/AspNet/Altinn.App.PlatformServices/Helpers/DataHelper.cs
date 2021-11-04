using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Helpers
{
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
        public static Dictionary<string, string> GetUpdatedDataValues(List<DataField> dataFields, Dictionary<string, string> currentDataValues, string dataType, object updatedData)
        {
            Dictionary<string, string> dataFieldValues = GetDataFieldValues(dataFields, dataType, updatedData);
            return CompareDictionaries(currentDataValues, dataFieldValues);
        }

        /// <summary>
        /// Re-sets the listed data fields to their default value in the data object. 
        /// </summary>
        /// <param name="dataFields">The data fields to monitor</param>
        /// <param name="dataType">The type of the updated data objects</param>
        /// <param name="data">The data object</param>
        /// <returns>An updated data object</returns>
        public static object ResetDataFields(List<string> dataFields, string dataType, object data)
        {
            foreach (string dataField in dataFields)
            {
                string fixedPath = dataField.Replace("-", string.Empty);
                string[] keys = fixedPath.Split(".");
                ResetDataField(keys, data);
            }

            return data;
        }

        private static void ResetDataField(string[] keys, object data, int index = 0)
        {
            string key = keys[index];
            Type current = data.GetType();
            bool isLastKey = (keys.Length - 1) == index;

            PropertyInfo property = current.GetProperty(
               key,
               BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);

            if (property == null)
            {
                return;
            }
            else
            {
                object propertyValue = property.GetValue(data, null);

                if (propertyValue == null)
                {
                    return;
                }

                if (isLastKey)
                {
                    object defaultValue = property.PropertyType.IsValueType ? Activator.CreateInstance(property.PropertyType) : null;
                    property.SetValue(data, defaultValue);
                    return;
                }

                ResetDataField(keys, property.GetValue(data, null), index + 1);
            }
        }

        /// <summary>
        /// Retrieves data values from a data object based on a list of data fields.
        /// </summary>
        private static Dictionary<string, string> GetDataFieldValues(List<DataField> dataFields, string dataType, object data)
        {
            Dictionary<string, string> dataFieldValues = new Dictionary<string, string>();

            if (dataFields == null || !dataFields.Any(pf => pf.DataTypeId == dataType))
            {
                return dataFieldValues;
            }

            foreach (DataField field in dataFields)
            {
                if (dataType != field.DataTypeId)
                {
                    break;
                }

                string fixedPath = field.Path.Replace("-", string.Empty);
                string[] keys = fixedPath.Split(".");

                string value = GetValueFromDatamodel(keys, data);
                dataFieldValues.Add(field.Id, value);
            }

            return dataFieldValues;
        }

        /// <summary>
        /// Compares entries in the new dictionary with the original dictionary.
        /// </summary>
        /// <param name="originalDictionary">The original dictionary</param>
        /// <param name="newDictionary">The updated dictionary</param>
        /// <returns>A dictionary containing changed and new entries not represented in the original dictionary.</returns>
        private static Dictionary<string, string> CompareDictionaries(Dictionary<string, string> originalDictionary, Dictionary<string, string> newDictionary)
        {
            Dictionary<string, string> updatedValues = new Dictionary<string, string>();

            if (originalDictionary == null)
            {
                return newDictionary;
            }

            foreach (KeyValuePair<string, string> entry in newDictionary)
            {
                string key = entry.Key;
                string value = entry.Value;

                if (originalDictionary.ContainsKey(key) && originalDictionary[key] != value)
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

        private static string GetValueFromDatamodel(string[] keys, object data, int index = 0)
        {
            string key = keys[index];
            bool isLastKey = (keys.Length - 1) == index;
            Type current = data.GetType();

            PropertyInfo property = current.GetProperty(
               key,
               BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);

            if (property == null)
            {
                string errorMessage = $"Could not find the field {string.Join(".", keys)}, property {key} is not defined in the data model.";
                throw new IndexOutOfRangeException(errorMessage);
            }
            else
            {
                object propertyValue = property.GetValue(data, null);
                if (isLastKey)
                {
                    return propertyValue == null ? (string)propertyValue : propertyValue.ToString();
                }
                else
                {
                    // no need to look further down, it is not defined yet.
                    if (propertyValue == null)
                    {
                        return null;
                    }

                    // recurivly assign values
                    return GetValueFromDatamodel(keys, property.GetValue(data, null), index + 1);
                }
            }
        }
    }
}
