import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_app/services/api_service.dart';
import 'package:flutter_app/theme/app_theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  ApiUser? _user;
  int _depositCount = 0;
  bool _uploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    Future.wait([ApiService.getMe(), ApiService.getMyDeposits()]).then((results) {
      if (mounted) {
        setState(() {
          _user = results[0] as ApiUser;
          _depositCount = (results[1] as List).length;
        });
      }
    }).catchError((_) {});
  }

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked == null || !mounted) return;

    setState(() => _uploadingAvatar = true);
    try {
      await ApiService.uploadAvatar(File(picked.path));
      final updated = await ApiService.getMe();
      if (mounted) setState(() => _user = updated);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile picture updated!'), backgroundColor: AppTheme.primaryGreen),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: ${e.toString().replaceFirst("Exception: ", "")}'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _signOut() async {
    await ApiService.clearToken();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final name = _user?.name ?? '—';
    final phone = _user?.phone ?? _user?.email ?? '—';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final avatarUrl = _user?.profilePictureUrl;

    final menuItems = [
      {'icon': '📋', 'label': 'Deposit History', 'route': '/history'},
      {'icon': '💳', 'label': 'My Credits', 'route': '/credits'},
      {'icon': '🏧', 'label': 'Nearby Kiosks', 'route': '/kiosks'},
      {'icon': '🔔', 'label': 'Notifications', 'route': null},
      {'icon': '⚙️', 'label': 'Account Settings', 'route': null},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            Container(
              color: AppTheme.primaryGreen,
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Column(children: [
                GestureDetector(
                  onTap: _uploadingAvatar ? null : _pickAndUploadAvatar,
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: Colors.white24,
                        backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                        child: avatarUrl == null
                            ? Text(initial, style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold))
                            : null,
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 24,
                          height: 24,
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: _uploadingAvatar
                              ? const Padding(
                                  padding: EdgeInsets.all(4),
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryGreen),
                                )
                              : const Icon(Icons.camera_alt, size: 14, color: AppTheme.primaryGreen),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Text(name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(phone, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                const SizedBox(height: 16),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  _StatBadge(value: '$_depositCount', label: 'Bottles'),
                  Container(width: 1, height: 32, color: Colors.white30, margin: const EdgeInsets.symmetric(horizontal: 20)),
                  _StatBadge(value: _user?.balanceLabel ?? '—', label: 'Balance'),
                ]),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8)],
                    ),
                    child: Column(
                      children: menuItems.asMap().entries.map((e) {
                        final item = e.value;
                        final isLast = e.key == menuItems.length - 1;
                        return Column(children: [
                          ListTile(
                            leading: Text(item['icon']! as String, style: const TextStyle(fontSize: 22)),
                            title: Text(item['label']! as String, style: const TextStyle(fontSize: 15)),
                            trailing: const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
                            onTap: item['route'] != null ? () => context.go(item['route']! as String) : null,
                          ),
                          if (!isLast) const Divider(height: 1, indent: 56),
                        ]);
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: _signOut,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.danger,
                        side: const BorderSide(color: AppTheme.danger),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Sign Out'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  final String value, label;
  const _StatBadge({required this.value, required this.label});
  @override
  Widget build(BuildContext context) => Column(children: [
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ]);
}
