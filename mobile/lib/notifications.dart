import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// Local pill reminders + on-device alert notifications.
class Notifier {
  static final _p = FlutterLocalNotificationsPlugin();
  static const _d = NotificationDetails(
    android: AndroidNotificationDetails('pills', 'Pill reminders', importance: Importance.max, priority: Priority.high),
    iOS: DarwinNotificationDetails(),
  );

  static Future<void> init() async {
    tzdata.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation(await FlutterTimezone.getLocalTimezone()));
    await _p.initialize(const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    ));
    final a = _p.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await a?.requestNotificationsPermission();
    await a?.requestExactAlarmsPermission();
  }

  /// Re-schedules a reminder for every still-pending dose of today.
  static Future<void> scheduleDoses(List doses) async {
    await _p.cancelAll();
    final now = tz.TZDateTime.now(tz.local);
    for (final d in doses) {
      if (d['status'] != 'pending') continue;
      final t = tz.TZDateTime.from(DateTime.parse(d['scheduledAt']).toLocal(), tz.local);
      if (t.isBefore(now)) continue;
      await _p.zonedSchedule(
        (d['_id'] as String).hashCode & 0x7fffffff,
        'Time for your medicine 💊',
        '${d['drugName']} ${d['dose'] ?? ''}'.trim(),
        t, _d,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      );
    }
  }

  static Future<void> show(int id, String title, String body) => _p.show(id, title, body, _d);
}
