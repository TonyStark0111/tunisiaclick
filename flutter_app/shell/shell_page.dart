import 'dart:async';
import 'dart:collection';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../app/app_config.dart';
import '../bridge/bridge_handlers.dart';
import '../bridge/bridge_script.dart';
import 'nav_policy.dart';
import 'offline_screen.dart';

/// The whole app for now: the site in a locked-down WebView, plus the native shell around it
/// (back button, offline screen, fullscreen video, popup policy).
class ShellPage extends StatefulWidget {
  const ShellPage({super.key, required this.version});

  final String version;

  @override
  State<ShellPage> createState() => _ShellPageState();
}

class _ShellPageState extends State<ShellPage> {
  InAppWebViewController? _controller;
  StreamSubscription<List<ConnectivityResult>>? _connectivity;
  bool _offline = false;
  bool _failed = false;

  late final InAppWebViewSettings _settings = InAppWebViewSettings(
    javaScriptEnabled: true,
    domStorageEnabled: true,
    databaseEnabled: true,
    // Players start without a tap, as in Chrome.
    mediaPlaybackRequiresUserGesture: false,
    allowsInlineMediaPlayback: true,
    // Popups: scripts cannot open windows; onCreateWindow decides for the rest.
    javaScriptCanOpenWindowsAutomatically: false,
    supportMultipleWindows: true,
    // Player frames and sign-in need their cookies.
    thirdPartyCookiesEnabled: true,
    mixedContentMode: MixedContentMode.MIXED_CONTENT_NEVER_ALLOW,
    allowFileAccess: false,
    allowContentAccess: false,
    geolocationEnabled: false,
    useShouldOverrideUrlLoading: true,
    disableDefaultErrorPage: true,
    transparentBackground: false,
    applicationNameForUserAgent: 'TunisiaFlicksApp/${widget.version}',
  );

  late final UserScript _bridge = UserScript(
    source: buildBridgeScript(version: widget.version),
    injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
    forMainFrameOnly: true,
  );

  @override
  void initState() {
    super.initState();
    _connectivity = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (online && _offline) _reload();
    });
  }

  @override
  void dispose() {
    _connectivity?.cancel();
    super.dispose();
  }

  void _reload() {
    final controller = _controller;
    if (controller == null) return;
    _failed = false;
    controller.loadUrl(urlRequest: URLRequest(url: WebUri(AppConfig.startUri.toString())));
  }

  /// Back asks the page first (window.tfAppBack(): closes a sheet or the player menu, true when
  /// it did), then goes back in history, then leaves the app.
  Future<void> _handleBack() async {
    final controller = _controller;
    if (controller == null || _offline) {
      await SystemNavigator.pop();
      return;
    }
    final handled = await controller.evaluateJavascript(
      source: "(typeof window.tfAppBack === 'function' && window.tfAppBack() === true)",
    );
    if (handled == true) return;
    if (await controller.canGoBack()) {
      await controller.goBack();
    } else {
      await SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleBack();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri(AppConfig.startUri.toString())),
                initialSettings: _settings,
                initialUserScripts: UnmodifiableListView([_bridge]),
                onWebViewCreated: (controller) {
                  _controller = controller;
                  registerBridgeHandlers(controller);
                },
                shouldOverrideUrlLoading: (controller, action) async {
                  final uri = action.request.url?.uriValue;
                  if (uri == null) return NavigationActionPolicy.CANCEL;
                  final decision = decideNavigation(
                    uri: uri,
                    isMainFrame: action.isForMainFrame,
                    hasUserGesture: action.hasGesture ?? false,
                  );
                  if (decision == NavDecision.openExternally) await openExternal(uri);
                  return decision == NavDecision.allow
                      ? NavigationActionPolicy.ALLOW
                      : NavigationActionPolicy.CANCEL;
                },
                // New windows never open. A link to the site itself loads in this view; anything
                // else is dropped (the bridge script already sent real taps to the browser).
                onCreateWindow: (controller, action) async {
                  final uri = action.request.url?.uriValue;
                  if (uri != null && AppConfig.isSiteHost(uri.host)) {
                    await controller.loadUrl(urlRequest: URLRequest(url: WebUri(uri.toString())));
                  }
                  return false;
                },
                onLoadStart: (controller, url) => _failed = false,
                onLoadStop: (controller, url) {
                  if (!_failed && _offline) setState(() => _offline = false);
                },
                onReceivedError: (controller, request, error) {
                  if (request.isForMainFrame ?? false) {
                    _failed = true;
                    if (!_offline) setState(() => _offline = true);
                  }
                },
                // Every permission refused, like the TV app (the site asks for none).
                onPermissionRequest: (controller, request) async => PermissionResponse(
                  resources: request.resources,
                  action: PermissionResponseAction.DENY,
                ),
                onRenderProcessGone: (controller, detail) => controller.reload(),
                onEnterFullscreen: (controller) {
                  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
                },
                onExitFullscreen: (controller) {
                  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
                },
              ),
              if (_offline) Positioned.fill(child: OfflineScreen(onRetry: _reload)),
            ],
          ),
        ),
      ),
    );
  }
}
