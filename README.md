# Cat Chase (webOS TV)

A simple game for LG Smart TV: a cat chases the Magic Remote pointer. Use the pointer on TV or your mouse on Mac.

Built with [PixiJS v8](https://pixijs.com/) and bundled with [esbuild](https://esbuild.github.io/).

## Development

Source files live in `src/`. A build step is required to produce `bundle.js`.

```bash
npm install
```

**Watch mode** (rebuilds on every save):
```bash
npm run dev
```

**Production build** (minified, ~545KB):
```bash
npm run build
```

## Test in browser

```bash
npm run build
open index.html
```

## Test in webOS TV Simulator

1. Install [webOS TV SDK](https://webostv.developer.lge.com/develop/tools/simulator-installation) and **CLI** (includes `ares-*`).
2. Add the simulator as a device (one-time):
   ```bash
   ares-setup-device
   # Add, name e.g. "simulator", choose your simulator (e.g. webOS TV 24).
   ```
3. Build, package, install, then launch in the simulator:
   ```bash
   npm run deploy:sim
   ```

## Package and install on your TV

1. **Enable Developer Mode** on the TV:
   - Open the **LG Content Store**, search for **"Developer Mode"** and install it
   - Launch the app, sign in with your LG Developer account, and toggle **Dev Mode Status** on
   - The TV will reboot automatically
   - > The session expires after a few days — reopen the app and hit **Extend** to renew it. If it expires, all sideloaded apps are wiped.

2. **Install webOS CLI:**
   ```bash
   npm install -g @webos-tools/cli
   ares -V  # verify
   ```

3. **Find your TV's IP address:** Settings → Network → Wi-Fi Connection → Advanced Wi-Fi Settings

4. **Add your TV as a device** (one-time):
   ```bash
   ares-setup-device
   # Add → name (e.g. "mytv"), IP: your TV's IP, port: 9922, username: prisoner
   ares-novacom --device my-tv --getkey
   # Accept the prompt that appears on the TV.
   ```
5. **Deploy** (build, package, install, and launch) on the TV:
   ```bash
   npm run deploy:tv
   ```
   Or run individual steps:
   ```bash
   npm run build        # bundle src/
   npm run package      # creates com.mousegame.app_1.0.0_all.ipk
   npm run install:tv   # installs the .ipk on the TV
   npm run launch:tv    # launches the app (also findable in the TV app launcher)
   ```

## Links

- [webOS TV Developer](https://webostv.developer.lge.com/)
- [Magic Remote guide](https://webostv.developer.lge.com/develop/guides/magic-remote)
- [CLI guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)
- [PixiJS docs](https://pixijs.com/)
