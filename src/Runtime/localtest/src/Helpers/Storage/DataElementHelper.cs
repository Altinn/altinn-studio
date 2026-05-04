using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Web;
using Altinn.Platform.Storage.Extensions;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace Altinn.Platform.Storage.Helpers;

/// <summary>
/// DataElement helper methods
/// </summary>
public static class DataElementHelper
{
    /// <summary>
    /// Creates a data element based on element type, instance id, content type, content file name and file size.
    /// </summary>
    /// <returns>DataElement</returns>
    public static DataElement CreateDataElement(
        string dataType,
        List<Guid> refs,
        Instance instance,
        DateTime creationTime,
        string contentType,
        string contentFileName,
        long fileSize,
        string user,
        string generatedFromTask
    )
    {
        string dataId = Guid.NewGuid().ToString();

        string guidFromInstanceId = instance.Id;

        if (guidFromInstanceId != null && guidFromInstanceId.Contains('/'))
        {
            guidFromInstanceId = instance.Id.Split("/")[1];
        }

        DataElement newData = new DataElement
        {
            // update data record
            Id = dataId,
            InstanceGuid = guidFromInstanceId,
            DataType = dataType,
            ContentType = contentType,
            CreatedBy = user,
            Created = creationTime,
            Filename = contentFileName,
            LastChangedBy = user,
            LastChanged = creationTime,
            Size = fileSize,
            Refs = refs,
        };

        if (!string.IsNullOrEmpty(generatedFromTask))
        {
            newData.References = new List<Reference>
            {
                new Reference
                {
                    Relation = Interface.Enums.RelationType.GeneratedFrom,
                    Value = generatedFromTask,
                    ValueType = Interface.Enums.ReferenceType.Task,
                },
            };
        }

        string filePath = DataFileName(instance.AppId, guidFromInstanceId, newData.Id);
        newData.BlobStoragePath = filePath;
        return newData;
    }

    /// <summary>
    /// Formats a filename for blob storage.
    /// </summary>
    public static string DataFileName(string appId, string instanceGuid, string dataElementId)
    {
        return $"{appId}/{instanceGuid}/data/{dataElementId}";
    }

    /// <summary>
    /// Get the stream from the request
    /// </summary>
    /// <param name="request">The request</param>
    /// <param name="limit">MultipartBoundaryLengthLimit</param>
    /// <returns></returns>
    public static async Task<(
        Stream Stream,
        string ContentType,
        string ContentFileName,
        long FileSize
    )> GetStream(HttpRequest request, int limit)
    {
        string contentType;
        string contentFileName = null;
        long fileSize = 0;
        Stream stream;
        if (MultipartRequestHelper.IsMultipartContentType(request.ContentType))
        {
            // Only read the first section of the Multipart message.
            MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(request.ContentType);
            string boundary = MultipartRequestHelper.GetBoundary(mediaType, limit);

            MultipartReader reader = new(boundary, request.Body);
            MultipartSection section = await reader.ReadNextSectionAsync();

            stream = section.Body;
            contentType = section.ContentType;

            bool hasContentDisposition = ContentDispositionHeaderValue.TryParse(
                section.ContentDisposition,
                out ContentDispositionHeaderValue contentDisposition
            );

            if (hasContentDisposition)
            {
                contentFileName = HttpUtility.UrlDecode(contentDisposition.GetFilename());
                fileSize = contentDisposition.Size ?? 0;
            }
        }
        else
        {
            stream = request.Body;
            if (request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
            {
                bool hasContentDisposition = ContentDispositionHeaderValue.TryParse(
                    headerValues.ToString(),
                    out ContentDispositionHeaderValue contentDisposition
                );

                if (hasContentDisposition)
                {
                    contentFileName = HttpUtility.UrlDecode(contentDisposition.GetFilename());
                    fileSize = contentDisposition.Size ?? 0;
                }
            }

            contentType = request.ContentType;
        }

        return (stream, contentType, contentFileName, fileSize);
    }
}
