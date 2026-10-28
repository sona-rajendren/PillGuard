import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../api.dart';
import '../notifications.dart';

void toast(BuildContext c, String m) => ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(m)));

class PatientHome extends StatefulWidget {
  const PatientHome({super.key});
  @override
  State<PatientHome> createState() => _PatientHomeState();
}

class _PatientHomeState extends State<PatientHome> {
  int tab = 0;

  Future<void> _addCaregiver() async {
    final ctl = TextEditingController();
    final email = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Link a caregiver'),
        content: TextField(controller: ctl, decoration: const InputDecoration(labelText: 'Caregiver email')),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, ctl.text.trim()), child: const Text('Link'))],
      ),
    );
    if (email == null || email.isEmpty) return;
    try {
      await Api.post('/patients/${Api.user['_id']}/caregivers', {'email': email});
      if (mounted) toast(context, 'Caregiver linked');
    } catch (e) {
      if (mounted) toast(context, '$e');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(['Today', 'Vitals', 'AI tools'][tab]),
          actions: [
            IconButton(icon: const Icon(Icons.group_add), tooltip: 'Add caregiver', onPressed: _addCaregiver),
            IconButton(icon: const Icon(Icons.logout), tooltip: 'Logout', onPressed: Api.logout),
          ],
        ),
        body: [const TodayTab(), const VitalsTab(), const AiTab()][tab],
        bottomNavigationBar: NavigationBar(
          selectedIndex: tab,
          onDestinationSelected: (i) => setState(() => tab = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.alarm), label: 'Today'),
            NavigationDestination(icon: Icon(Icons.monitor_heart), label: 'Vitals'),
            NavigationDestination(icon: Icon(Icons.auto_awesome), label: 'AI tools'),
          ],
        ),
      );
}

// ---------------- Today: reminders + blister confirmation ----------------
class TodayTab extends StatefulWidget {
  const TodayTab({super.key});
  @override
  State<TodayTab> createState() => _TodayTabState();
}

class _TodayTabState extends State<TodayTab> {
  List doses = [];
  bool loading = true;
  String? err;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final d = await Api.get('/doses/today') as List;
      await Notifier.scheduleDoses(d);
      if (mounted) setState(() { doses = d; loading = false; err = null; });
    } catch (e) {
      if (mounted) setState(() { err = '$e'; loading = false; });
    }
  }

  Future<void> confirm(Map d, {bool photo = true}) async {
    try {
      dynamic r;
      if (photo) {
        final img = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 70, maxWidth: 1280);
        if (img == null) return;
        r = await Api.upload('/doses/${d['_id']}/confirm', 'photo', img.path);
      } else {
        r = await Api.post('/doses/${d['_id']}/confirm', {});
      }
      if (mounted) toast(context, r['aiVerified'] == true ? 'Dose confirmed - verified by AI ✓' : 'Dose recorded');
      load();
    } catch (e) {
      if (mounted) toast(context, '$e');
    }
  }

  Future<void> skip(Map d) async {
    try { await Api.post('/doses/${d['_id']}/skip', {}); load(); } catch (e) { if (mounted) toast(context, '$e'); }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(padding: const EdgeInsets.all(12), children: [
        if (err != null) Text(err!, style: const TextStyle(color: Colors.red)),
        if (doses.isEmpty && err == null) const Padding(padding: EdgeInsets.all(32), child: Center(child: Text('No doses scheduled today.\nYour doctor will add prescriptions.', textAlign: TextAlign.center))),
        for (final d in doses) _tile(d),
      ]),
    );
  }

  Widget _tile(Map d) {
    final st = d['status'] as String;
    final time = DateFormat.jm().format(DateTime.parse(d['scheduledAt']).toLocal());
    final (icon, color) = switch (st) {
      'taken' => (Icons.check_circle, Colors.green),
      'missed' => (Icons.cancel, Colors.red),
      'skipped' => (Icons.remove_circle, Colors.orange),
      _ => (Icons.schedule, Colors.blueGrey),
    };
    return Card(
      child: ListTile(
        leading: Icon(icon, color: color, size: 32),
        title: Text('${d['drugName']} ${d['dose'] ?? ''}'),
        subtitle: Text('$time · $st${d['aiVerified'] == true ? ' · AI verified' : ''}'),
        trailing: (st == 'pending' || st == 'missed')
            ? Row(mainAxisSize: MainAxisSize.min, children: [
                IconButton(icon: const Icon(Icons.photo_camera), tooltip: 'Confirm with blister photo', onPressed: () => confirm(d)),
                IconButton(icon: const Icon(Icons.check), tooltip: 'Confirm without photo', onPressed: () => confirm(d, photo: false)),
                if (st == 'pending') IconButton(icon: const Icon(Icons.skip_next), tooltip: 'Skip', onPressed: () => skip(d)),
              ])
            : null,
      ),
    );
  }
}

// ---------------- Vitals logging ----------------
class VitalsTab extends StatefulWidget {
  const VitalsTab({super.key});
  @override
  State<VitalsTab> createState() => _VitalsTabState();
}

