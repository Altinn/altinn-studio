# The mocked Backend

This is written in plain javascript. This is because we want server startup to be faster. No need to a compile step.
It also make the setup simpler.

At the moment this is just mocking out whats needed to run the datamodelling-part of the solution.

```node
fetch('https://dev.altinn.studio/designer/api/v1/ttd/autodeploy-v3/Deployments', {
  headers: {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,no;q=0.7',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    pragma: 'no-cache',
    'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-xsrf-token':
      'CfDJ8B5s2CFPnEVNt3FcJdvGOdsVnBJLdxWpNKK46IZVEsRSI7JtVnDaXxe9qRLCgxVrrmv9sv25xcxy070LyehNq78-l-sgjoUc-5RN4pP_H8cKVCdaWhnboihJYzW0hgUb3RP-HTQZV8bEmoeD8iJXsBzLNOJqjp90ik9mBX7pntq4msNQV44WxpwwwCUWWEHLZw',
    cookie:
      '_ga=GA1.2.1222415264.1660204520; AS-XSRF-TOKEN=CfDJ8B5s2CFPnEVNt3FcJdvGOdsxLpPmdEZhRNTJ_PFkBsY2TeeWRImC0iq6ukkE3UMAoG1M4m2B_M1x_m-9i12bettcwxOA1ePWbSmM4kVVxj85ha-H66kr4fdEvFpwhOLWBq93Lu1vMExJIUI4xQCiGVE; i_like_gitea=229b9fb78403bd62; lang=en-US; DesignerSessionTimeout=1%2F11%2F2023%2012%3A02%3A06%20AM; AltinnStudioDesigner=CfDJ8B5s2CFPnEVNt3FcJdvGOdtzYqAfowDDPiMnHH7_MATlqHYBMipacqrOEpx7lao2PLZSujC_WXhrKamfU76DzmT_DLB6MbCZwwdijV9yuwv-XIdMcJRJWT9mBmjvSrL9pDXwPeLdV6kxSNBL0pH8RwOL8zYUXDvndbyeJdABGt6FsbasbhhmAK08OjFW7AUyUAJDVsOQ2U12J6VJgCkeDP5uCkA8lwYkPryJ7Pu3YKctJnRXQfQKuJolw_gtApEe0FFbGM63ASlvNbJPgzb9XAhyPRMi9HQQIEGh3HkbQzSTpZ24aHHn69j490HG4M-bYmJlubWG2FtoRjqmg2uDUzpYFOu7jM5sWfguq6IQfOScm5fA1fzCObWsKHqgb6X2vHwQUzSoyp1iH9XyCLkFvzCx_Xz2TAtXLJ6paO1xG8Cj8wjGlx_Yn2p4JG1gX6YFqJvGIHjubrKXmyNEvmZqXTpRpEd24rR8fjllGoygDj0gzcGyqJzipJcHTkZNfhVlmnU-S9g3lbd6zpEV58nFgeKTM4BFaHk6Y4vp6S1KbeLjrso1ZFJhI4LshlMuUe3RIkcWWynJNYw1Z9ovE7mqqwY; XSRF-TOKEN=CfDJ8B5s2CFPnEVNt3FcJdvGOdsVnBJLdxWpNKK46IZVEsRSI7JtVnDaXxe9qRLCgxVrrmv9sv25xcxy070LyehNq78-l-sgjoUc-5RN4pP_H8cKVCdaWhnboihJYzW0hgUb3RP-HTQZV8bEmoeD8iJXsBzLNOJqjp90ik9mBX7pntq4msNQV44WxpwwwCUWWEHLZw',
    Referer: 'https://dev.altinn.studio/editor/ttd/autodeploy-v3/deploy',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
  body: '{"tagName":"2400","env":{"hostname":"at22.altinn.cloud","appPrefix":"apps","platformPrefix":"platform","name":"at22","type":"test"}}',
  method: 'POST',
});
```

```json
{
  "tagName": "2400",
  "envName": "at22",
  "build": {
    "id": "625641",
    "status": "notStarted",
    "result": "none",
    "started": null,
    "finished": null
  },
  "created": "2023-01-10T21:34:55.9939399+00:00",
  "createdBy": "mijohansen",
  "app": "autodeploy-v3",
  "org": "ttd"
}
```

```json
{
  "tagName": "2400",
  "env": {
    "hostname": "at22.altinn.cloud",
    "appPrefix": "apps",
    "platformPrefix": "platform",
    "name": "at22",
    "type": "test"
  }
}
```
