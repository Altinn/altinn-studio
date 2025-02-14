namespace Altinn.App.Core.Tests.Features.Auth;

using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features.Auth;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Constants;
using global::Authorization.Platform.Authorization.Models;

public class AuthenticatedTests
{
    // These are real tokens used from tt02/test login methods across Altinn, ID-porten and Maskinporten
    public static TheoryData<string, AuthenticationTypes, TokenIssuer, bool, bool> Tokens =>
        new()
        {
            {
                // ID-porten testclient raw (demo-client.test.idporten.no)
                "eyJraWQiOiJkaWdpdGFsaXNlcmluZ3NkaXJla3RvcmF0ZXQtLWNlcnQwIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIxOTkxNDg5NzI4MSIsImFjciI6ImlkcG9ydGVuLWxvYS1zdWJzdGFudGlhbCIsInNjb3BlIjoiYWx0aW5uOmluc3RhbmNlcy5yZWFkIG9wZW5pZCBwcm9maWxlIiwiaXNzIjoiaHR0cHM6Ly90ZXN0LmlkcG9ydGVuLm5vIiwiY2xpZW50X2FtciI6ImNsaWVudF9zZWNyZXRfYmFzaWMiLCJwaWQiOiIxOTkxNDg5NzI4MSIsImV4cCI6MTczNzgxNTc0NiwiaWF0IjoxNzM3ODE1MTQ2LCJqdGkiOiJmVFJYUTNCWkRqTSIsImNsaWVudF9pZCI6ImRlbW9jbGllbnRfaWRwb3J0ZW5fdGVzdCIsImNvbnN1bWVyIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjk5MTgyNTgyNyJ9fQ.h6clB-UEAkChH5aaqIEmmUqmq3vdCrazixBahfBi7bHMtZ1LtOrHtT0gdOaDIvamMxFDUhOc8fvu7jUpicd5hmDmvHULp_u-RS_qasAlZEVNzzV-ds4RXnhROVh0cCkO2XvZBJKS6RTWv8UmGrK_iaklZwhs5qhMiBs1bRAJ0isLwnbxTKXsUFgaY0RRtgNLzhXW6qwT00roL9GMSCAMb-rBXdXJ5zn41gacGejN5mdQTJe3TQbxyxk52uDU4Biy1TCAh3kRU12Cxx-6T39eJdCKtj-qKCHE44mYp-k8MenTbV1l613ObuVTbiZet4WehKlIXLYFctMB4LMrTQmWD2XS5WyMGXMrincoULZ7VO3Q7BAatbxtIBRT56C_9xhNHg5UOaGATjTp2X6U0XiwzAGE1sZoi-MdMVnUQC3ViJ7bIv3vHL4YU3qKX9iGjpZR0Lnqq8PkN-HTjz1mO0VvYZ3Gz71KKd1_p-DiyJo5lRgp4Ms5FSESz0gWkQ3YUm2Y",
                AuthenticationTypes.User,
                TokenIssuer.IDporten,
                false,
                false // we don't support raw ID-porten tokens atm
            },
            {
                // ID-porten testclient exchanged (demo-client.test.idporten.no)
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJuYW1laWQiOiIxNDMzOTUzIiwidXJuOmFsdGlubjp1c2VyaWQiOiIxNDMzOTUzIiwidXJuOmFsdGlubjp1c2VybmFtZSI6IiIsInVybjphbHRpbm46cGFydHlpZCI6NTA1OTMxOTMsInVybjphbHRpbm46YXV0aGVudGljYXRlbWV0aG9kIjoiTm90RGVmaW5lZCIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJhY3IiOiJpZHBvcnRlbi1sb2Etc3Vic3RhbnRpYWwiLCJzY29wZSI6ImFsdGlubjppbnN0YW5jZXMucmVhZCBvcGVuaWQgcHJvZmlsZSIsImNsaWVudF9hbXIiOiJjbGllbnRfc2VjcmV0X2Jhc2ljIiwicGlkIjoiMTk5MTQ4OTcyODEiLCJleHAiOjE3Mzc4MTU3NDYsImlhdCI6MTczNzgxNTE1NywiY2xpZW50X2lkIjoiZGVtb2NsaWVudF9pZHBvcnRlbl90ZXN0IiwiY29uc3VtZXIiOnsiYXV0aG9yaXR5IjoiaXNvNjUyMy1hY3RvcmlkLXVwaXMiLCJJRCI6IjAxOTI6OTkxODI1ODI3In0sImlzcyI6Imh0dHBzOi8vcGxhdGZvcm0udHQwMi5hbHRpbm4ubm8vYXV0aGVudGljYXRpb24vYXBpL3YxL29wZW5pZC8iLCJqdGkiOiI3MTMzYmMwNy1iZWE0LTRkNDAtOWRjNC1jMWFmZGZjMmU2NTEiLCJuYmYiOjE3Mzc4MTUxNTd9.W71Z1FiSYUBJ8G1De-aGYOiUbpD_FCB9gTceLSItZN33y98IzAvNRKJEfXUxVge-GPInjm1DmJ6MVs6ZcVRunigiLa5gNR_W5kkV6kBkaTbZ4SJQsMdT3AaHoBziJEL2ey_ONyDT4ffScx-lRoF_qKQXbkpqLm-Qkj1VKjEBVSTsaqKxJMQrhmKZ4zK6rwhFOPZv5HnGSt56CWh2jrkk8IFzIJZbvO738qHscZ--1UhwHcZ_hpjsdLGaxENiC25kAiqV8gTAyihOAg9ii7jwxLiQYRe_ahqBv5IqT_ZNKKa3q9t7Yh57hQjPWOqtTFTgaBCCYQohYqv-FQtOenbd5g",
                AuthenticationTypes.User,
                TokenIssuer.IDporten,
                true,
                true
            },
            {
                // Altinn portal tt02 test login, token extracted from AltinnStudioRuntime cookie
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJuYW1laWQiOiIxNDMzOTUzIiwidXJuOmFsdGlubjp1c2VyaWQiOiIxNDMzOTUzIiwidXJuOmFsdGlubjpwYXJ0eWlkIjo1MDU5MzE5MywidXJuOmFsdGlubjphdXRoZW50aWNhdGVtZXRob2QiOiJJZHBvcnRlblRlc3RJZCIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJqdGkiOiJkMDk2YjBkYy1lYTgyLTRiNGUtYjY0ZS04Y2NjYzA2OWVmYzYiLCJzY29wZSI6ImFsdGlubjpwb3J0YWwvZW5kdXNlciIsIm5iZiI6MTczNzgxNTM0MSwiZXhwIjoxNzM3ODE3MTQxLCJpYXQiOjE3Mzc4MTUzNDF9.dLYVBOSu99_CjcrIqsw6OmdwfKTKthnG2j1kl2pdsVUgn34vFVDF-VAE40IfSpnKUk4VKG-EkGHISi7S2U9rvLrIU_ptTcchg7XCXYSpQhm1DqfsbVwKarTEDBtlSITeqzUI5t2C6DOGSg4QEip92cOAVPw-m34bxBmnXxo6g-3babb-qSsLty_IPBhj86M0Y6zEomE-ysNVNSLJ-0ccAWi4ByzdfdsA5PnBDoeNTzPSZ3PscMOWe3z5d43WRVq30uKVE3XYWt6W0Yf2CbGXVSCTM9J45P2Ps4qiJysQM0zw2guh3s1IIdF7c0-IrppB-3sLNrDzAZ71kyKJXrc5JQ",
                AuthenticationTypes.User,
                TokenIssuer.Altinn,
                false,
                true
            },
            {
                // Altinn portal tt02 self identified, token extracted from AltinnStudioRuntime cookie
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJuYW1laWQiOiIxNDI4ODEzIiwidXJuOmFsdGlubjp1c2VyaWQiOiIxNDI4ODEzIiwidXJuOmFsdGlubjp1c2VybmFtZSI6Im1hcnRpbm90aGFtYXIiLCJ1cm46YWx0aW5uOnBhcnR5aWQiOjUzMzI4NjYwLCJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6IlNlbGZJZGVudGlmaWVkIiwidXJuOmFsdGlubjphdXRobGV2ZWwiOjAsImp0aSI6Ijg3OGFkMDZiLWE0Y2EtNDFhZi04YjQzLWY3NTE2Mzk3Yzc3NyIsInNjb3BlIjoiYWx0aW5uOnBvcnRhbC9lbmR1c2VyIiwibmJmIjoxNzM3ODE1NjU0LCJleHAiOjE3Mzc4MTc0NTQsImlhdCI6MTczNzgxNTY1NH0.RLnlBcd_mfgixYkZcePG09iMsAk2XM25FdifashYcLEtebutWEub89GZyFHus7oLbCj_yDiyE1Rilpi3qBxUo9wVPH20ZsmFK5XX1jq7K_wzTsQGYlXPkjROyuXObOW1vuPZL973PEuSsFSc0MX38RfpHlOx7QZHx8gxOES3LwLFqCpdSCmTvsbPXmpHu4SKUb0BcaUFH3flexgbry4hixQbO65v6cQP7Od3A-5tTLCtPsBzCRY3u4EqbCVSJvXAj5x0PEYe-rKgQmY6nQl_dPfCre3uksPlKQeWtdDrmR1YiFfvKfg1DD_Fcf9wjeVGavyRh4qYhFV_7jueueGoqQ",
                AuthenticationTypes.SelfIdentifiedUser,
                TokenIssuer.Altinn,
                false,
                true
            },
            {
                // Maskinporten raw org token (not service owner)
                "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ.eyJzY29wZSI6ImFsdGlubjppbnN0YW5jZXMucmVhZCBhbHRpbm46aW5zdGFuY2VzLndyaXRlIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm1hc2tpbnBvcnRlbi5uby8iLCJjbGllbnRfYW1yIjoicHJpdmF0ZV9rZXlfand0IiwidG9rZW5fdHlwZSI6IkJlYXJlciIsImV4cCI6MTczNzg0NTkzNSwiaWF0IjoxNzM3ODQyMzM1LCJjbGllbnRfaWQiOiIwNDRmNTA0MC01NGUzLTRhMjctYTIyMS1hODUxNGZkMzBjYTkiLCJqdGkiOiJabUFxZU1fOENrVDMxSWNFXzBlSDhDLVBJM0x2b2ZQVlBielBIc3N2MW1rIiwiY29uc3VtZXIiOnsiYXV0aG9yaXR5IjoiaXNvNjUyMy1hY3RvcmlkLXVwaXMiLCJJRCI6IjAxOTI6OTkxODI1ODI3In19.wI3lgUfpFAWW2dp6SLThjXUhdcBVqym2epd8XG1_AoBbK93lH-lKveMqG14HuNYyy3uivaLwRkHgcIspmlupJAm7r2l-UrflnUX-yQVMa_xYpIDvJIn4gmN-271AnXXLt_lE6WtiYEWaekK37cVs3GzPkwfelx4mPkAg-t-bQeXBIDBLCuvUTy5uzBWbcoMFE7n1fEYu7tTuea2XCbshOcpcLUvLR2D6ZE2brj7Oh91IVizMOtULmf__ZxtwfYW7JfYvBqzd-dASs0Nl0xRwf4kuqEHzZk48VX2x_yizB7RITUAXZ_CffUxvS-NM7dd5q_tlKCRR5Fb7z7yqsLklheeNcyuyXdNqbQEL0iAxotJSNjL2FLjuidOqzh1d8dk45N8019bnYKWAopeb-bj2MNdUEWNEQvubejoKGfO5f_xJ6kS9Oeh4B7JW30xyuYSz8_D9LEVCSFfUp73n4XhQ_DeLWZsq9_G0uWftPUuDbGLaQBwVqujQdXXQCd5MVg7V",
                AuthenticationTypes.Org,
                TokenIssuer.Maskinporten,
                false,
                false // we don't support raw Maskinporten tokens atm
            },
            {
                // Maskinporten exchanged org token (not service owner)
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJzY29wZSI6ImFsdGlubjppbnN0YW5jZXMucmVhZCBhbHRpbm46aW5zdGFuY2VzLndyaXRlIiwidG9rZW5fdHlwZSI6IkJlYXJlciIsImV4cCI6MTczNzg0NDE1NywiaWF0IjoxNzM3ODQyMzU3LCJjbGllbnRfaWQiOiIwNDRmNTA0MC01NGUzLTRhMjctYTIyMS1hODUxNGZkMzBjYTkiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifSwidXJuOmFsdGlubjpvcmdOdW1iZXIiOiI5OTE4MjU4MjciLCJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6Im1hc2tpbnBvcnRlbiIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJpc3MiOiJodHRwczovL3BsYXRmb3JtLnR0MDIuYWx0aW5uLm5vL2F1dGhlbnRpY2F0aW9uL2FwaS92MS9vcGVuaWQvIiwianRpIjoiMzUwYWNhOTYtYjNkZi00YTdmLTg4YWItOWY4ZDc4ZDYxMjI0IiwibmJmIjoxNzM3ODQyMzU3fQ.g6EFkX6pAKtA64p11CpoTDU6Nzzst4duOzBletMAexEmX-V5C4rXsndkwK3pL9JpZNBbjBZZaEAbBta177PIQo208dZwzYV2meLrip5fQ-hnWF3Ub0VdpxcgggDbcx8WqT1HSix-GQlNcSe2uyZB0KZ_8GRB2aKXjatX4R392A3CZfzBq8Dt3ra5AP0pWVxJAd4NuKHPQRKGbNWkC62J92zLYYtTz4j8DS9yogeP28hrcLzuqyVScDndmOiIjeexXXWdgrwVLDBO2mpVU_i4xqRUbjK9UdySrrkYfv-ZIZQRoZsyPE3ab0SDym-4kVxSIp4xyH3nQuzZJqz24LuBcw",
                AuthenticationTypes.Org,
                TokenIssuer.Maskinporten,
                true,
                true
            },
            {
                // Maskinporten raw service owner token
                "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ.eyJzY29wZSI6ImFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLndyaXRlIGFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLnJlYWQiLCJpc3MiOiJodHRwczovL3Rlc3QubWFza2lucG9ydGVuLm5vLyIsImNsaWVudF9hbXIiOiJwcml2YXRlX2tleV9qd3QiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzM3ODE3NjU5LCJpYXQiOjE3Mzc4MTc1MzksImNsaWVudF9pZCI6IjA0NGY1MDQwLTU0ZTMtNGEyNy1hMjIxLWE4NTE0ZmQzMGNhOSIsImp0aSI6IlVVVUZ3LU5KZk11R29kOUJsT0pJaGVUalA0YmN3Vzl3aF9kLUJDWm05dE0iLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifX0.t-STvjL2uSFqg_BFtopLenq3hVjZV1_nzkUXh6LxSj8FOGC8OTvtjmIZtOyg1ZHGC3J6M4ZF3QXCHVmZYRl_rXIAU4u8_xG6_HZMuIet9WcoBEadCYAJb-LQEQwvifMyUnwtwMjbtcurh8Wuj6h6lCidsfm2qUC0H3A7W6AxRtXF7CzHkbfSVcK_kkUe2vUn6VLFqB6ZdC_mULonaJtBD3i6hHt7LjbO0U1GuGf-wH80QXHEEr_7qpl2m0NI4CWe_4v638myV1PQVfx5tmwrVLk4BALB1_oP0Ugbp4Wrq8TMZY0Fn4-NpTVStWh3M3pRLXZy-OsycV_GZTBWTBWZRCUtsXcVNI3roFblsqh59IIkgSYDuJXomMfxEuAVoWL20SZJt50Vy3cvJecqN6NJ0hZ4q9kpFkkXs6D3TVUiPhtl_JdrpQEN8mVyUnqo7wj1hrkfHTt6UGpGIGma1CCXjn0pfCjejrMUkpcw2AIwPRfw1syzw3IRvMKZBwcA_ORU",
                AuthenticationTypes.ServiceOwner,
                TokenIssuer.Maskinporten,
                false,
                false // we don't support raw Maskinporten tokens atm
            },
            {
                // Maskinporten exchanged service owner token
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJzY29wZSI6ImFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLndyaXRlIGFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLnJlYWQiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzM3ODE5Mzc2LCJpYXQiOjE3Mzc4MTc1NzYsImNsaWVudF9pZCI6IjA0NGY1MDQwLTU0ZTMtNGEyNy1hMjIxLWE4NTE0ZmQzMGNhOSIsImNvbnN1bWVyIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjk5MTgyNTgyNyJ9LCJ1cm46YWx0aW5uOm9yZyI6ImRpZ2RpciIsInVybjphbHRpbm46b3JnTnVtYmVyIjoiOTkxODI1ODI3IiwidXJuOmFsdGlubjphdXRoZW50aWNhdGVtZXRob2QiOiJtYXNraW5wb3J0ZW4iLCJ1cm46YWx0aW5uOmF1dGhsZXZlbCI6MywiaXNzIjoiaHR0cHM6Ly9wbGF0Zm9ybS50dDAyLmFsdGlubi5uby9hdXRoZW50aWNhdGlvbi9hcGkvdjEvb3BlbmlkLyIsImp0aSI6IjFmN2RlMDFhLTgyYjMtNDc3Yi04MmQzLTBiY2I5NDkzOGVjNyIsIm5iZiI6MTczNzgxNzU3Nn0.G9uZ_YK2IxUgv8ySP3zy_IG0kOO3qJtEqHPds2f3jh1_YHcQlHEnQXUecUR-xD-Qi8qtI_GEJizA3l-zXc9DLkxgv4HVamzBrOcm9aQWqd3s8_OuI1nF4WjWrcw5FHpaXl1DqbgqPQI8rxOJhmW-H4rE944TKHLwvBlsX-9brYU_CC1WfnymFwODKsGhT1hm5ljQeV6O6j0GkNsRANiQlUnIMJcMVQEBtcuHGBLeNq-u5JSXzs17GLB371IN9Jb8IoYKu7njW3-Pat-QWebDYT9jdMQHOYslr0WByTvlnhL6Z7aQ8KbllbNw3GoYOvCBphVVpmk7aaqcchUiBh30-g",
                AuthenticationTypes.ServiceOwner,
                TokenIssuer.Maskinporten,
                true,
                true
            },
            {
                // Maskinporten for systemuser, coming from the smartcloudaltinn.azurewebsites.net/api/maskinporten test endpoint
                "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ.eyJhdXRob3JpemF0aW9uX2RldGFpbHMiOlt7InR5cGUiOiJ1cm46YWx0aW5uOnN5c3RlbXVzZXIiLCJzeXN0ZW11c2VyX29yZyI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5MjozMTA3MDI2NDEifSwic3lzdGVtdXNlcl9pZCI6WyJmOTUwZGRhZS0wNmMzLTRiNTctYjk0MC03MDI0MTdhOTBkZjAiXSwic3lzdGVtX2lkIjoiOTkxODI1ODI3X3NtYXJ0Y2xvdWQiLCJleHRlcm5hbFJlZiI6ImVkMWMzOGY0LWY1MjgtNGVmMS04NjUyLWIxYWViODU2M2RmZSJ9XSwic2NvcGUiOiJhbHRpbm46c3lzdGVtYnJ1a2VyLmRlbW8iLCJpc3MiOiJodHRwczovL3Rlc3QubWFza2lucG9ydGVuLm5vLyIsImNsaWVudF9hbXIiOiJwcml2YXRlX2tleV9qd3QiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzM3ODEzMzk4LCJpYXQiOjE3Mzc4MTMyNzgsImNsaWVudF9pZCI6ImEyZWQ3MTJkLTQxNDQtNDQ3MS04MzlmLTgwYWU0YTY4MTQ2YiIsImp0aSI6InZrWFlhNGxIR2lyOFFpcGVtc1dvdnNUMzdIci10ZExOaTYyODlTajVzU1UiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifX0.b3JozeLFCBn76a703n1ZqbjqHaFaaCadpZb3T0cuqJvLnELEjiOKXvwSI1kuqnpqfEqxEX1UyBIyJh-rvIOZ-B7dXj1usWoh-oWofvENT0AzJcwpPrhuBBo-ZPoCtTVIJraWBJfYbjEFfajfFZdz0D_poz2i5MbJO9mSn5FMAEMdzmjZSA7O9n8Y02uApN31B3pHlKpqIEUK1HhxGl_z8_rzcAcbs2uOKUxVCK_vnEMk3XpcaEDsk0hr-ohkALshWYVUZCxzl7MzJ2wFhyr9JZqSLSV-dS_WY09cwUA-I1dyIlQE1LW1Ye4Ow5xExArBO8UT3sB-q23EqRY07PC1lh-YdFB1rR1pO6pklnQdz8zPzyrUYYcxlQQDVTRVjRgZcF43TMxQIUmAB0LG6QvP8oRp8SV4oAAK9ZB_fCVkwd8gbVwvVIhuQdPEA6aUoV8mPRPz1IW-eVi-XXEQdkOC8OArNQd92y5DiEQE2puZI1nUmXFwypltks-3Xjam6-_5",
                AuthenticationTypes.SystemUser,
                TokenIssuer.Maskinporten,
                false,
                true
            },
            {
                // Exchanged Maskinporten for systemuser, coming from the smartcloudaltinn.azurewebsites.net/api/maskinporten test endpoint
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJhdXRob3JpemF0aW9uX2RldGFpbHMiOnsidHlwZSI6InVybjphbHRpbm46c3lzdGVtdXNlciIsInN5c3RlbXVzZXJfb3JnIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjMxMDcwMjY0MSJ9LCJzeXN0ZW11c2VyX2lkIjpbImY5NTBkZGFlLTA2YzMtNGI1Ny1iOTQwLTcwMjQxN2E5MGRmMCJdLCJzeXN0ZW1faWQiOiI5OTE4MjU4Mjdfc21hcnRjbG91ZCIsImV4dGVybmFsUmVmIjoiZWQxYzM4ZjQtZjUyOC00ZWYxLTg2NTItYjFhZWI4NTYzZGZlIn0sInNjb3BlIjoiYWx0aW5uOnN5c3RlbWJydWtlci5kZW1vIiwidG9rZW5fdHlwZSI6IkJlYXJlciIsImV4cCI6MTczNzgxNTEyMCwiaWF0IjoxNzM3ODEzMzIwLCJjbGllbnRfaWQiOiJhMmVkNzEyZC00MTQ0LTQ0NzEtODM5Zi04MGFlNGE2ODE0NmIiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifSwidXJuOmFsdGlubjpvcmdOdW1iZXIiOiI5OTE4MjU4MjciLCJ1cm46YWx0aW5uOmF1dGhlbnRpY2F0ZW1ldGhvZCI6Im1hc2tpbnBvcnRlbiIsInVybjphbHRpbm46YXV0aGxldmVsIjozLCJpc3MiOiJodHRwczovL3BsYXRmb3JtLnR0MDIuYWx0aW5uLm5vL2F1dGhlbnRpY2F0aW9uL2FwaS92MS9vcGVuaWQvIiwianRpIjoiMTliNGUyOWItNjRiMi00YTUyLWFlNDAtZTc3Njg1MjMxM2YyIiwibmJmIjoxNzM3ODEzMzIwfQ.m-5x5GscJYjD_rCnd0EWQBKSwymPyN4AE9Yti7bjeUuvAVyiPdtske9fahEGONVUvY9Pk2bDjdNOfAeaOPMHB2skEqMNYGqxxQRgBraZawAPFuQSSufTgkt5dEgOAymUam2x9NQ_giFPPtaWHez23rtDGSGAXkMaIBWe93XbO-z_4dFcyDEXvmK4SfkLeJWxizhugVcwwDstYrN7VlcQz3gBGuGKIcC8lnBPIT8u7tmJKt0JQ2L9oZQkGjatUu-4_qlcfzvDr40ojyNtOszoc1UblNRkTI-QxB2yRuvG9a7wMtej_Xgo9Pst8cz4MfBSxOq-2U_wHX95-d5GTLnFfw",
                AuthenticationTypes.SystemUser,
                TokenIssuer.Maskinporten,
                true,
                true
            },
        };

