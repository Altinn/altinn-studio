namespace Altinn.Augmenter.Agent.Services;

public interface ICallbackService
{
    Task SendPdfAsync(string callbackUrl, byte[] pdfBytes);
}
