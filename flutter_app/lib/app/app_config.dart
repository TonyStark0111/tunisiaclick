/// Where the app points and which hosts it trusts. One place, easy to change per build:
/// flutter build apk --dart-define=TF_SITE_HOST=my-preview.vercel.app
class AppConfig {
  AppConfig._();

  static const String siteHost =
      String.fromEnvironment('TF_SITE_HOST', defaultValue: 'tunisiaflicks.vercel.app');

  /// ?source=android-app tells the site it runs in the app (no "get the app" offers there),
  /// exactly like the TWA's launch URL.
  static Uri get startUri => Uri.https(siteHost, '/', {'source': 'android-app'});

  static bool isSiteHost(String? host) => host != null && host.toLowerCase() == siteHost;
}
