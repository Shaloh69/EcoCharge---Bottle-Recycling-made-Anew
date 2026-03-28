class MockUser {
  static const String name = 'Taylor Swift';
  static const String phone = '0123456789';
  static const String creditBalance = '5 min';
  static const int totalBottles = 24;
  static const int totalSessions = 12;
}

class DepositRecord {
  final String id, kiosk, brand, volume, condition, credit, time;
  final double confidence;
  final bool accepted;
  const DepositRecord({required this.id, required this.kiosk, required this.brand, required this.volume, required this.condition, required this.credit, required this.time, required this.confidence, required this.accepted});
}

class ChargingRecord {
  final String id, kiosk, port, duration, time;
  const ChargingRecord({required this.id, required this.kiosk, required this.port, required this.duration, required this.time});
}

const mockDeposits = [
  DepositRecord(id: 'D001', kiosk: 'Kiosk-001', brand: 'Coca-Cola', volume: '500ml', condition: 'Good', credit: '+1 min', time: 'Today 10:32 AM', confidence: 0.98, accepted: true),
  DepositRecord(id: 'D002', kiosk: 'Kiosk-002', brand: 'C2', volume: '350ml', condition: 'Good', credit: '+1 min', time: 'Today 10:28 AM', confidence: 0.95, accepted: true),
  DepositRecord(id: 'D003', kiosk: 'Kiosk-001', brand: 'Unknown', volume: 'Unknown', condition: 'Crushed', credit: 'Rejected', time: 'Today 10:15 AM', confidence: 0.41, accepted: false),
  DepositRecord(id: 'D004', kiosk: 'Kiosk-003', brand: 'Absolute', volume: '500ml', condition: 'Good', credit: '+1 min', time: 'Yesterday', confidence: 0.97, accepted: true),
];

const mockCharging = [
  ChargingRecord(id: 'CH001', kiosk: 'Kiosk-001', port: 'Station 2', duration: '1 min', time: 'Today 10:33 AM'),
  ChargingRecord(id: 'CH002', kiosk: 'Kiosk-003', port: 'Station 1', duration: '2 min', time: 'Yesterday'),
];

class KioskInfo {
  final String id, location, status;
  final int binLevel;
  const KioskInfo({required this.id, required this.location, required this.status, required this.binLevel});
}

const mockKiosks = [
  KioskInfo(id: 'Kiosk-001', location: 'Main Building Lobby', status: 'online', binLevel: 80),
  KioskInfo(id: 'Kiosk-002', location: 'Library Entrance', status: 'online', binLevel: 35),
  KioskInfo(id: 'Kiosk-003', location: 'Canteen Area', status: 'warning', binLevel: 92),
  KioskInfo(id: 'Kiosk-004', location: 'Student Center', status: 'offline', binLevel: 10),
];
