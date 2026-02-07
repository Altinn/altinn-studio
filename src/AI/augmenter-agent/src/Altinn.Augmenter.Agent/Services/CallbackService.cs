namespace Altinn.Augmenter.Agent.Services;

public sealed class CallbackService(HttpClient httpClient) : ICallbackService
{
    public async Task SendPdfAsync(string callbackUrl, byte[] pdfBytes)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "generated.pdf");

        var response = await httpClient.PostAsync(callbackUrl, content);
        response.EnsureSuccessStatusCode();
    }
}
