using System;
using System.Collections.Generic;
using System.Linq;

using Altinn.Platform.Storage.Interface.Models;

using Newtonsoft.Json;

namespace Altinn.App.Common.Helpers
{
    /// <summary>
    /// Helper class for handling data
    /// </summary>
    public static class DataHelper
    {
        /// <summary>
        /// Identifies updated presentation texts by comparing data object.
        /// </summary>
        /// <param name="dataFields">The data fields to monitor</param>
        /// <param name="dataType">The data type of the two data objects</param>
        /// <param name="oldData">The old data object</param>
        /// <param name="updatedData">The updated data object</param>
        /// <returns>A dictionary with the updated data fields</returns>
        public static Dictionary<string, string> GetUpdatedDataFields(List<DataField> dataFields, string dataType, object oldData, object updatedData)
        {
            Dictionary<string, string> updatedFields = new Dictionary<string, string>();

            if (dataFields == null || !dataFields.Any(pf => pf.DataTypeId == dataType))
            {
                return updatedFields;
            }

            Dictionary<string, object> changes = JsonHelper.FindChangedFields(JsonConvert.SerializeObject(oldData), JsonConvert.SerializeObject(updatedData));

            foreach (DataField field in dataFields)
            {
                if (changes.ContainsKey(field.Path))
                {
                    string value = changes[field.Path]?.ToString();
                    updatedFields.Add(field.Id, value);
                }
            }

            return updatedFields;
        }
    }
}
