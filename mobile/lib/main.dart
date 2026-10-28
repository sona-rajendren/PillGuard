import 'package:flutter/material.dart';
import 'api.dart';
import 'notifications.dart';
import 'screens/lock_gate.dart';
import 'screens/login.dart';
import 'screens/monitor_home.dart';
import 'screens/patient_home.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.load();
  await Notifier.init();
  runApp(const PillGuardApp());
}

class PillGuardApp extends StatelessWidget {
  const PillGuardApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'PillGuard',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorSchemeSeed: const Color(0xFF0F4C81), useMaterial3: true),
        home: ValueListenableBuilder<Map<String, dynamic>?>(
          valueListenable: Api.userN,
          builder: (_, u, __) => u == null
              ? const LoginScreen()
              : LockGate(child: u['role'] == 'patient' ? const PatientHome() : const MonitorHome()),
        ),
      );
}