    private Authenticated Parse(JwtSecurityToken jwtToken, string token, AuthenticationTypes type)
    {
        string ReadClaim(string claimType)
        {
            var claim = jwtToken.Claims.Single(c => c.Type == claimType);
            Assert.NotNull(claim.Value);
            return claim.Value;
        }

        int ReadClaimInt(string claimType)
        {
            var claim = jwtToken.Claims.Single(c => c.Type == claimType);
            Assert.NotNull(claim.Value);
            return int.Parse(claim.Value, CultureInfo.InvariantCulture);
        }

        Authenticated auth;
        Party party;

        switch (type)
        {
            case AuthenticationTypes.User:
                party = new Party()
                {
                    PartyId = ReadClaimInt(AltinnCoreClaimTypes.PartyID),
                    PartyTypeName = PartyType.Person,
                    OrgNumber = null,
                    SSN = "12345678901",
                    Name = "Test Testesen",
                };
                auth = Authenticated.From(
                    tokenStr: token,
                    isAuthenticated: true,
                    appMetadata: TestAuthentication.NewApplicationMetadata("digdir"),
                    getSelectedParty: () => ReadClaim(AltinnCoreClaimTypes.PartyID),
                    getUserProfile: _ =>
                        Task.FromResult<UserProfile?>(
                            new UserProfile
                            {
                                UserId = ReadClaimInt(AltinnCoreClaimTypes.UserId),
                                PartyId = ReadClaimInt(AltinnCoreClaimTypes.PartyID),
                                Party = party,
                            }
                        ),
                    lookupUserParty: _ => Task.FromResult<Party?>(party),
                    lookupOrgParty: _ => null!,
                    getPartyList: _ => Task.FromResult<List<Party>?>([party]),
                    validateSelectedParty: (_, _) => Task.FromResult<bool?>(true),
                    getUserRoles: (_, _) => Task.FromResult<IEnumerable<Role>>([])
                );
                break;
            default:
                auth = Authenticated.From(
                    tokenStr: token,
                    isAuthenticated: true,
                    appMetadata: TestAuthentication.NewApplicationMetadata("digdir"),
                    getSelectedParty: () => null,
                    getUserProfile: _ => null!,
                    lookupUserParty: _ => null!,
                    lookupOrgParty: _ => null!,
                    getPartyList: _ => null!,
                    validateSelectedParty: (_, _) => null!,
                    getUserRoles: (_, _) => null!
                );
                break;
        }

        return auth;
    }

