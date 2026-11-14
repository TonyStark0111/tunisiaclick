import 'package:flutter_test/flutter_test.dart';
import 'package:tunisiaflicks/app/app_config.dart';
import 'package:tunisiaflicks/shell/nav_policy.dart';

void main() {
  final site = Uri.https(AppConfig.siteHost, '/movie/603');

  test('frames always load (the player sources)', () {
    expect(
      decideNavigation(uri: Uri.parse('https://player.example/embed/1'), isMainFrame: false, hasUserGesture: false),
      NavDecision.allow,
    );
  });

  test('the site stays in the app', () {
    expect(decideNavigation(uri: site, isMainFrame: true, hasUserGesture: false), NavDecision.allow);
  });

  test('another site opens in the browser only after a tap', () {
    final other = Uri.parse('https://example.com/');
    expect(decideNavigation(uri: other, isMainFrame: true, hasUserGesture: true), NavDecision.openExternally);
    expect(decideNavigation(uri: other, isMainFrame: true, hasUserGesture: false), NavDecision.block);
  });

  test('dangerous schemes are never followed', () {
    for (final raw in ['intent://x#Intent;end', 'market://details?id=a', 'javascript:alert(1)', 'data:text/html,hi', 'file:///etc/hosts']) {
      expect(decideNavigation(uri: Uri.parse(raw), isMainFrame: true, hasUserGesture: true), NavDecision.block, reason: raw);
    }
  });

  test('look-alike hosts are not the site', () {
    final fake = Uri.parse('https://${AppConfig.siteHost}.evil.example/');
    expect(decideNavigation(uri: fake, isMainFrame: true, hasUserGesture: false), NavDecision.block);
  });
}
