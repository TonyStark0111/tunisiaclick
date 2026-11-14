import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// The branded screen shown when the site cannot be reached. It comes back by itself
/// (ShellPage reloads when the connection returns); the button is for the impatient.
class OfflineScreen extends StatelessWidget {
  const OfflineScreen({super.key, required this.onRetry});

  final VoidCallback onRetry;

  static const _texts = <String, List<String>>{
    'en': ['You’re offline', 'Check your connection. TunisiaFlicks will reload on its own.', 'Try again'],
    'fr': ['Vous êtes hors ligne', 'Vérifiez votre connexion. TunisiaFlicks se rechargera tout seul.', 'Réessayer'],
    'ar': ['لا يوجد اتصال', 'تحقق من اتصالك بالإنترنت. سيعيد TunisiaFlicks التحميل تلقائيًا.', 'إعادة المحاولة'],
  };

  @override
  Widget build(BuildContext context) {
    final code = ui.PlatformDispatcher.instance.locale.languageCode;
    final text = _texts[code] ?? _texts['en']!;
    return Directionality(
      textDirection: code == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: ColoredBox(
        color: Colors.black,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 56, color: Colors.white54),
                const SizedBox(height: 24),
                Text(text[0],
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text(text[1],
                    textAlign: TextAlign.center, style: const TextStyle(color: Colors.white60, fontSize: 14)),
                const SizedBox(height: 24),
                FilledButton(onPressed: onRetry, child: Text(text[2])),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
