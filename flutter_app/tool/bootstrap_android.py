#!/usr/bin/env python3
"""Creates and configures flutter_app/android/ (it is not committed; CI runs this every build).

What it does, in order:
  1. `flutter create` into a temp folder and copy only its android/ here.
  2. Make the app com.tunisiaflicks.app, the same package as the TWA in android/phone, so a signed
     release upgrades an installed TWA in place.
  3. Replace the manifest, strings, colours and themes with android_overlay/.
  4. Reuse the launcher icons and the notification icon from android/phone.
  5. Patch app/build.gradle(.kts): minSdk 21 (as the TWA), release signing from the TF_KEYSTORE_*
     environment variables (as android/phone), and a .debug suffix on debug builds so a debug
     APK installs next to the real app instead of replacing it.

It stops with a clear message when a patch does not apply (Flutter's template changed).
Run from anywhere: python3 flutter_app/tool/bootstrap_android.py
"""
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

APP_ID = 'com.tunisiaflicks.app'
ROOT = Path(__file__).resolve().parent.parent          # flutter_app/
REPO = ROOT.parent                                      # repository root
ANDROID = ROOT / 'android'
MARKER = ANDROID / '.tf-bootstrapped'
OVERLAY = ROOT / 'android_overlay'
PHONE_RES = REPO / 'android' / 'phone' / 'src' / 'main' / 'res'


def fail(message):
    sys.exit('bootstrap_android: ' + message)


def create_android_project():
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ['flutter', 'create', '--platforms=android', '--org', 'com.tunisiaflicks',
             '--project-name', 'tunisiaflicks', tmp],
            check=True,
        )
        shutil.copytree(Path(tmp) / 'android', ANDROID)


def write_main_activity():
    main = ANDROID / 'app' / 'src' / 'main'
    for name in ('kotlin', 'java'):
        shutil.rmtree(main / name, ignore_errors=True)
    target = main / 'kotlin' / 'com' / 'tunisiaflicks' / 'app'
    target.mkdir(parents=True)
    (target / 'MainActivity.kt').write_text(
        'package com.tunisiaflicks.app\n\n'
        'import io.flutter.embedding.android.FlutterActivity\n\n'
        'class MainActivity : FlutterActivity()\n'
    )


def apply_overlay():
    main = ANDROID / 'app' / 'src' / 'main'
    shutil.copy(OVERLAY / 'AndroidManifest.xml', main / 'AndroidManifest.xml')
    res = main / 'res'
    # The generated night theme would override the black launch theme.
    shutil.rmtree(res / 'values-night', ignore_errors=True)
    for name in ('strings.xml', 'colors.xml', 'styles.xml'):
        shutil.copy(OVERLAY / 'res' / 'values' / name, res / 'values' / name)


def copy_icons():
    if not PHONE_RES.exists():
        print('bootstrap_android: android/phone resources not found; keeping the default icons')
        return
    main_res = ANDROID / 'app' / 'src' / 'main' / 'res'
    for folder in PHONE_RES.iterdir():
        if folder.name.startswith('mipmap-'):
            (main_res / folder.name).mkdir(exist_ok=True)
            for icon in folder.iterdir():
                shutil.copy(icon, main_res / folder.name / icon.name)
    (main_res / 'drawable').mkdir(exist_ok=True)
    for name in ('ic_launcher_foreground.xml', 'ic_notification.xml'):
        source = PHONE_RES / 'drawable' / name
        if source.exists():
            shutil.copy(source, main_res / 'drawable' / name)


KTS_SIGNING = '''signingConfigs {
        create("release") {
            val keystorePath = System.getenv("TF_KEYSTORE_PATH")
            if (!keystorePath.isNullOrEmpty()) {
                storeFile = file(keystorePath)
                storePassword = System.getenv("TF_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("TF_KEY_ALIAS")
                keyPassword = System.getenv("TF_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        getByName("debug") {
            applicationIdSuffix = ".debug"
        }'''

GROOVY_SIGNING = '''signingConfigs {
        release {
            def keystorePath = System.getenv('TF_KEYSTORE_PATH')
            if (keystorePath) {
                storeFile file(keystorePath)
                storePassword System.getenv('TF_KEYSTORE_PASSWORD')
                keyAlias System.getenv('TF_KEY_ALIAS')
                keyPassword System.getenv('TF_KEY_PASSWORD')
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix '.debug'
        }'''


def patch_gradle():
    app = ANDROID / 'app'
    if (app / 'build.gradle.kts').exists():
        path, kts = app / 'build.gradle.kts', True
    elif (app / 'build.gradle').exists():
        path, kts = app / 'build.gradle', False
    else:
        fail('android/app/build.gradle(.kts) not found')
    text = path.read_text()

    def sub(pattern, replacement, label):
        nonlocal text
        text, count = re.subn(pattern, lambda _m: replacement, text, count=1)
        if count != 1:
            fail('could not patch %s in %s (Flutter template changed?)' % (label, path.name))

    sub(r'namespace\s*=?\s*["\'][^"\']+["\']', 'namespace = "%s"' % APP_ID, 'namespace')
    sub(r'applicationId\s*=?\s*["\'][^"\']+["\']', 'applicationId = "%s"' % APP_ID, 'applicationId')
    sub(r'minSdk(?:Version)?\s*=?\s*flutter\.minSdkVersion', 'minSdk = 21', 'minSdk')
    if kts:
        sub(r'signingConfig\s*=\s*signingConfigs\.getByName\("debug"\)',
            'signingConfig = if (System.getenv("TF_KEYSTORE_PATH").isNullOrEmpty()) '
            'signingConfigs.getByName("debug") else signingConfigs.getByName("release")',
            'release signing')
        sub(r'buildTypes\s*\{', KTS_SIGNING, 'buildTypes')
    else:
        sub(r'signingConfig\s+signingConfigs\.debug',
            "signingConfig (System.getenv('TF_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug)",
            'release signing')
        sub(r'buildTypes\s*\{', GROOVY_SIGNING, 'buildTypes')
    path.write_text(text)


def main():
    if MARKER.exists():
        print('bootstrap_android: already done')
        return
    if ANDROID.exists():
        shutil.rmtree(ANDROID)
    create_android_project()
    write_main_activity()
    apply_overlay()
    copy_icons()
    patch_gradle()
    MARKER.write_text('ok\n')
    print('bootstrap_android: done (%s)' % APP_ID)


if __name__ == '__main__':
    main()
