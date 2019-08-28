using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// DataElement helper methods
    /// </summary>
    public static class DataElementHelper
    {
        /// <summary>
        /// Creates a data element based on element type, instance id, content type, content file name and file size. 
        /// </summary>
        /// <returns>DataElement</returns>
        public static DataElement CreateDataElement(string elementType, Instance instance, DateTime creationTime, string contentType, string contentFileName, long fileSize, string user)
        {
            string dataId = Guid.NewGuid().ToString();
            
            DataElement newData = new DataElement
            {
                // update data record
                Id = dataId,
                ElementType = elementType,
                ContentType = contentType,
                CreatedBy = user,
                CreatedDateTime = creationTime,
                FileName = contentFileName ?? $"{dataId}.xml",
                LastChangedBy = user,
                LastChangedDateTime = creationTime,
                FileSize = fileSize,
            };

            string guidFromInstanceId = instance.Id;

            if (guidFromInstanceId != null && guidFromInstanceId.Contains("/"))
            {
                guidFromInstanceId = instance.Id.Split("/")[1];
            }

            string filePath = DataFileName(instance.AppId, guidFromInstanceId, newData.Id);
            newData.StorageUrl = filePath;
            return newData;
        }
        
        /// <summary>
        /// Formats a filename for blob storage.
        /// </summary>
        public static string DataFileName(string appId, string instanceGuid, string dataElementId)
        {
            return $"{appId}/{instanceGuid}/data/{dataElementId}";
        }
    }
}
