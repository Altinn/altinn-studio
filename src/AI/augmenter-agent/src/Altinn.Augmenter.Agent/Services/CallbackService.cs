using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public sealed class CallbackService(HttpClient httpClient) : ICallbackService
{
    public async Task SendPdfsAsync(
        string callbackUrl,
        IReadOnlyList<GeneratedPdf> pdfs,
        CancellationToken cancellationToken = default)
    {
        using var content = new MultipartFormDataContent();

        foreach (var pdf in pdfs)
        {
            var fileContent = new ByteArrayContent(pdf.Data);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
            content.Add(fileContent, "files", pdf.Name);
        }

        var response = await httpClient.PostAsync(callbackUrl, content, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
