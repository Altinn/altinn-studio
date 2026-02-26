using Altinn.Platform.Storage.Interface.Models;
using LocalTest.Configuration;
using LocalTest.Services.Storage.Implementation;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Repository;

public class BlobRepository : IBlobRepository
{
    private readonly LocalPlatformSettings _localPlatformSettings;

    public BlobRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
    {
        _localPlatformSettings = localPlatformSettings.Value;
    }

    public Task<bool> DeleteBlob(
        string org,
        string blobStoragePath,
        int? storageAccountNumber
    )
    {
        string path = GetFilePath(blobStoragePath);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
        return Task.FromResult(true);
    }

    public async Task<Stream> ReadBlob(
        string org,
        string blobStoragePath,
        int? storageAccountNumber,
        CancellationToken cancellationToken = default
    )
    {
        string filePath = GetFilePath(blobStoragePath);
        return await ReadFileAsStream(filePath);
    }

    public async Task<(long ContentLength, DateTimeOffset LastModified)> WriteBlob(
        string org,
        Stream stream,
        string blobStoragePath,
        int? storageAccountNumber
    )
    {
        string filePath = GetFilePath(blobStoragePath);
        if (!Directory.Exists(Path.GetDirectoryName(filePath)))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(filePath));
        }

        return await WriteToFile(filePath, stream);
    }

    private string GetFilePath(string fileName)
    {
        return _localPlatformSettings.LocalTestingStorageBasePath + _localPlatformSettings.BlobStorageFolder + fileName;
    }

    private static async Task<Stream> ReadFileAsStream(string path)
    {
        try
        {
            return ReadFileAsStreamInternal(path);
        }
        catch (IOException ioException)
        {
            if (ioException.Message.Contains("used by another process"))
            {
                await Task.Delay(400);
                return ReadFileAsStreamInternal(path);
            }

            throw;
        }
    }

    private static Stream ReadFileAsStreamInternal(string path)
    {
        return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    private static async Task<(long ContentLength, DateTimeOffset LastModified)> WriteToFile(string path, Stream stream)
    {
        MemoryStream memStream;
        if (stream is not MemoryStream ms)
        {
            memStream = new MemoryStream();
            await stream.CopyToAsync(memStream);
            memStream.Position = 0;
        }
        else
        {
            memStream = ms;
        }

        try
        {
            return await WriteToFileInternal(path, memStream);
        }
        catch (IOException ioException)
        {
            if (ioException.Message.Contains("used by another process"))
            {
                await Task.Delay(400);
                memStream.Position = 0;
                return await WriteToFileInternal(path, memStream);
            }

            throw;
        }
        finally
        {
            if (stream != memStream)
            {
                await memStream.DisposeAsync();
            }
        }
    }

    private static async Task<(long ContentLength, DateTimeOffset LastModified)> WriteToFileInternal(string path, MemoryStream stream)
    {
        long fileSize;
        await using (FileStream streamToWriteTo = File.Open(path, FileMode.Create, FileAccess.ReadWrite, FileShare.None))
        {
            await stream.CopyToAsync(streamToWriteTo);
            streamToWriteTo.Flush();
            fileSize = streamToWriteTo.Length;
        }

        return (fileSize, DateTime.UtcNow);
    }

    public Task<bool> DeleteDataBlobs(Instance instance, int? storageAccountNumber)
    {
        throw new NotImplementedException();
    }
}
