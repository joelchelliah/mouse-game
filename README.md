# Cat Chase (webOS TV)

A simple game for LG Smart TV: a cat chases the Magic Remote pointer. Use the pointer on TV or your mouse on Mac.

## Test in browser

```bash
open index.html
```

## Test in webOS TV Simulator

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
5. **Package** the app:
   ```bash
   ares-package .
   ```
   This creates `com.mousegame.app.0.0_all.ipk` in the current directory.

6. **Install** on the TV:
   ```bash
   ares-install --device my-tv com.mousegame.app.0.0_all.ipk
   ```

7. **Launch** on the TV:
   ```bash
   ares-launch --device my-tv com.mousegame.app
   ```
   Or find "Cat Chase" in the TV app launcher.

8. **Reinstall & Reload** one-liner:
   ```bash
   ares-package . && ares-install --device my-tv com.mousegame.app_1.0.0_all.ipk && ares-launch --device my-tv com.mousegame.app
   ```

## Links

- [webOS TV Developer](https://webostv.developer.lge.com/)
- [Magic Remote guide](https://webostv.developer.lge.com/develop/guides/magic-remote)
- [CLI guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)
