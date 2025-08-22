namespace Altinn.App.Core.Tests.Features.Auth;

using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.IO.Hashing;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Constants;
using static Altinn.App.Core.Features.Auth.Authenticated;

public class AuthenticatedTests
{
    // These are real tokens used from tt02/test login methods across Altinn, ID-porten and Maskinporten
    public static TheoryData<string, string, AuthenticationTypes, bool> Tokens =>
        new()
        {
            {
                "ID-porten testclient raw (demo-client.test.idporten.no)",
                "eyJraWQiOiJkaWdpdGFsaXNlcmluZ3NkaXJla3RvcmF0ZXQtLWNlcnQwIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIxOTkxNDg5NzI4MSIsImFjciI6ImlkcG9ydGVuLWxvYS1zdWJzdGFudGlhbCIsInNjb3BlIjoiYWx0aW5uOmluc3RhbmNlcy5yZWFkIG9wZW5pZCBwcm9maWxlIiwiaXNzIjoiaHR0cHM6Ly90ZXN0LmlkcG9ydGVuLm5vIiwiY2xpZW50X2FtciI6ImNsaWVudF9zZWNyZXRfYmFzaWMiLCJwaWQiOiIxOTkxNDg5NzI4MSIsImV4cCI6MTczNzgxNTc0NiwiaWF0IjoxNzM3ODE1MTQ2LCJqdGkiOiJmVFJYUTNCWkRqTSIsImNsaWVudF9pZCI6ImRlbW9jbGllbnRfaWRwb3J0ZW5fdGVzdCIsImNvbnN1bWVyIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjk5MTgyNTgyNyJ9fQ.h6clB-UEAkChH5aaqIEmmUqmq3vdCrazixBahfBi7bHMtZ1LtOrHtT0gdOaDIvamMxFDUhOc8fvu7jUpicd5hmDmvHULp_u-RS_qasAlZEVNzzV-ds4RXnhROVh0cCkO2XvZBJKS6RTWv8UmGrK_iaklZwhs5qhMiBs1bRAJ0isLwnbxTKXsUFgaY0RRtgNLzhXW6qwT00roL9GMSCAMb-rBXdXJ5zn41gacGejN5mdQTJe3TQbxyxk52uDU4Biy1TCAh3kRU12Cxx-6T39eJdCKtj-qKCHE44mYp-k8MenTbV1l613ObuVTbiZet4WehKlIXLYFctMB4LMrTQmWD2XS5WyMGXMrincoULZ7VO3Q7BAatbxtIBRT56C_9xhNHg5UOaGATjTp2X6U0XiwzAGE1sZoi-MdMVnUQC3ViJ7bIv3vHL4YU3qKX9iGjpZR0Lnqq8PkN-HTjz1mO0VvYZ3Gz71KKd1_p-DiyJo5lRgp4Ms5FSESz0gWkQ3YUm2Y",
                AuthenticationTypes.User,
                false // we don't support raw ID-porten tokens atm
            },
            {
                "ID-porten testclient exchanged (demo-client.test.idporten.no)",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJuYW1laWQiOiIxNDMzOTUzIiwidXJuOmFsdGlubjp1c2VyaWQiOiIxNDMzOTUzIiwidXJuOmFsdGlubjp1c2VybmFtZSI6IiIsInVybjphbHRpbm46cGFydHlpZCI6NTA1OTMxOTMsInVybjphbHRpbm46YXV0aGVudGljYXRlbWV0aG9kIjoiTm90RGVmaW5lZCIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJhY3IiOiJpZHBvcnRlbi1sb2Etc3Vic3RhbnRpYWwiLCJzY29wZSI6ImFsdGlubjppbnN0YW5jZXMucmVhZCBvcGVuaWQgcHJvZmlsZSIsImNsaWVudF9hbXIiOiJjbGllbnRfc2VjcmV0X2Jhc2ljIiwicGlkIjoiMTk5MTQ4OTcyODEiLCJleHAiOjE3Mzc4MTU3NDYsImlhdCI6MTczNzgxNTE1NywiY2xpZW50X2lkIjoiZGVtb2NsaWVudF9pZHBvcnRlbl90ZXN0IiwiY29uc3VtZXIiOnsiYXV0aG9yaXR5IjoiaXNvNjUyMy1hY3RvcmlkLXVwaXMiLCJJRCI6IjAxOTI6OTkxODI1ODI3In0sImlzcyI6Imh0dHBzOi8vcGxhdGZvcm0udHQwMi5hbHRpbm4ubm8vYXV0aGVudGljYXRpb24vYXBpL3YxL29wZW5pZC8iLCJqdGkiOiI3MTMzYmMwNy1iZWE0LTRkNDAtOWRjNC1jMWFmZGZjMmU2NTEiLCJuYmYiOjE3Mzc4MTUxNTd9.W71Z1FiSYUBJ8G1De-aGYOiUbpD_FCB9gTceLSItZN33y98IzAvNRKJEfXUxVge-GPInjm1DmJ6MVs6ZcVRunigiLa5gNR_W5kkV6kBkaTbZ4SJQsMdT3AaHoBziJEL2ey_ONyDT4ffScx-lRoF_qKQXbkpqLm-Qkj1VKjEBVSTsaqKxJMQrhmKZ4zK6rwhFOPZv5HnGSt56CWh2jrkk8IFzIJZbvO738qHscZ--1UhwHcZ_hpjsdLGaxENiC25kAiqV8gTAyihOAg9ii7jwxLiQYRe_ahqBv5IqT_ZNKKa3q9t7Yh57hQjPWOqtTFTgaBCCYQohYqv-FQtOenbd5g",
                AuthenticationTypes.User,
                true
            },
            {
                "Altinn portal tt02 test login, token extracted from AltinnStudioRuntime cookie",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJuYW1laWQiOiIxNDMzOTUzIiwidXJuOmFsdGlubjp1c2VyaWQiOiIxNDMzOTUzIiwidXJuOmFsdGlubjpwYXJ0eWlkIjo1MDU5MzE5MywidXJuOmFsdGlubjphdXRoZW50aWNhdGVtZXRob2QiOiJJZHBvcnRlblRlc3RJZCIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJqdGkiOiJkMDk2YjBkYy1lYTgyLTRiNGUtYjY0ZS04Y2NjYzA2OWVmYzYiLCJzY29wZSI6ImFsdGlubjpwb3J0YWwvZW5kdXNlciIsIm5iZiI6MTczNzgxNTM0MSwiZXhwIjoxNzM3ODE3MTQxLCJpYXQiOjE3Mzc4MTUzNDF9.dLYVBOSu99_CjcrIqsw6OmdwfKTKthnG2j1kl2pdsVUgn34vFVDF-VAE40IfSpnKUk4VKG-EkGHISi7S2U9rvLrIU_ptTcchg7XCXYSpQhm1DqfsbVwKarTEDBtlSITeqzUI5t2C6DOGSg4QEip92cOAVPw-m34bxBmnXxo6g-3babb-qSsLty_IPBhj86M0Y6zEomE-ysNVNSLJ-0ccAWi4ByzdfdsA5PnBDoeNTzPSZ3PscMOWe3z5d43WRVq30uKVE3XYWt6W0Yf2CbGXVSCTM9J45P2Ps4qiJysQM0zw2guh3s1IIdF7c0-IrppB-3sLNrDzAZ71kyKJXrc5JQ",
                AuthenticationTypes.User,
                true
            },
            {
                "Altinn portal tt02 self identified, token extracted from AltinnStudioRuntime cookie",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJuYW1laWQiOiIxNDI4ODEzIiwidXJuOmFsdGlubjp1c2VyaWQiOiIxNDI4ODEzIiwidXJuOmFsdGlubjp1c2VybmFtZSI6Im1hcnRpbm90aGFtYXIiLCJ1cm46YWx0aW5uOnBhcnR5aWQiOjUzMzI4NjYwLCJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6IlNlbGZJZGVudGlmaWVkIiwidXJuOmFsdGlubjphdXRobGV2ZWwiOjAsImp0aSI6Ijg3OGFkMDZiLWE0Y2EtNDFhZi04YjQzLWY3NTE2Mzk3Yzc3NyIsInNjb3BlIjoiYWx0aW5uOnBvcnRhbC9lbmR1c2VyIiwibmJmIjoxNzM3ODE1NjU0LCJleHAiOjE3Mzc4MTc0NTQsImlhdCI6MTczNzgxNTY1NH0.RLnlBcd_mfgixYkZcePG09iMsAk2XM25FdifashYcLEtebutWEub89GZyFHus7oLbCj_yDiyE1Rilpi3qBxUo9wVPH20ZsmFK5XX1jq7K_wzTsQGYlXPkjROyuXObOW1vuPZL973PEuSsFSc0MX38RfpHlOx7QZHx8gxOES3LwLFqCpdSCmTvsbPXmpHu4SKUb0BcaUFH3flexgbry4hixQbO65v6cQP7Od3A-5tTLCtPsBzCRY3u4EqbCVSJvXAj5x0PEYe-rKgQmY6nQl_dPfCre3uksPlKQeWtdDrmR1YiFfvKfg1DD_Fcf9wjeVGavyRh4qYhFV_7jueueGoqQ",
                AuthenticationTypes.SelfIdentifiedUser,
                true
            },
            {
                "Maskinporten raw org token (not service owner)",
                "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ.eyJzY29wZSI6ImFsdGlubjppbnN0YW5jZXMucmVhZCBhbHRpbm46aW5zdGFuY2VzLndyaXRlIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm1hc2tpbnBvcnRlbi5uby8iLCJjbGllbnRfYW1yIjoicHJpdmF0ZV9rZXlfand0IiwidG9rZW5fdHlwZSI6IkJlYXJlciIsImV4cCI6MTczNzg0NTkzNSwiaWF0IjoxNzM3ODQyMzM1LCJjbGllbnRfaWQiOiIwNDRmNTA0MC01NGUzLTRhMjctYTIyMS1hODUxNGZkMzBjYTkiLCJqdGkiOiJabUFxZU1fOENrVDMxSWNFXzBlSDhDLVBJM0x2b2ZQVlBielBIc3N2MW1rIiwiY29uc3VtZXIiOnsiYXV0aG9yaXR5IjoiaXNvNjUyMy1hY3RvcmlkLXVwaXMiLCJJRCI6IjAxOTI6OTkxODI1ODI3In19.wI3lgUfpFAWW2dp6SLThjXUhdcBVqym2epd8XG1_AoBbK93lH-lKveMqG14HuNYyy3uivaLwRkHgcIspmlupJAm7r2l-UrflnUX-yQVMa_xYpIDvJIn4gmN-271AnXXLt_lE6WtiYEWaekK37cVs3GzPkwfelx4mPkAg-t-bQeXBIDBLCuvUTy5uzBWbcoMFE7n1fEYu7tTuea2XCbshOcpcLUvLR2D6ZE2brj7Oh91IVizMOtULmf__ZxtwfYW7JfYvBqzd-dASs0Nl0xRwf4kuqEHzZk48VX2x_yizB7RITUAXZ_CffUxvS-NM7dd5q_tlKCRR5Fb7z7yqsLklheeNcyuyXdNqbQEL0iAxotJSNjL2FLjuidOqzh1d8dk45N8019bnYKWAopeb-bj2MNdUEWNEQvubejoKGfO5f_xJ6kS9Oeh4B7JW30xyuYSz8_D9LEVCSFfUp73n4XhQ_DeLWZsq9_G0uWftPUuDbGLaQBwVqujQdXXQCd5MVg7V",
                AuthenticationTypes.Org,
                false // we don't support raw Maskinporten tokens atm
            },
            {
                "Maskinporten exchanged org token (not service owner)",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJzY29wZSI6ImFsdGlubjppbnN0YW5jZXMucmVhZCBhbHRpbm46aW5zdGFuY2VzLndyaXRlIiwidG9rZW5fdHlwZSI6IkJlYXJlciIsImV4cCI6MTczNzg0NDE1NywiaWF0IjoxNzM3ODQyMzU3LCJjbGllbnRfaWQiOiIwNDRmNTA0MC01NGUzLTRhMjctYTIyMS1hODUxNGZkMzBjYTkiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifSwidXJuOmFsdGlubjpvcmdOdW1iZXIiOiI5OTE4MjU4MjciLCJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6Im1hc2tpbnBvcnRlbiIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJpc3MiOiJodHRwczovL3BsYXRmb3JtLnR0MDIuYWx0aW5uLm5vL2F1dGhlbnRpY2F0aW9uL2FwaS92MS9vcGVuaWQvIiwianRpIjoiMzUwYWNhOTYtYjNkZi00YTdmLTg4YWItOWY4ZDc4ZDYxMjI0IiwibmJmIjoxNzM3ODQyMzU3fQ.g6EFkX6pAKtA64p11CpoTDU6Nzzst4duOzBletMAexEmX-V5C4rXsndkwK3pL9JpZNBbjBZZaEAbBta177PIQo208dZwzYV2meLrip5fQ-hnWF3Ub0VdpxcgggDbcx8WqT1HSix-GQlNcSe2uyZB0KZ_8GRB2aKXjatX4R392A3CZfzBq8Dt3ra5AP0pWVxJAd4NuKHPQRKGbNWkC62J92zLYYtTz4j8DS9yogeP28hrcLzuqyVScDndmOiIjeexXXWdgrwVLDBO2mpVU_i4xqRUbjK9UdySrrkYfv-ZIZQRoZsyPE3ab0SDym-4kVxSIp4xyH3nQuzZJqz24LuBcw",
                AuthenticationTypes.Org,
                true
            },
            {
                "Maskinporten raw service owner token",
                "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ.eyJzY29wZSI6ImFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLndyaXRlIGFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLnJlYWQiLCJpc3MiOiJodHRwczovL3Rlc3QubWFza2lucG9ydGVuLm5vLyIsImNsaWVudF9hbXIiOiJwcml2YXRlX2tleV9qd3QiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzM3ODE3NjU5LCJpYXQiOjE3Mzc4MTc1MzksImNsaWVudF9pZCI6IjA0NGY1MDQwLTU0ZTMtNGEyNy1hMjIxLWE4NTE0ZmQzMGNhOSIsImp0aSI6IlVVVUZ3LU5KZk11R29kOUJsT0pJaGVUalA0YmN3Vzl3aF9kLUJDWm05dE0iLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifX0.t-STvjL2uSFqg_BFtopLenq3hVjZV1_nzkUXh6LxSj8FOGC8OTvtjmIZtOyg1ZHGC3J6M4ZF3QXCHVmZYRl_rXIAU4u8_xG6_HZMuIet9WcoBEadCYAJb-LQEQwvifMyUnwtwMjbtcurh8Wuj6h6lCidsfm2qUC0H3A7W6AxRtXF7CzHkbfSVcK_kkUe2vUn6VLFqB6ZdC_mULonaJtBD3i6hHt7LjbO0U1GuGf-wH80QXHEEr_7qpl2m0NI4CWe_4v638myV1PQVfx5tmwrVLk4BALB1_oP0Ugbp4Wrq8TMZY0Fn4-NpTVStWh3M3pRLXZy-OsycV_GZTBWTBWZRCUtsXcVNI3roFblsqh59IIkgSYDuJXomMfxEuAVoWL20SZJt50Vy3cvJecqN6NJ0hZ4q9kpFkkXs6D3TVUiPhtl_JdrpQEN8mVyUnqo7wj1hrkfHTt6UGpGIGma1CCXjn0pfCjejrMUkpcw2AIwPRfw1syzw3IRvMKZBwcA_ORU",
                AuthenticationTypes.ServiceOwner,
                false // we don't support raw Maskinporten tokens atm
            },
            {
                "Maskinporten exchanged service owner token",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJzY29wZSI6ImFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLndyaXRlIGFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLnJlYWQiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzM3ODE5Mzc2LCJpYXQiOjE3Mzc4MTc1NzYsImNsaWVudF9pZCI6IjA0NGY1MDQwLTU0ZTMtNGEyNy1hMjIxLWE4NTE0ZmQzMGNhOSIsImNvbnN1bWVyIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjk5MTgyNTgyNyJ9LCJ1cm46YWx0aW5uOm9yZyI6ImRpZ2RpciIsInVybjphbHRpbm46b3JnTnVtYmVyIjoiOTkxODI1ODI3IiwidXJuOmFsdGlubjphdXRoZW50aWNhdGVtZXRob2QiOiJtYXNraW5wb3J0ZW4iLCJ1cm46YWx0aW5uOmF1dGhsZXZlbCI6MywiaXNzIjoiaHR0cHM6Ly9wbGF0Zm9ybS50dDAyLmFsdGlubi5uby9hdXRoZW50aWNhdGlvbi9hcGkvdjEvb3BlbmlkLyIsImp0aSI6IjFmN2RlMDFhLTgyYjMtNDc3Yi04MmQzLTBiY2I5NDkzOGVjNyIsIm5iZiI6MTczNzgxNzU3Nn0.G9uZ_YK2IxUgv8ySP3zy_IG0kOO3qJtEqHPds2f3jh1_YHcQlHEnQXUecUR-xD-Qi8qtI_GEJizA3l-zXc9DLkxgv4HVamzBrOcm9aQWqd3s8_OuI1nF4WjWrcw5FHpaXl1DqbgqPQI8rxOJhmW-H4rE944TKHLwvBlsX-9brYU_CC1WfnymFwODKsGhT1hm5ljQeV6O6j0GkNsRANiQlUnIMJcMVQEBtcuHGBLeNq-u5JSXzs17GLB371IN9Jb8IoYKu7njW3-Pat-QWebDYT9jdMQHOYslr0WByTvlnhL6Z7aQ8KbllbNw3GoYOvCBphVVpmk7aaqcchUiBh30-g",
                AuthenticationTypes.ServiceOwner,
                true
            },
            {
                "Maskinporten for systemuser, coming from the smartcloudaltinn.azurewebsites.net/api/maskinporten test endpoint",
                "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ.eyJhdXRob3JpemF0aW9uX2RldGFpbHMiOlt7InR5cGUiOiJ1cm46YWx0aW5uOnN5c3RlbXVzZXIiLCJzeXN0ZW11c2VyX29yZyI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5MjozMTA3MDI2NDEifSwic3lzdGVtdXNlcl9pZCI6WyJmOTUwZGRhZS0wNmMzLTRiNTctYjk0MC03MDI0MTdhOTBkZjAiXSwic3lzdGVtX2lkIjoiOTkxODI1ODI3X3NtYXJ0Y2xvdWQiLCJleHRlcm5hbFJlZiI6ImVkMWMzOGY0LWY1MjgtNGVmMS04NjUyLWIxYWViODU2M2RmZSJ9XSwic2NvcGUiOiJhbHRpbm46c3lzdGVtYnJ1a2VyLmRlbW8iLCJpc3MiOiJodHRwczovL3Rlc3QubWFza2lucG9ydGVuLm5vLyIsImNsaWVudF9hbXIiOiJwcml2YXRlX2tleV9qd3QiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzM3ODEzMzk4LCJpYXQiOjE3Mzc4MTMyNzgsImNsaWVudF9pZCI6ImEyZWQ3MTJkLTQxNDQtNDQ3MS04MzlmLTgwYWU0YTY4MTQ2YiIsImp0aSI6InZrWFlhNGxIR2lyOFFpcGVtc1dvdnNUMzdIci10ZExOaTYyODlTajVzU1UiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifX0.b3JozeLFCBn76a703n1ZqbjqHaFaaCadpZb3T0cuqJvLnELEjiOKXvwSI1kuqnpqfEqxEX1UyBIyJh-rvIOZ-B7dXj1usWoh-oWofvENT0AzJcwpPrhuBBo-ZPoCtTVIJraWBJfYbjEFfajfFZdz0D_poz2i5MbJO9mSn5FMAEMdzmjZSA7O9n8Y02uApN31B3pHlKpqIEUK1HhxGl_z8_rzcAcbs2uOKUxVCK_vnEMk3XpcaEDsk0hr-ohkALshWYVUZCxzl7MzJ2wFhyr9JZqSLSV-dS_WY09cwUA-I1dyIlQE1LW1Ye4Ow5xExArBO8UT3sB-q23EqRY07PC1lh-YdFB1rR1pO6pklnQdz8zPzyrUYYcxlQQDVTRVjRgZcF43TMxQIUmAB0LG6QvP8oRp8SV4oAAK9ZB_fCVkwd8gbVwvVIhuQdPEA6aUoV8mPRPz1IW-eVi-XXEQdkOC8OArNQd92y5DiEQE2puZI1nUmXFwypltks-3Xjam6-_5",
                AuthenticationTypes.SystemUser,
                true
            },
            {
                "Exchanged Maskinporten for systemuser, coming from the smartcloudaltinn.azurewebsites.net/api/maskinporten test endpoint",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJhdXRob3JpemF0aW9uX2RldGFpbHMiOnsidHlwZSI6InVybjphbHRpbm46c3lzdGVtdXNlciIsInN5c3RlbXVzZXJfb3JnIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjMxMDcwMjY0MSJ9LCJzeXN0ZW11c2VyX2lkIjpbImY5NTBkZGFlLTA2YzMtNGI1Ny1iOTQwLTcwMjQxN2E5MGRmMCJdLCJzeXN0ZW1faWQiOiI5OTE4MjU4Mjdfc21hcnRjbG91ZCIsImV4dGVybmFsUmVmIjoiZWQxYzM4ZjQtZjUyOC00ZWYxLTg2NTItYjFhZWI4NTYzZGZlIn0sInNjb3BlIjoiYWx0aW5uOnN5c3RlbWJydWtlci5kZW1vIiwidG9rZW5fdHlwZSI6IkJlYXJlciIsImV4cCI6MTczNzgxNTEyMCwiaWF0IjoxNzM3ODEzMzIwLCJjbGllbnRfaWQiOiJhMmVkNzEyZC00MTQ0LTQ0NzEtODM5Zi04MGFlNGE2ODE0NmIiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifSwidXJuOmFsdGlubjpvcmdOdW1iZXIiOiI5OTE4MjU4MjciLCJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6Im1hc2tpbnBvcnRlbiIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJpc3MiOiJodHRwczovL3BsYXRmb3JtLnR0MDIuYWx0aW5uLm5vL2F1dGhlbnRpY2F0aW9uL2FwaS92MS9vcGVuaWQvIiwianRpIjoiMTliNGUyOWItNjRiMi00YTUyLWFlNDAtZTc3Njg1MjMxM2YyIiwibmJmIjoxNzM3ODEzMzIwfQ.m-5x5GscJYjD_rCnd0EWQBKSwymPyN4AE9Yti7bjeUuvAVyiPdtske9fahEGONVUvY9Pk2bDjdNOfAeaOPMHB2skEqMNYGqxxQRgBraZawAPFuQSSufTgkt5dEgOAymUam2x9NQ_giFPPtaWHez23rtDGSGAXkMaIBWe93XbO-z_4dFcyDEXvmK4SfkLeJWxizhugVcwwDstYrN7VlcQz3gBGuGKIcC8lnBPIT8u7tmJKt0JQ2L9oZQkGjatUu-4_qlcfzvDr40ojyNtOszoc1UblNRkTI-QxB2yRuvG9a7wMtej_Xgo9Pst8cz4MfBSxOq-2U_wHX95-d5GTLnFfw",
                AuthenticationTypes.SystemUser,
                true
            },
            {
                "GetTestUserToken in localtest",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4Q0VFNjAzMzEwMkYzMjQzMTk2NDc4QUYwNkZCNDNBMTc2NEQ4NDMiLCJ4NXQiOiJTTTdtQXpFQzh5UXhsa2VLOEctME9oZGsyRU0iLCJ0eXAiOiJKV1QifQ.eyJuYW1laWQiOiIxMDA0IiwidXJuOmFsdGlubjp1c2VyaWQiOiIxMDA0IiwidXJuOmFsdGlubjp1c2VybmFtZSI6IlNlbHZSZWdpc3RyZXJ0IiwidXJuOmFsdGlubjpwYXJ0eWlkIjo1MTAwMDQsInVybjphbHRpbm46YXV0aGxldmVsIjoyLCJuYmYiOjE3NDI5MDQxMjQsImV4cCI6MTc0Mjk2MTcyNCwiaWF0IjoxNzQyOTA0MTI0fQ.XxEHCiloqnZmn8gN83Cyde8OK7BrqAhpkxTXpTFrHoumaKA63sqvOZbxbr1pakj8iNWRI7D53R4tskHRxamuHk-6A5-UEpZv9i3lukOpaqtZhPO006VFTTxlRjp5gSrX4sG6DoDBTQrHfchiAleLEmGxxtzvtIlmaehz0HhJcCLZ3Ly1_3XepdSilSPAKin80Nkads7bjTqqI4UP1UZsDz4qyjF_xN7ganGZ5aEpGNbGszhsEcS-OW5QS4BrvSZh2YPpn2-LiO9iyasYR2CwY80_P1NgQZM6DTMggcE5nuYGP1jIuj7Fj2me0NOi-qzzEibD7SRvvUJuWAdJodBbzQ",
                AuthenticationTypes.User,
                true
            },
            {
                "GetTestOrgToken in localtest",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4Q0VFNjAzMzEwMkYzMjQzMTk2NDc4QUYwNkZCNDNBMTc2NEQ4NDMiLCJ4NXQiOiJTTTdtQXpFQzh5UXhsa2VLOEctME9oZGsyRU0iLCJ0eXAiOiJKV1QifQ.eyJ1cm46YWx0aW5uOm9yZyI6InNrZCIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJ1cm46YWx0aW5uOnNjb3BlIjoiYWx0aW5uOnNlcnZpY2Vvd25lci9pbnN0YW5jZXMud3JpdGUgYWx0aW5uOnNlcnZpY2Vvd25lci9pbnN0YW5jZXMucmVhZCIsInVybjphbHRpbm46b3JnTnVtYmVyIjoiOTc0NzYxMDc2IiwibmJmIjoxNzQyOTA2NDYyLCJleHAiOjE3NDI5NjQwNjIsImlhdCI6MTc0MjkwNjQ2Mn0.UJSqOGZG3xCMH7KUx148NhPvARATpI2yzK4RxxL_Fe2XqtEaRJQX6IBMTbfu-WLdHZ8l4m7Epk7cJwxE1ek3BP1XMayq95rrNIwjcXoicDBfLUb7Ug2II89jKd-pCinuZGT8ai4LmKz8ydPAXgq6fV1ExctsqcTQhQIbgDYa9TFVKInpmv3Mj9f7vdiJKdfuxE_rHOzu8cqUVECLvK4AU602pnw9JvclAXa53hBkDlHmNv8-JzVUdqkEMBiPrWklWDZqHNZuVkKrrvS_5-dS9Z6rjZ9IcnMZ2fSRNoTHO85qtVqGzTzLsN0QjRXOYGk_mZVD4LVjOp7JBDuWqcpefQ",
                AuthenticationTypes.ServiceOwner,
                true
            },
            {
                "GetTestSystemUserToken in localtest",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4Q0VFNjAzMzEwMkYzMjQzMTk2NDc4QUYwNkZCNDNBMTc2NEQ4NDMiLCJ4NXQiOiJTTTdtQXpFQzh5UXhsa2VLOEctME9oZGsyRU0iLCJ0eXAiOiJKV1QifQ.eyJ0b2tlbl90eXBlIjoiQmVhcmVyIiwic2NvcGUiOiJhbHRpbm46aW5zdGFuY2VzLnJlYWQgYWx0aW5uOmluc3RhbmNlcy53cml0ZSIsImNsaWVudF9pZCI6Ijc2Yzg2NTE1LTkwN2ItNDZkYy1iNGYwLWZhMDc4MzRjYTY0MiIsImp0aSI6IjIzYjA4MTkzLTU5NWUtNDFhYS1iODUyLTlmNzAwZTA0MjhjMiIsInVybjphbHRpbm46b3JnTnVtYmVyIjoiOTEzMzEyNDY1IiwidXJuOmFsdGlubjphdXRoZW50aWNhdGVtZXRob2QiOiJtYXNraW5wb3J0ZW4iLCJ1cm46YWx0aW5uOmF1dGhsZXZlbCI6IjMiLCJhdXRob3JpemF0aW9uX2RldGFpbHMiOnsidHlwZSI6InVybjphbHRpbm46c3lzdGVtdXNlciIsInN5c3RlbXVzZXJfaWQiOlsiZDExMWRiYWItZDYxOS00ZjE1LWJmMjktNThmZTU3MGE5YWU2Il0sInN5c3RlbV9pZCI6IjkxMzMxMjQ2NV9zYnMiLCJzeXN0ZW11c2VyX29yZyI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5NTA0NzQwODQifX0sImNvbnN1bWVyIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjkxMzMxMjQ2NSJ9LCJleHAiOjE3NDI5NjQ0NTQsImlhdCI6MTc0MjkwNjg1NCwibmJmIjoxNzQyOTA2ODU0fQ.nzWAs4U0u1L6m8xVlzX1S0cN45H690Aix2V4HIbqSPr5_m8fcE2FeZ3X1CP7WHk1L5VLjfJH0VRr5ODW_V_Xce2t0Q_64KpDauelDENRIrR9f4LwZHtPu0y6xMOjE3GBd901deiqqBizeVLKXRrme9e-CWifGAVAdgxFBBr7SHxAkC6WKCATfrISlKf8JAWHCkzy_UmPNGmJ3aIG0INYk8UXIJL7DJAQl5yO5hJOY4OCo9TSGT8MicNRQXZC-Naok8NnSctDWX-1MFi98-04SknvjElHbh2pZy-8b4RW-T_RCzRSSJog3AzNCHUuABTnWRHpmqudRAb-X9eU7StdeA",
                AuthenticationTypes.SystemUser,
                true
            },
            {
                "Altinn-Test-Tools GetPersonalToken",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ0eXAiOiJKV1QiLCJ4NWMiOiJEOEQ4NjdDN0Q1MjEzNjBGNEYzNUNENTE1ODBDNDlBMDUxNjVENEUxIn0.eyJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6Ik5vdERlZmluZWQiLCJ1cm46YWx0aW5uOmF1dGhsZXZlbCI6IjMiLCJjbGllbnRfYW1yIjoidmlya3NvbWhldHNzZXJ0aWZpa2F0IiwicGlkIjoiMDI4MjgyOTgzMzIiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiY2xpZW50X2lkIjoiYWNkZGQxZDktYjYyOC00MTlkLTkxM2ItNjlmOGQ5NzA5MzNjIiwiYWNyIjoiaWRwb3J0ZW4tbG9hLXN1YnN0YW50aWFsIiwic2NvcGUiOiJhbHRpbm46aW5zdGFuY2VzLnJlYWQgYWx0aW5uOmluc3RhbmNlcy53cml0ZSIsImV4cCI6MTc0MjkwNzA3NCwiaWF0IjoxNzQyOTAzNDc0LCJjbGllbnRfb3Jnbm8iOiI5OTE4MjU4MjciLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifSwiaXNzIjoiaHR0cHM6Ly9wbGF0Zm9ybS50dDAyLmFsdGlubi5uby9hdXRoZW50aWNhdGlvbi9hcGkvdjEvb3BlbmlkLyIsImFjdHVhbF9pc3MiOiJhbHRpbm4tdGVzdC10b29scyIsIm5iZiI6MTc0MjkwMzQ3NCwibmFtZWlkIjoxNjA4NzIsInVybjphbHRpbm46dXNlcmlkIjoxNjA4NzIsInVybjphbHRpbm46cGFydHlpZCI6NTE4MjkzMzZ9.K8YnlFuHvoWBFEMKyZdGdaMgij6hewzD_-8jxPUMtJ_defkqwPbduG5AsdC2XCo1wnj3fgIPUuygz-tE3XPtrEGUadFjp_nOrJ1KgfBrwJsbNBWHmDIBikhF0JRnK7AcWvcR8akGp92IZEARz6P20uDvcDSeAmwt4DI7jbgOm1gHXUzzm74CikUd-yXegsN3TbTHNQB8y-wErlfvWahgOGP7KfLQ5aMX6xbIyAbcqQJb6wjyTcVfgmgDnVqbOnzv7YrBd-s3MQTwydyKFqiOsJqE6OZa40SOaj1RBPvNto50jgaPGuaUzrZwNpxCe0JXNLObFY5UoGcDPTUAUSlQkw",
                AuthenticationTypes.User,
                true
            },
            {
                "Altinn-Test-Tools GetEnterpriseToken",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ0eXAiOiJKV1QiLCJ4NWMiOiJEOEQ4NjdDN0Q1MjEzNjBGNEYzNUNENTE1ODBDNDlBMDUxNjVENEUxIn0.eyJzY29wZSI6ImFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLnJlYWQgYWx0aW5uOnNlcnZpY2Vvd25lci9pbnN0YW5jZXMud3JpdGUiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzQyOTA5NDk3LCJpYXQiOjE3NDI5MDc2OTcsImNsaWVudF9pZCI6Ijc0M2U5MGZkLTAyMDItNDM5ZC05MzYwLTViYmZiOGU5MGYzYiIsImp0aSI6IkJIWTFzTXAxZGdCeEdOWDBjczdvUWNBdG1wVUlDdTlzY3A1dUFIY0F3T2YiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifSwidXJuOmFsdGlubjpvcmdOdW1iZXIiOiI5OTE4MjU4MjciLCJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6Im1hc2tpbnBvcnRlbiIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJpc3MiOiJodHRwczovL3BsYXRmb3JtLnR0MDIuYWx0aW5uLm5vL2F1dGhlbnRpY2F0aW9uL2FwaS92MS9vcGVuaWQvIiwiYWN0dWFsX2lzcyI6ImFsdGlubi10ZXN0LXRvb2xzIiwibmJmIjoxNzQyOTA3Njk3LCJ1cm46YWx0aW5uOm9yZyI6ImRpZ2RpciJ9.YOX4cViSE1KG_sf3alCkR-aXDOJu1R850OS6fBBu7HYDitTa9DO4aoISeu42NzAjxMcpBee1r3wsg2n13cdAOs_Ab2BH385u_1EN-afXZURx9OjMr2SyWfDvVIEYGatiqpNB7pFf1zek8dJYRQfo3aenfOGuJTszHK0HAY_S7U2_ziMdXMWTUKlChel_lsGb40kUuTHLcUHwl5b10efU4dv-QZsj1PM_QHYDLikd6mCxS2KbqiAutcpdsv2zNgmh4uwXuntXvFF9X8oK0bkLlX8nNGvcWCsy9oRgLtq2y8cWUoVU89FgFR2NaHaEIdXIUwTCrxFzdIWZjEkMR1RYag",
                AuthenticationTypes.ServiceOwner,
                true
            },
            {
                "Altinn-Test-Tools GetSystemUserToken",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ0eXAiOiJKV1QiLCJ4NWMiOiJEOEQ4NjdDN0Q1MjEzNjBGNEYzNUNENTE1ODBDNDlBMDUxNjVENEUxIn0.eyJpc3MiOiJodHRwczovL3BsYXRmb3JtLnR0MDIuYWx0aW5uLm5vL2F1dGhlbnRpY2F0aW9uL2FwaS92MS9vcGVuaWQvIiwic2NvcGUiOiJhbHRpbm46aW5zdGFuY2VzLnJlYWQgYWx0aW5uOmluc3RhbmNlcy53cml0ZSIsImNsaWVudF9pZCI6IjIyNzE0ZmU4LWNkZmEtNDIwMC04NzYwLTRhYzIzODA0YWM4NSIsImNvbnN1bWVyIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjk5MTgyNTgyNyJ9LCJleHAiOjE3NDI5MDg3NTgsImlhdCI6MTc0MjkwNjk1OCwianRpIjoiYVkwcDJHelo5cFgycU16ZGdHOEZVUGFxaDRERHhoWS1DVDl2eGxkWDVSSCIsImF1dGhvcml6YXRpb25fZGV0YWlscyI6W3sidHlwZSI6InVybjphbHRpbm46c3lzdGVtdXNlciIsInN5c3RlbXVzZXJfaWQiOlsiZjU4ZmUxNjYtYmMyMi00ODk5LWJlYjctYzNlOGUzMzMyZjQzIl0sInN5c3RlbXVzZXJfb3JnIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjk5MTgyNTgyNyJ9LCJzeXN0ZW1faWQiOiI1M2U2M2ExOC04YWNhLTQ3YTgtODkzZi1hNjIzZTk2NzE1YmIifV0sInVybjphbHRpbm46YXV0aGVudGljYXRlbWV0aG9kIjoibWFza2lucG9ydGVuIiwidXJuOmFsdGlubjphdXRobGV2ZWwiOjMsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJuYmYiOjE3NDI5MDY5NTgsImFjdHVhbF9pc3MiOiJhbHRpbm4tdGVzdC10b29scyJ9.bVcje62YxmJ8O2Ddc46lNypolarEhWNJdG7UsyXdGMlggOHPXo3tTbKjwiRH7e0zkc4qsKqoVvptA64Sp7Qq5rhZZMAU1n_UEpXHXgrlmFCVzE0YQy2EZQtDSPMDZuXAgNIhqe0uHJXRHjQKvA2kuTzKrYD7qT6ixasX13RTd8J_g0Cn_-lmrkVUSHX08cdRmvxqEqyplo6o5Gfn3HcPZE4DwK4lFwUvc0ME7byTluMk3gGs-wdVVI7jkqRxmvb_vns5oMvRlAbeMqQi3TpRPxVA3vv48iUTqT3soecP30MfFayzGLk_y05e5rTRCfwEf9yofd9qTi-IXGpEYTP6lg",
                AuthenticationTypes.SystemUser,
                true
            },
            {
                "Altinn-Test-Tools GetEnterpriseUserToken",
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ0eXAiOiJKV1QiLCJ4NWMiOiJEOEQ4NjdDN0Q1MjEzNjBGNEYzNUNENTE1ODBDNDlBMDUxNjVENEUxIn0.eyJzY29wZSI6ImFsdGlubjplbmR1c2VyIiwidG9rZW5fdHlwZSI6IkJlYXJlciIsImV4cCI6MTc0NzM3NTc2OCwiaWF0IjoxNzQ3MzczOTY4LCJjbGllbnRfaWQiOiI3Y2RlNDk5My1iYWJhLTQ4ZDYtOGViMS1mNmVhZWMzNjVlZmYiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifSwianRpIjoiaG1pUUV6VlAzSmw3WDZqdHg3RnBxeEF3NnFTQzExVlBPZGtxTkxUdVQzUyIsInVybjphbHRpbm46dXNlcmlkIjoxMjMsInVybjphbHRpbm46dXNlcm5hbWUiOiJzb21ldXNlciIsInVybjphbHRpbm46cGFydHlpZCI6NDMxMiwidXJuOmFsdGlubjpvcmdOdW1iZXIiOiI5OTE4MjU4MjciLCJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6InZpcmtzb21oZXRzYnJ1a2VyIiwidXJuOmFsdGlubjphdXRobGV2ZWwiOjMsImlzcyI6Imh0dHBzOi8vcGxhdGZvcm0udHQwMi5hbHRpbm4ubm8vYXV0aGVudGljYXRpb24vYXBpL3YxL29wZW5pZC8iLCJhY3R1YWxfaXNzIjoiYWx0aW5uLXRlc3QtdG9vbHMiLCJuYmYiOjE3NDczNzM5Njh9.iSIksHCA44VZOp6fISAXlCZoR7kzqXiZLJbgy1qc5znX__5XEJ17O4GCZ7vbR6hmmEWCObjKIrJBd004xFEFu8DK4JidsTAdnxtf71_ZAZIY7erKIxO3R5EdpeSiN1rMnN_w7QN9Azrz3JoRVaOz0lrr8IO36qN6TFL2iZ6XT5pkFG4lz3MqEZDN1jTdSXoQvDrNNcQLRCM9itlCKfY9oiNvZOKgMoBGEZmAQDzcu26apUfb3tVMmIWhvFNqIgJTC_jeu9KXGxp4za2uIFqdebkouprcUexqitF1RhN6LFj4_5x1TQDI1QWAGEN5yqpZHIDh4EvsRi6HK6dnBDv7Rg",
                AuthenticationTypes.Org,
                true
            },
        };

