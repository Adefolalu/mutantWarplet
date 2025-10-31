This is a [Vite](https://vitejs.dev) project bootstrapped with [`@farcaster/create-mini-app`](https://github.com/farcasterxyz/frames/tree/main/packages/create-mini-app).

## `farcaster.json`

The `/.well-known/farcaster.json` is served from the [public
directory](https://vite.dev/guide/assets) and can be updated by editing
`./public/.well-known/farcaster.json`.

You can also use the `public` directory to serve a static image for `splashBackgroundImageUrl`.

## Frame Embed

Add a the `fc:frame` in `index.html` to make your root app URL sharable in feeds:

```html
<head>
  <!--- other tags --->
  <meta
    name="fc:frame"
    content='{"version":"next","imageUrl":"https://placehold.co/900x600.png?text=Frame%20Image","button":{"title":"Open","action":{"type":"launch_frame","name":"App Name","url":"https://app.com"}}}'
  />
</head>
```

Ownership check response: {owners: Array(1)}
warpletService.ts:105 Extracted owners: ['0xa99201a8fddd43a65b42e125660d0c9043a08c20']
warpletService.ts:106 Checking against address: 0x83D3FAABd20e4116DB22F726fA289A3be9C4F8A3
warpletService.ts:113 Ownership result: false