    [Theory]
    [MemberData(nameof(Tokens))]
    public async Task Can_Parse_Real_Tokens(
        string token,
        AuthenticationTypes tokenType,
        TokenIssuer issuer,
        bool isExchanged,
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
            Assert.ThrowsAny<Exception>(() => Parse(jwtToken, token, tokenType));
            return;
        }

        var auth = Parse(jwtToken, token, tokenType);

        switch (tokenType)
        {
            case AuthenticationTypes.User:
                var user = Assert.IsType<Authenticated.User>(auth);
                Assert.Equal(issuer, auth.TokenIssuer);
                Assert.Equal(isExchanged, auth.TokenIsExchanged);
                Assert.Equal(token, auth.Token);
                var details = await user.LoadDetails(validateSelectedParty: true);
                Assert.NotNull(details);
                // Snapshot user and details with Verify
                await Verify(new { User = user, Details = details })
                    .AutoVerify()
                    .UseParameters(tokenType, issuer, isExchanged, succeeds);
                break;
            case AuthenticationTypes.SelfIdentifiedUser:
                Assert.IsType<Authenticated.SelfIdentifiedUser>(auth);
                Assert.Equal(issuer, auth.TokenIssuer);
                Assert.Equal(isExchanged, auth.TokenIsExchanged);
                Assert.Equal(token, auth.Token);
                break;
            case AuthenticationTypes.Org:
                Assert.IsType<Authenticated.Org>(auth);
                Assert.Equal(issuer, auth.TokenIssuer);
                Assert.Equal(isExchanged, auth.TokenIsExchanged);
                Assert.Equal(token, auth.Token);
                break;
            case AuthenticationTypes.ServiceOwner:
                Assert.IsType<Authenticated.ServiceOwner>(auth);
                Assert.Equal(issuer, auth.TokenIssuer);
                Assert.Equal(isExchanged, auth.TokenIsExchanged);
                Assert.Equal(token, auth.Token);
                break;
            case AuthenticationTypes.SystemUser:
                Assert.IsType<Authenticated.SystemUser>(auth);
                Assert.Equal(issuer, auth.TokenIssuer);
                Assert.Equal(isExchanged, auth.TokenIsExchanged);
                Assert.Equal(token, auth.Token);
                break;
            default:
                Assert.Fail("Unknown token type: " + tokenType);
                break;
        }
    }
}
