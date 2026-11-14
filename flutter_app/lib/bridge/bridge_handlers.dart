import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/app_config.dart';

DateTime _lastExternal = DateTime.fromMillisecondsSinceEpoch(0);

/// Opens a page in the real browser (or the mail / phone app). Only a few schemes, never twice in
/// a burst.
Future<void> openExternal(Uri uri) async {
  const allowed = {'https', 'http', 'mailto', 'tel', 'sms'};
  if (!allowed.contains(uri.scheme.toLowerCase())) return;
  final now = DateTime.now();
  if (now.difference(_lastExternal) < const Duration(milliseconds: 600)) return;
  _lastExternal = now;
  try {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    // No app to handle it: nothing to do.
  }
}

/// The handlers the injected script (and, later, the site's use-native-app hook) can call.
void registerBridgeHandlers(InAppWebViewController controller) {
  controller.addJavaScriptHandler(
    handlerName: 'tf.openExternal',
    callback: (args) async {
      if (args.isEmpty || args.first is! String) return false;
      final uri = Uri.tryParse(args.first as String);
      if (uri == null || !uri.hasScheme) return false;
      if (AppConfig.isSiteHost(uri.host)) return false;
      await openExternal(uri);
      return true;
    },
  );
}
