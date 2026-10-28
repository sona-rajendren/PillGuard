import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';

/// Biometric / device-credential app lock. Re-locks when the app goes to background.
class LockGate extends StatefulWidget {
  final Widget child;
  const LockGate({super.key, required this.child});
  @override
  State<LockGate> createState() => _LockGateState();
}

class _LockGateState extends State<LockGate> with WidgetsBindingObserver {
  final _auth = LocalAuthentication();
  bool _unlocked = false, _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _unlock();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (s == AppLifecycleState.paused && !_busy) setState(() => _unlocked = false);
    if (s == AppLifecycleState.resumed && !_unlocked) _unlock();
  }

  Future<void> _unlock() async {
    if (_busy) return;
    _busy = true;
    try {
      if (!await _auth.isDeviceSupported()) {
        if (mounted) setState(() => _unlocked = true); // no lock configured on device
        return;
      }
      final ok = await _auth.authenticate(
        localizedReason: 'Unlock PillGuard to view health data',
        options: const AuthenticationOptions(stickyAuth: true),
      );
      if (mounted) setState(() => _unlocked = ok);
    } catch (_) {
      // stay locked; user can retry
    } finally {
      _busy = false;
    }
  }

  @override
  Widget build(BuildContext context) => _unlocked
      ? widget.child
      : Scaffold(
          body: Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.lock, size: 64),
              const SizedBox(height: 12),
              const Text('PillGuard is locked', style: TextStyle(fontSize: 18)),
              const SizedBox(height: 16),
              FilledButton.icon(onPressed: _unlock, icon: const Icon(Icons.fingerprint), label: const Text('Unlock')),
            ]),
          ),
        );
}
