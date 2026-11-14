# TunisiaFlicks Flutter app (hybrid, Android)

A Flutter shell around the site: the site runs in a locked-down WebView, native code handles what the
web cannot (back button, offline screen, fullscreen video now; sign-in handoff, push, app links,
update prompts in later phases). See the migration plan for the full architecture.

## Phases in this folder

| Phase | Status |
| --- | --- |
| 0. Prep: project, Android config, CI | done here |
| 1. Shell: WebView, cookies, back, popup policy, offline screen, black splash, RTL-safe | done here |
| 2. App links, share | not yet |
| 3. Google sign-in handoff | not yet. Google blocks sign-in in a WebView, so Google login does nothing in this build; email and password works |
| 4. Push (FCM) | not yet |

## How it is built

`android/` is not committed. `tool/bootstrap_android.py` creates it (package `com.tunisiaflicks.app`,
minSdk 21, release signing from the same `TF_KEYSTORE_*` variables as `android/phone`, icons copied from
`android/phone`). CI runs it before every build.

- `ci/flutter-debug.yml`: debug APK, installs as `com.tunisiaflicks.app.debug` next to the real app.
- `ci/flutter-android.yml`: signed release APK as a GitHub **prerelease** on tag `flutter-vX.Y.Z`. The site
  ignores it (it reads only non-prerelease `android-v*` releases), so tests never reach users.

## Layout

```
lib/main.dart                 system bars, orientation, app entry
lib/app/app_config.dart       site host (override: --dart-define=TF_SITE_HOST=...), start URL
lib/shell/shell_page.dart     WebView, settings, back, offline, popups, fullscreen
lib/shell/nav_policy.dart     pure navigation rules (unit-tested)
lib/shell/offline_screen.dart offline screen (en / fr / ar)
lib/bridge/bridge_script.dart injected window.tunisiaflicksApp + external-link taps
lib/bridge/bridge_handlers.dart  Dart side of the bridge (tf.openExternal)
test/nav_policy_test.dart
```

## Optional site hooks (not required for this build)

- `window.tfAppBack()`: if the site defines it, the app's Back button asks it first (return `true` when it
  closed a sheet or menu), like `tfTvBack` in the TV app.
- `window.tunisiaflicksApp` (`present`, `platform`, `version`, `capabilities`): read it in a
  `use-native-app.ts` hook, mirroring `use-desktop-app.ts`.
