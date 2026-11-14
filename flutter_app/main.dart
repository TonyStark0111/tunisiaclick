import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'shell/shell_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Same look as the TWA: black system bars, any orientation (the player needs landscape).
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.black,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Colors.black,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  await SystemChrome.setPreferredOrientations(DeviceOrientation.values);

  if (kDebugMode) {
    await InAppWebViewController.setWebContentsDebuggingEnabled(true);
  }

  final info = await PackageInfo.fromPlatform();
  runApp(TunisiaFlicksApp(version: info.version));
}

class TunisiaFlicksApp extends StatelessWidget {
  const TunisiaFlicksApp({super.key, required this.version});

  final String version;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TunisiaFlicks',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true).copyWith(
        scaffoldBackgroundColor: Colors.black,
      ),
      home: ShellPage(version: version),
    );
  }
}
