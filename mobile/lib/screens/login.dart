import 'package:flutter/material.dart';
import '../api.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _name = TextEditingController(), _email = TextEditingController(), _pass = TextEditingController(), _doc = TextEditingController();
  bool _register = false, _busy = false;
  String _role = 'patient';
  String? _err;

  Future<void> _submit() async {
    setState(() { _busy = true; _err = null; });
    try {
      if (_register) {
        await Api.register({
          'name': _name.text.trim(), 'email': _email.text.trim(), 'password': _pass.text, 'role': _role,
          if (_role == 'patient' && _doc.text.trim().isNotEmpty) 'doctorEmail': _doc.text.trim(),
        });
      } else {
        await Api.login(_email.text.trim(), _pass.text);
      }
    } catch (e) {
      setState(() => _err = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Icon(Icons.medication, size: 64, color: Color(0xFF0F4C81)),
                const Text('PillGuard', textAlign: TextAlign.center, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                const SizedBox(height: 24),
                if (_register) ...[
                  TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name', border: OutlineInputBorder())),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _role,
                    decoration: const InputDecoration(labelText: 'I am a', border: OutlineInputBorder()),
                    items: const ['patient', 'caregiver', 'doctor'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                    onChanged: (v) => setState(() => _role = v!),
                  ),
                  const SizedBox(height: 12),
                  if (_role == 'patient') ...[
                    TextField(controller: _doc, decoration: const InputDecoration(labelText: "Doctor's email (optional)", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                  ],
                ],
                TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _pass, obscureText: true, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder())),
                if (_err != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_err!, style: const TextStyle(color: Colors.red))),
                const SizedBox(height: 16),
                FilledButton(onPressed: _busy ? null : _submit, child: Text(_register ? 'Create account' : 'Sign in')),
                TextButton(
                  onPressed: () => setState(() { _register = !_register; _err = null; }),
                  child: Text(_register ? 'Have an account? Sign in' : 'New here? Register'),
                ),
              ]),
            ),
          ),
        ),
      );
}
