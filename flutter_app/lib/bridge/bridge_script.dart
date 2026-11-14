import 'dart:convert';

import '../app/app_config.dart';

/// Injected at document start, top frame only (so a source's frame can never fake any of this).
///
/// 1. window.tunisiaflicksApp: what the site reads to know it runs in the app and what the app can
///    do (same idea as window.tunisiaflicksDesktop in the desktop app). Capabilities are added to
///    the list only when their Dart handler exists.
/// 2. Taps on links to other sites open in the real browser, like the desktop app does.
String buildBridgeScript({required String version}) {
  final host = jsonEncode(AppConfig.siteHost);
  final ver = jsonEncode(version);
  return '''
(function () {
  if (window.tunisiaflicksApp) return;
  var siteHost = $host;
  Object.defineProperty(window, 'tunisiaflicksApp', {
    value: Object.freeze({
      present: true,
      platform: 'android',
      version: $ver,
      capabilities: Object.freeze(['openExternal'])
    })
  });

  function call(name, arg) {
    var bridge = window.flutter_inappwebview;
    if (!bridge || typeof bridge.callHandler !== 'function') return false;
    bridge.callHandler(name, arg);
    return true;
  }

  document.addEventListener('click', function (event) {
    if (!event.isTrusted || event.defaultPrevented) return;
    var node = event.target;
    var anchor = node && node.closest ? node.closest('a[href]') : null;
    if (!anchor) return;
    var url;
    try { url = new URL(anchor.href, location.href); } catch (e) { return; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
    if (url.hostname === siteHost) return;
    if (call('tf.openExternal', url.href)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();
''';
}