    [Theory]
    [MemberData(nameof(Tokens))]
    public async Task Can_Parse_Real_Tokens(
        string description,
        string token,
        AuthenticationTypes tokenType,
        bool succeeds
    )
    {
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        var exp = jwtToken.Payload.Exp;
        Assert.NotNull(exp);
        var expiryDateTime = DateTimeOffset.FromUnixTimeSeconds(exp.Value);
        Assert.True(expiryDateTime < DateTimeOffset.UtcNow, "Tokens used for testing should be expired");

        if (!succeeds)
        {
            Assert.ThrowsAny<Exception>(() => Parse(description, jwtToken, token, tokenType));
            return;
        }

        var auth = Parse(description, jwtToken, token, tokenType);
        object? details = null;

        switch (tokenType)
        {
            case AuthenticationTypes.User:
                var user = Assert.IsType<Authenticated.User>(auth);
                Assert.Equal(token, auth.Token);
                details = await user.LoadDetails(validateSelectedParty: true);
                break;
            case AuthenticationTypes.SelfIdentifiedUser:
                var selfIdentifiedUser = Assert.IsType<Authenticated.User>(auth);
                Assert.Equal(token, auth.Token);
                details = await selfIdentifiedUser.LoadDetails();
                break;
            case AuthenticationTypes.Org:
                var org = Assert.IsType<Authenticated.Org>(auth);
                Assert.Equal(token, auth.Token);
                details = await org.LoadDetails();
                break;
            case AuthenticationTypes.ServiceOwner:
                var serviceOwner = Assert.IsType<Authenticated.ServiceOwner>(auth);
                Assert.Equal(token, auth.Token);
                details = await serviceOwner.LoadDetails();
                break;
            case AuthenticationTypes.SystemUser:
                var systemUser = Assert.IsType<Authenticated.SystemUser>(auth);
                Assert.Equal(token, auth.Token);
                details = await systemUser.LoadDetails();
                break;
            default:
                Assert.Fail("Unknown token type: " + tokenType);
                break;
        }

        var hash = Convert.ToBase64String(XxHash128.Hash(Encoding.UTF8.GetBytes(token)));
        await Verify(
                new
                {
                    Description = description,
                    AuthType = auth.GetType().FullName,
                    Auth = auth,
                    Jwt = (Dictionary<string, object>)jwtToken.Payload,
                    Details = details,
                }
            )
            .UseTextForParameters($"type={tokenType}_{hash[0..4]}")
            .DontIgnoreEmptyCollections()
            .DontScrubDateTimes()
            .DontScrubGuids()
            .AddExtraSettings(s =>
            {
                s.Converters.Add(new ScopesConverter());
                s.Converters.Add(new OrganisationNumberConverter());
            });
    }

