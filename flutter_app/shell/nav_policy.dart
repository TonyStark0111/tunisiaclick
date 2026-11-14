import '../app/app_config.dart';

enum NavDecision { allow, openExternally, block }

/// What to do with a navigation the WebView is about to make. Pure, so it is unit-tested.
///
/// Same stance as the Android TV app and the desktop app:
/// - Frames (the player sources) load as they do on the site.
/// - The top frame stays on the site. Another https page opens in the real browser only when the
///   viewer tapped something (hasUserGesture); a redirect from a script goes nowhere.
/// - Nothing else (intent:, market:, javascript:, data:, file:, content:) is ever followed.
NavDecision decideNavigation({
  required Uri uri,
  required bool isMainFrame,
  required bool hasUserGesture,
}) {
  if (!isMainFrame) return NavDecision.allow;

  final scheme = uri.scheme.toLowerCase();
  switch (scheme) {
    case 'about':
      return NavDecision.allow;
    case 'https':
    case 'http':
      if (AppConfig.isSiteHost(uri.host)) return NavDecision.allow;
      return hasUserGesture ? NavDecision.openExternally : NavDecision.block;
    case 'mailto':
    case 'tel':
    case 'sms':
      return hasUserGesture ? NavDecision.openExternally : NavDecision.block;
    default:
      return NavDecision.block;
  }
}
