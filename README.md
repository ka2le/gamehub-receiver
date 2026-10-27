# Game Hub TV receiver

A custom Google Cast Web Receiver for the native Android sender. It displays the same library/question/result content for now, laid out for a landscape TV. It receives public snapshots, not screenshots or raw controller data. Phone rules remain authoritative, so phone and TV layouts can diverge later.

## Register once

1. The receiver is live on GitHub Pages from [ka2le/gamehub-receiver](https://github.com/ka2le/gamehub-receiver). Use **https://ka2le.github.io/gamehub-receiver/index.html** as the receiver URL. Deployment and all ten runtime files were verified over HTTPS on 27 October 2026, including JavaScript MIME types. Fonts and open licenses are bundled. No bundler, database or secret is needed. The CAF SDK loads from Google's official URL in `index.html`.
2. Open the [Google Cast Developer Console](https://cast.google.com/publish/) using the Google account you want to retain for this app. If this is a new developer account, Google charges a one-time **US$5** registration fee; complete account/payment steps yourself. Choose **Add New Application → Custom Receiver**, name it **Game Hub**, and set its URL to the HTTPS `index.html` above. Leave audio-only support and relay casting off for this local TV game. Save and copy the receiver application ID. Keep the application unpublished for personal testing.
3. In **Devices → Add New Device**, register your Chromecast's Cast serial number. You can find it by casting the Developer Console page from Chrome to the TV; for Android/Google TV use the software Cast serial, which can differ from the hardware serial. Wait at least **15 minutes**, check for **Ready for Testing**, then unplug/reconnect the Chromecast's power. Follow any console prompts about sharing Cast device information.
4. In Game Hub, open **Cast → Game Hub Cast setup**, enter the eight-character receiver app ID, and save. The sender changes its discovery filter without an APK rebuild.
5. Keep phone and Chromecast on the same local Wi-Fi, with client/AP isolation disabled. Tap the native Cast icon next to **Choose a TV**. Pick the registered device.
6. Open the quiz on the phone. Verify library, question, reveal, retry and return to library on the TV. The phone says the screen is on TV only after the receiver acknowledges a snapshot.

Google receiver/test-device registration and actual Chromecast playback remain pending. A hosted page or browser preview does not establish a Cast connection. No Android rebuild is required just to set the receiver ID.

## Publish updates

This `receiver/` folder is a separate Git repository. Its GitHub Actions workflow runs the five protocol tests and publishes only the runtime HTML/CSS/JavaScript, artwork, fonts and font licenses. Android sources, local configuration, APKs and signing keys are outside this repository.

From the GameHubApp folder, after editing receiver files:

```powershell
node --test receiver/protocol.test.mjs
git -C receiver add index.html receiver.css receiver.mjs protocol.mjs logo.svg quiz-art.svg fonts README.md .gitignore .github/workflows/pages.yml
git -C receiver diff --cached --stat
git -C receiver commit -m "Update TV receiver"
git -C receiver push
```

Follow the [deployment workflow](https://github.com/ka2le/gamehub-receiver/actions/workflows/pages.yml). GitHub Pages must use **GitHub Actions** as its source. Keep the same receiver URL in the Cast console for future updates. Protocol test changes should also be staged when applicable.

## Mirroring before registration

In the Android app, **Cast → Open Google Home** provides Google's ordinary screen mirroring route. Hold the TV tile in Home and choose **Cast → Cast my screen**; select Game Hub if prompted to cast one app. Return to Game Hub to play. Stop from Google Home. This path needs no Game Hub receiver registration and is managed by Google Home; Game Hub cannot read or label its connection state. It is independent of the native custom receiver route.

## Protocol v1

Namespace: `urn:x-cast:dev.kalle.gamehub.state`. UTF-8 JSON messages:

- Sender: `type: snapshot`, `version: 1`, a phone session UUID, increasing `revision`, screen, focus, joined-player count, question/answers, reveal state and public result. `correct`, `selected` and `score` are null until reveal. Diagnostic fields and device descriptors never leave the phone.
- Receiver: `type: ready`, `version: 1`, to request a full snapshot; `type: ack`, `version: 1`, session ID/revision after accepting one.
- The first valid sender owns the receiver until disconnect. Duplicate/older revisions within a session are rejected. A restarted sender's new session UUID accepts a fresh full snapshot. Rendered strings use `textContent`, never sender HTML.
- The sender sends on public-state change, session start/resume, receiver readiness, and a five-second foreground heartbeat. After 15 seconds without a valid message the TV dims its stale content and says **Waiting for phone**. Foreground play only; background/locked-phone sessions are not accepted yet.

## Local layout preview

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory receiver
# http://127.0.0.1:8765/?preview=library
# http://127.0.0.1:8765/?preview=quiz
# http://127.0.0.1:8765/?preview=reveal
node --test receiver/protocol.test.mjs
```

Preview mode is labeled **not connected** and never starts a Cast session. It is only for layout inspection. Use a real HTTPS host and registration for a Chromecast.

References: [Android sender integration](https://developers.google.com/cast/docs/android_sender/integrate), [custom receiver messaging](https://developers.google.com/cast/docs/web_receiver/core_features), [receiver/device registration](https://developers.google.com/cast/docs/registration), [Google Home screen mirroring](https://support.google.com/chromecast/answer/6059461).