    private sealed class ScopesConverter : WriteOnlyJsonConverter<Scopes>
    {
        public override void Write(VerifyJsonWriter writer, Scopes value)
        {
            writer.WriteValue(value.ToString());
        }
    }

    private sealed class OrganisationNumberConverter : WriteOnlyJsonConverter<OrganisationNumber>
    {
        public override void Write(VerifyJsonWriter writer, OrganisationNumber value)
        {
            writer.WriteValue(value.Get(OrganisationNumberFormat.International));
        }
    }

    private Authenticated Parse(string description, JwtSecurityToken jwtToken, string token, AuthenticationTypes type)
    {
        string ReadClaim(string key)
        {
            var claim = jwtToken.Payload.Single(c => c.Key == key);
            var value = claim.Value as string;
            Assert.NotNull(value);
            return value;
        }

        int ReadClaimInt(string key)
        {
            var claim = jwtToken.Payload.Single(c => c.Key == key);
            var value = claim.Value;
            Assert.NotNull(value);
            return value is string str ? int.Parse(str, CultureInfo.InvariantCulture) : (int)value;
        }

        Authenticated auth;
        Party party;

        switch (type)
        {
            case AuthenticationTypes.User:
                {
                    party = new Party()
                    {
                        PartyId = ReadClaimInt(AltinnCoreClaimTypes.PartyID),
                        PartyTypeName = PartyType.Person,
                        OrgNumber = null,
                        SSN = "12345678901",
                        Name = "Test Testesen",
                    };
                    Authenticated.Parser parse = description.Contains("localtest", StringComparison.OrdinalIgnoreCase)
                        ? Authenticated.FromOldLocalTest
                        : Authenticated.From;
                    auth = parse(
                        tokenStr: token,
                        parsedToken: null,
                        isAuthenticated: true,
                        appMetadata: TestAuthentication.NewApplicationMetadata("digdir"),
                        getSelectedParty: () =>
                            ReadClaimInt(AltinnCoreClaimTypes.PartyID).ToString(CultureInfo.InvariantCulture),
                        getUserProfile: userId =>
                        {
                            Assert.Equal(userId, ReadClaimInt(AltinnCoreClaimTypes.UserId));
                            return Task.FromResult<UserProfile?>(
                                new UserProfile
                                {
                                    UserId = ReadClaimInt(AltinnCoreClaimTypes.UserId),
                                    PartyId = ReadClaimInt(AltinnCoreClaimTypes.PartyID),
                                    Party = party,
                                }
                            );
                        },
                        lookupUserParty: partyId =>
                        {
                            Assert.Equal(partyId, ReadClaimInt(AltinnCoreClaimTypes.PartyID));
                            return Task.FromResult<Party?>(party);
                        },
                        lookupOrgParty: null!,
                        getPartyList: userId =>
                        {
                            Assert.Equal(userId, ReadClaimInt(AltinnCoreClaimTypes.UserId));
                            return Task.FromResult<List<Party>?>([party]);
                        },
                        validateSelectedParty: (userId, partyId) =>
                        {
                            Assert.Equal(userId, ReadClaimInt(AltinnCoreClaimTypes.UserId));
                            Assert.Equal(partyId, ReadClaimInt(AltinnCoreClaimTypes.PartyID));
                            return Task.FromResult<bool?>(true);
                        }
                    );
                }
                break;
            case AuthenticationTypes.SelfIdentifiedUser:
                {
                    party = new Party()
                    {
                        PartyId = ReadClaimInt(AltinnCoreClaimTypes.PartyID),
                        PartyTypeName = PartyType.Person,
                        OrgNumber = null,
                        SSN = "12345678901",
                        Name = "Test Testesen",
                    };
                    Authenticated.Parser parse = description.Contains("localtest", StringComparison.OrdinalIgnoreCase)
                        ? Authenticated.FromOldLocalTest
                        : Authenticated.From;
                    auth = parse(
                        tokenStr: token,
                        parsedToken: null,
                        isAuthenticated: true,
                        appMetadata: TestAuthentication.NewApplicationMetadata("digdir"),
                        getSelectedParty: () =>
                            ReadClaimInt(AltinnCoreClaimTypes.PartyID).ToString(CultureInfo.InvariantCulture),
                        getUserProfile: userId =>
                        {
                            Assert.Equal(userId, ReadClaimInt(AltinnCoreClaimTypes.UserId));
                            return Task.FromResult<UserProfile?>(
                                new UserProfile
                                {
                                    UserId = ReadClaimInt(AltinnCoreClaimTypes.UserId),
                                    PartyId = ReadClaimInt(AltinnCoreClaimTypes.PartyID),
                                    Party = party,
                                }
                            );
                        },
                        lookupUserParty: partyId =>
                        {
                            Assert.Equal(partyId, ReadClaimInt(AltinnCoreClaimTypes.PartyID));
                            return Task.FromResult<Party?>(party);
                        },
                        lookupOrgParty: null!,
                        getPartyList: userId =>
                        {
                            Assert.Equal(userId, ReadClaimInt(AltinnCoreClaimTypes.UserId));
                            return Task.FromResult<List<Party>?>([party]);
                        },
                        validateSelectedParty: (userId, partyId) =>
                        {
                            Assert.Equal(userId, ReadClaimInt(AltinnCoreClaimTypes.UserId));
                            Assert.Equal(partyId, ReadClaimInt(AltinnCoreClaimTypes.PartyID));
                            return Task.FromResult<bool?>(true);
                        }
                    );
                }
                break;
            case AuthenticationTypes.Org:
                {
                    auth = Authenticated.From(
                        tokenStr: token,
                        parsedToken: null,
                        isAuthenticated: true,
                        appMetadata: TestAuthentication.NewApplicationMetadata("digdir"),
                        getSelectedParty: null!,
                        getUserProfile: null!,
                        lookupUserParty: null!,
                        lookupOrgParty: orgNo =>
                        {
                            Assert.Equal(orgNo, ReadClaim(AltinnCoreClaimTypes.OrgNumber));
                            return Task.FromResult<Party>(
                                new Party
                                {
                                    PartyId = 1234,
                                    PartyTypeName = PartyType.Organisation,
                                    OrgNumber = orgNo,
                                    SSN = null,
                                    Name = "Test AS",
                                }
                            );
                        },
                        getPartyList: null!,
                        validateSelectedParty: null!
                    );
                }
                break;
            case AuthenticationTypes.ServiceOwner:
                {
                    Authenticated.Parser parse = description.Contains("localtest", StringComparison.OrdinalIgnoreCase)
                        ? Authenticated.FromOldLocalTest
                        : Authenticated.From;
                    auth = parse(
                        tokenStr: token,
                        parsedToken: null,
                        isAuthenticated: true,
                        appMetadata: TestAuthentication.NewApplicationMetadata("digdir"),
                        getSelectedParty: null!,
                        getUserProfile: null!,
                        lookupUserParty: null!,
                        lookupOrgParty: orgNo =>
                        {
                            Assert.Equal(orgNo, ReadClaim(AltinnCoreClaimTypes.OrgNumber));
                            return Task.FromResult<Party>(
                                new Party
                                {
                                    PartyId = 1234,
                                    PartyTypeName = PartyType.Organisation,
                                    OrgNumber = orgNo,
                                    SSN = null,
                                    Name = "Test AS",
                                }
                            );
                        },
                        getPartyList: null!,
                        validateSelectedParty: null!
                    );
                }
                break;
            case AuthenticationTypes.SystemUser:
                {
                    Authenticated.Parser parse = description.Contains("localtest", StringComparison.OrdinalIgnoreCase)
                        ? Authenticated.FromOldLocalTest
                        : Authenticated.From;
                    auth = parse(
                        tokenStr: token,
                        parsedToken: null,
                        isAuthenticated: true,
                        appMetadata: TestAuthentication.NewApplicationMetadata("digdir"),
                        getSelectedParty: null!,
                        getUserProfile: null!,
                        lookupUserParty: null!,
                        lookupOrgParty: orgNo =>
                        {
                            var claim = jwtToken.Payload.Single(c => c.Key == "authorization_details");
                            var json = Assert.IsType<JsonElement>(claim.Value);
                            var authDetails = AuthorizationDetailsClaim.Parse(json);
                            var systemUserDetails = Assert.IsType<SystemUserAuthorizationDetailsClaim>(authDetails);
                            var systemUserOrgNo = OrganisationNumber.Parse(systemUserDetails.SystemUserOrg.Id);
                            Assert.Equal(orgNo, systemUserOrgNo.Get(OrganisationNumberFormat.Local));
                            return Task.FromResult<Party>(
                                new Party
                                {
                                    PartyId = 1234,
                                    PartyTypeName = PartyType.Organisation,
                                    OrgNumber = orgNo,
                                    SSN = null,
                                    Name = "Test AS",
                                }
                            );
                        },
                        getPartyList: null!,
                        validateSelectedParty: null!
                    );
                }
                break;
            default:
                throw new NotImplementedException("Unknown token type: " + type);
        }

        return auth;
    }
}
