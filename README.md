# Cat Chase (webOS TV)

A simple game for LG Smart TV: a cat chases the Magic Remote pointer. Use the pointer on TV or your mouse on Mac.

## Test on Mac (simulator in browser)

```bash
# Option A: open directly
open index.html

# Option B: local server (avoids file:// cursor quirks)
npx -y serve . -p 3000
# Then open http://localhost:3000
```

Move the mouse — the cat follows. Same pointer events are used by the Magic Remote on TV.

## Test in webOS TV Simulator (Mac)

1. Install [webOS TV SDK](https://webostv.developer.lge.com/develop/tools/simulator-installation) and **CLI** (includes `ares-*`).
2. Add the simulator as a device (one-time):
   ```bash
   ares-setup-device
   # Add, name e.g. "simulator", choose your simulator (e.g. webOS TV 24).
   ```
3. Package, install, then launch in the simulator:
   ```bash
   ares-package .
   ares-install -d simulator com.mousegame.app.catchase_1.0.0_all.ipk
   ares-launch -d simulator com.mousegame.app.catchase
   ```

## Package and install on your TV (OLED55C25LB)

1. **Enable Developer Mode** on the TV (install "Developer Mode" app from LG Content Store, open it and enable).
2. **Install webOS CLI** and add your TV as a device:
   ```bash
   ares-setup-device
   # Add → name (e.g. "mytv"), IP: your TV's IP, port: 9922
   ares-novacom --device mytv --getkey
   # Follow TV prompt to allow key.
   ```
3. **Package** the app:
   ```bash
   ares-package .
   ```
   This creates `com.mousegame.app.catchase_1.0.0_all.ipk` in the current directory.

4. **Install** on the TV:
   ```bash
   ares-install -d mytv com.mousegame.app.catchase_1.0.0_all.ipk
   ```

5. **Launch** on the TV:
   ```bash
   ares-launch -d mytv com.mousegame.app.catchase
   ```
   Or find "Cat Chase" in the TV app launcher.

## Regenerating the icon

```bash
node scripts/generate-icon.js
```

## Links

- [webOS TV Developer](https://webostv.developer.lge.com/)
- [Magic Remote guide](https://webostv.developer.lge.com/develop/guides/magic-remote)
- [CLI guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)
