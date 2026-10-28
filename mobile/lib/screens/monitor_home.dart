import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api.dart';
import '../notifications.dart';
import 'patient_home.dart' show toast;

/// Home for doctors and caregivers: patient list + alert inbox (polls and notifies).
class MonitorHome extends StatefulWidget {
  const MonitorHome({super.key});
  @override
  State<MonitorHome> createState() => _MonitorHomeState();
}

class _MonitorHomeState extends State<MonitorHome> {
  int tab = 0;
  List patients = [], alerts = [];
  final Set<String> seen = {};
  bool first = true;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    load();
    timer = Timer.periodic(const Duration(seconds: 45), (_) => load());
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final p = await Api.get('/patients') as List;
      final a = await Api.get('/alerts?acknowledged=false') as List;
      for (final x in a) {
        if (seen.add(x['_id']) && !first) Notifier.show((x['_id'] as String).hashCode & 0x7fffffff, '⚠ ${x['type'].toString().replaceAll('_', ' ')}', x['message']);
      }
      first = false;
      if (mounted) setState(() { patients = p; alerts = a; });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(tab == 0 ? 'Patients' : 'Alerts'),
          actions: [IconButton(icon: const Icon(Icons.logout), onPressed: Api.logout)],
        ),
        body: RefreshIndicator(onRefresh: load, child: tab == 0 ? _patients() : _alerts()),
        bottomNavigationBar: NavigationBar(
          selectedIndex: tab,
          onDestinationSelected: (i) => setState(() => tab = i),
          destinations: [
            const NavigationDestination(icon: Icon(Icons.people), label: 'Patients'),
            NavigationDestination(icon: Badge(isLabelVisible: alerts.isNotEmpty, label: Text('${alerts.length}'), child: const Icon(Icons.notifications)), label: 'Alerts'),
          ],
        ),
      );

  Widget _patients() => ListView(padding: const EdgeInsets.all(12), children: [
        if (patients.isEmpty) const Padding(padding: EdgeInsets.all(32), child: Center(child: Text('No linked patients yet.'))),
        for (final p in patients)
          Card(
            child: ListTile(
              title: Text(p['name']),
              subtitle: Text((p['profile']['conditions'] as List).join(', ')),
              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(p['adherence'] == null ? 'No data' : '${p['adherence']}%', style: TextStyle(fontWeight: FontWeight.bold, color: p['adherence'] == null ? Colors.grey : p['adherence'] >= 85 ? Colors.green : p['adherence'] >= 60 ? Colors.orange : Colors.red)),
                if (p['openAlerts'] > 0) Text('${p['openAlerts']} alert(s)', style: const TextStyle(color: Colors.red, fontSize: 12)),
              ]),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PatientDetailScreen(patient: p))),
            ),
          ),
      ]);

  Widget _alerts() => ListView(padding: const EdgeInsets.all(12), children: [
        if (alerts.isEmpty) const Padding(padding: EdgeInsets.all(32), child: Center(child: Text('All clear ✅'))),
        for (final a in alerts)
          Card(
            color: a['severity'] == 'critical' ? Colors.red.shade50 : Colors.orange.shade50,
            child: ListTile(
              leading: Icon(a['type'] == 'missed_dose' ? Icons.alarm_off : Icons.warning_amber, color: a['severity'] == 'critical' ? Colors.red : Colors.orange),
              title: Text(a['message']),
              subtitle: Text(DateFormat('d MMM, h:mm a').format(DateTime.parse(a['createdAt']).toLocal())),
              trailing: TextButton(
                onPressed: () async {
                  try { await Api.put('/alerts/${a['_id']}/ack', {}); load(); } catch (e) { if (mounted) toast(context, '$e'); }
                },
                child: const Text('Ack'),
              ),
            ),
          ),
      ]);
}

class PatientDetailScreen extends StatefulWidget {
  final Map patient;
  const PatientDetailScreen({super.key, required this.patient});
  @override
  State<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<PatientDetailScreen> {
  List doses = [], vitals = [];
  String? err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = widget.patient['_id'];
    try {
      final d = await Api.get('/doses/today?patientId=$id') as List;
      final v = await Api.get('/vitals/$id?days=7') as List;
      if (mounted) setState(() { doses = d; vitals = v.reversed.take(10).toList(); });
    } catch (e) {
      if (mounted) setState(() => err = '$e');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(widget.patient['name'])),
        body: RefreshIndicator(
          onRefresh: _load,
          child: ListView(padding: const EdgeInsets.all(12), children: [
            if (err != null) Text(err!, style: const TextStyle(color: Colors.red)),
            Text('7-day adherence: ${widget.patient['adherence'] ?? '—'}%', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text("Today's doses", style: TextStyle(fontWeight: FontWeight.bold)),
            for (final d in doses)
              ListTile(
                dense: true,
                leading: Icon(d['status'] == 'taken' ? Icons.check_circle : d['status'] == 'missed' ? Icons.cancel : Icons.schedule,
                    color: d['status'] == 'taken' ? Colors.green : d['status'] == 'missed' ? Colors.red : Colors.blueGrey),
                title: Text('${d['drugName']} ${d['dose'] ?? ''}'),
                subtitle: Text('${DateFormat.jm().format(DateTime.parse(d['scheduledAt']).toLocal())} · ${d['status']}'),
              ),
            const Divider(),
            const Text('Latest vitals', style: TextStyle(fontWeight: FontWeight.bold)),
            for (final v in vitals)
              ListTile(
                dense: true,
                title: Text(v['type'] == 'glucose' ? 'Glucose ${v['value']} mg/dL' : 'BP ${v['systolic']}/${v['diastolic']}'),
                subtitle: Text(DateFormat('d MMM, h:mm a').format(DateTime.parse(v['recordedAt']).toLocal())),
              ),
          ]),
        ),
      );
}