class _VitalsTabState extends State<VitalsTab> {
  String type = 'glucose';
  final glucose = TextEditingController(), sys = TextEditingController(), dia = TextEditingController();
  List history = [];

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final h = await Api.get('/vitals/${Api.user['_id']}?days=14') as List;
      if (mounted) setState(() => history = h.reversed.toList());
    } catch (_) {}
  }

  Future<void> save() async {
    try {
      final body = type == 'glucose'
          ? {'type': 'glucose', 'value': double.tryParse(glucose.text)}
          : {'type': 'bp', 'systolic': int.tryParse(sys.text), 'diastolic': int.tryParse(dia.text)};
      final r = await Api.post('/vitals', body);
      glucose.clear(); sys.clear(); dia.clear();
      if (mounted) toast(context, r['alert'] != null ? '⚠ Reading is out of range - your doctor was alerted' : 'Reading saved');
      load();
    } catch (e) {
      if (mounted) toast(context, '$e');
    }
  }

  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
        SegmentedButton<String>(
          segments: const [ButtonSegment(value: 'glucose', label: Text('Glucose'), icon: Icon(Icons.bloodtype)), ButtonSegment(value: 'bp', label: Text('Blood pressure'), icon: Icon(Icons.favorite))],
          selected: {type},
          onSelectionChanged: (s) => setState(() => type = s.first),
        ),
        const SizedBox(height: 12),
        if (type == 'glucose')
          TextField(controller: glucose, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Glucose (mg/dL)', border: OutlineInputBorder()))
        else
          Row(children: [
            Expanded(child: TextField(controller: sys, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Systolic', border: OutlineInputBorder()))),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: dia, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Diastolic', border: OutlineInputBorder()))),
          ]),
        const SizedBox(height: 12),
        FilledButton(onPressed: save, child: const Text('Save reading')),
        const Divider(height: 32),
        const Text('Recent readings', style: TextStyle(fontWeight: FontWeight.bold)),
        for (final v in history)
          ListTile(
            dense: true,
            leading: Icon(v['type'] == 'glucose' ? Icons.bloodtype : Icons.favorite),
            title: Text(v['type'] == 'glucose' ? '${v['value']} mg/dL' : '${v['systolic']}/${v['diastolic']} mmHg'),
            subtitle: Text(DateFormat('d MMM, h:mm a').format(DateTime.parse(v['recordedAt']).toLocal())),
          ),
      ]);
}

// ---------------- AI tools: interaction checker + pill identifier ----------------
class AiTab extends StatefulWidget {
  const AiTab({super.key});
  @override
  State<AiTab> createState() => _AiTabState();
}

class _AiTabState extends State<AiTab> {
  final med = TextEditingController();
  Map? result;
  bool busy = false;

  Future<void> check() async {
    setState(() { busy = true; result = null; });
    try {
      final rxs = await Api.get('/prescriptions') as List;
      final existing = [for (final r in rxs) if (r['status'] == 'active') for (final d in r['drugs']) d['name']];
      final r = await Api.post('/ai/interaction-check', {'existingMeds': existing, 'newMed': med.text.trim()});
      setState(() => result = r);
    } catch (e) {
      if (mounted) toast(context, '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> identify() async {
    final img = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 70, maxWidth: 1280);
    if (img == null) return;
    setState(() { busy = true; result = null; });
    try {
      final r = await Api.upload('/ai/identify-pill', 'image', img.path);
      setState(() => result = {
            'severity': r['matchesPrescription'] == false ? 'major' : (r['matchesPrescription'] == true ? 'none' : 'unknown'),
            'summary': '${r['description'] ?? ''}\nLikely: ${r['likelyDrug'] ?? 'unknown'} (${r['confidence']} confidence)\n${r['matchesPrescription'] == false ? '⚠ Does not match your prescription!' : r['matchesPrescription'] == true ? '✓ Matches your prescription' : ''}',
            'disclaimer': r['disclaimer'],
          });
    } catch (e) {
      if (mounted) toast(context, '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Color _c(String? s) => switch (s) { 'major' => Colors.red.shade100, 'moderate' => Colors.orange.shade100, 'none' => Colors.green.shade100, _ => Colors.blueGrey.shade50 };

  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Drug interaction checker', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        TextField(controller: med, decoration: const InputDecoration(labelText: 'New medicine (e.g. Aspirin)', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        FilledButton.icon(onPressed: busy ? null : check, icon: const Icon(Icons.science), label: const Text('Check against my medicines')),
        const Divider(height: 32),
        const Text('Pill identifier', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        OutlinedButton.icon(onPressed: busy ? null : identify, icon: const Icon(Icons.photo_camera), label: const Text('Photograph a pill')),
        if (busy) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
        if (result != null)
          Card(
            color: _c(result!['severity']),
            margin: const EdgeInsets.only(top: 16),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (result!['severity'] != null) Text('Severity: ${result!['severity']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(result!['summary'] ?? ''),
                for (final d in (result!['details'] ?? [])) Text('• $d'),
                const SizedBox(height: 8),
                Text(result!['disclaimer'] ?? '', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
              ]),
            ),
          ),
      ]);
}
