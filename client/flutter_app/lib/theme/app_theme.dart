import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

// ============================================================================
// EcoCharge Flutter Theme — Nature / Forest colour palette
//
// Consistent with kiosk_web and web_console:
//   Primary   — emerald green  (#16A34A / #4CAF50)
//   Secondary — teal / stream  (#14B8A6)
//   Success   — lime / growth  (#A3E635)
//   Warning   — amber / sun    (#F59E0B)
//   Danger    — coral / berry  (#F87171)
//
// Full colour scale exposed as static consts for use in custom widgets.
// Both light and dark ThemeData exported.
// ============================================================================

class AppColors {
  AppColors._();

  // ── Green scale ──────────────────────────────────────────────────────────
  static const Color green50  = Color(0xFFF0FDF4);
  static const Color green100 = Color(0xFFDCFCE7);
  static const Color green200 = Color(0xFFBBF7D0);
  static const Color green300 = Color(0xFF86EFAC);
  static const Color green400 = Color(0xFF4ADE80);
  static const Color green500 = Color(0xFF22C55E);
  static const Color green600 = Color(0xFF16A34A);
  static const Color green700 = Color(0xFF15803D);
  static const Color green800 = Color(0xFF166534);
  static const Color green900 = Color(0xFF14532D);
  static const Color green950 = Color(0xFF052E16);

  // ── Deep forest ──────────────────────────────────────────────────────────
  static const Color forest950 = Color(0xFF051A08);
  static const Color forest900 = Color(0xFF0A2E0F);
  static const Color forest800 = Color(0xFF1B5E20);
  static const Color forest700 = Color(0xFF2E7D32);
  static const Color forest600 = Color(0xFF388E3C);
  static const Color forest500 = Color(0xFF4CAF50);

  // ── Teal / stream water ───────────────────────────────────────────────────
  static const Color teal300 = Color(0xFF5EEAD4);
  static const Color teal400 = Color(0xFF2DD4BF);
  static const Color teal500 = Color(0xFF14B8A6);
  static const Color teal600 = Color(0xFF0D9488);
  static const Color teal700 = Color(0xFF0F766E);

  // ── Lime / new growth ────────────────────────────────────────────────────
  static const Color lime300 = Color(0xFFBEF264);
  static const Color lime400 = Color(0xFFA3E635);
  static const Color lime500 = Color(0xFF84CC16);
  static const Color lime600 = Color(0xFF65A30D);

  // ── Amber / dappled sunlight ──────────────────────────────────────────────
  static const Color amber200 = Color(0xFFFDE68A);
  static const Color amber300 = Color(0xFFFCD34D);
  static const Color amber400 = Color(0xFFFBBF24);
  static const Color amber500 = Color(0xFFF59E0B);
  static const Color amber600 = Color(0xFFD97706);
  static const Color amber700 = Color(0xFFB45309);

  // ── Honey ────────────────────────────────────────────────────────────────
  static const Color honey400 = Color(0xFFFDE047);
  static const Color honey500 = Color(0xFFEAB308);

  // ── Coral / berry ────────────────────────────────────────────────────────
  static const Color coral300 = Color(0xFFFCA5A5);
  static const Color coral400 = Color(0xFFF87171);
  static const Color coral500 = Color(0xFFEF4444);
  static const Color coral600 = Color(0xFFDC2626);

  // ── Sky / canopy blue ────────────────────────────────────────────────────
  static const Color sky300 = Color(0xFF7DD3FC);
  static const Color sky400 = Color(0xFF38BDF8);
  static const Color sky500 = Color(0xFF0EA5E9);
  static const Color sky600 = Color(0xFF0284C7);

  // ── Sage / muted green ───────────────────────────────────────────────────
  static const Color sage400 = Color(0xFF8FB49F);
  static const Color sage500 = Color(0xFF6B9E78);
  static const Color sage600 = Color(0xFF4A7C59);

  // ── Moss ─────────────────────────────────────────────────────────────────
  static const Color moss500 = Color(0xFF4A6741);
  static const Color moss600 = Color(0xFF354D2F);

  // ── Lavender / dawn mist ─────────────────────────────────────────────────
  static const Color lavender400 = Color(0xFFC084FC);
  static const Color lavender500 = Color(0xFFA855F7);

  // ── Bark / earth ─────────────────────────────────────────────────────────
  static const Color bark500 = Color(0xFF92400E);
  static const Color bark600 = Color(0xFF78350F);

  // ── Semantic aliases ─────────────────────────────────────────────────────
  static const Color primary   = forest500;   // #4CAF50
  static const Color primaryDark = green600;  // #16A34A
  static const Color secondary = teal500;     // #14B8A6
  static const Color success   = lime400;     // #A3E635
  static const Color warning   = amber500;    // #F59E0B
  static const Color danger    = coral400;    // #F87171
  static const Color dangerDark = coral600;   // #DC2626
}

// ============================================================================
// AppTheme
// ============================================================================
class AppTheme {
  AppTheme._();

  // ── Real, previously-missing aliases, found 2026-08-11: 13 files across the
  //    app reference AppTheme.primaryGreen/midGreen/lightGreen/danger, none of
  //    which were ever actually defined here — `flutter analyze` (never run
  //    before this session, since the SDK was assumed unavailable) fails hard
  //    on all 13. Mapped onto the real AppColors scale already used
  //    elsewhere, not new arbitrary hues. ──────────────────────────────────
  static const Color primaryGreen = AppColors.primaryDark; // #16A34A
  static const Color midGreen = AppColors.green500; // #22C55E
  static const Color lightGreen = AppColors.green400; // #4ADE80
  static const Color danger = AppColors.coral600; // #DC2626 - readable as text/badge on white

  // ── Light theme ──────────────────────────────────────────────────────────
  static ThemeData get light => _build(Brightness.light);

  // ── Dark theme ───────────────────────────────────────────────────────────
  static ThemeData get dark => _build(Brightness.dark);

  // ── Default (light) — kept for backwards compat ──────────────────────────
  static ThemeData get theme => light;

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final colorScheme = isDark
        ? ColorScheme(
            brightness: Brightness.dark,
            primary: AppColors.forest500,
            onPrimary: AppColors.green950,
            primaryContainer: AppColors.forest800,
            onPrimaryContainer: AppColors.green200,
            secondary: AppColors.teal500,
            onSecondary: AppColors.teal700,
            secondaryContainer: AppColors.teal700,
            onSecondaryContainer: AppColors.teal300,
            tertiary: AppColors.lime400,
            onTertiary: AppColors.moss600,
            tertiaryContainer: AppColors.lime600,
            onTertiaryContainer: AppColors.lime300,
            error: AppColors.coral400,
            onError: AppColors.green950,
            errorContainer: AppColors.coral600,
            onErrorContainer: AppColors.coral300,
            surface: AppColors.forest900,
            onSurface: AppColors.green50,
            surfaceContainerHighest: AppColors.forest800,
            onSurfaceVariant: AppColors.green200,
            outline: const Color(0xFF3A6B42),
            outlineVariant: const Color(0xFF22472A),
            shadow: Colors.black54,
            scrim: Colors.black54,
            inverseSurface: AppColors.green100,
            onInverseSurface: AppColors.forest900,
            inversePrimary: AppColors.green700,
          )
        : ColorScheme(
            brightness: Brightness.light,
            primary: AppColors.primaryDark,
            onPrimary: Colors.white,
            primaryContainer: AppColors.green100,
            onPrimaryContainer: AppColors.green800,
            secondary: AppColors.teal600,
            onSecondary: Colors.white,
            secondaryContainer: AppColors.teal300,
            onSecondaryContainer: AppColors.teal700,
            tertiary: AppColors.lime600,
            onTertiary: Colors.white,
            tertiaryContainer: AppColors.lime300,
            onTertiaryContainer: AppColors.moss600,
            error: AppColors.coral600,
            onError: Colors.white,
            errorContainer: AppColors.coral300,
            onErrorContainer: AppColors.coral600,
            surface: AppColors.green50,
            onSurface: AppColors.forest900,
            surfaceContainerHighest: AppColors.green100,
            onSurfaceVariant: AppColors.forest700,
            outline: AppColors.sage500,
            outlineVariant: AppColors.green200,
            shadow: Colors.black12,
            scrim: Colors.black26,
            inverseSurface: AppColors.forest800,
            onInverseSurface: AppColors.green100,
            inversePrimary: AppColors.green400,
          );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,

      // ── App bar ────────────────────────────────────────────────────────
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? AppColors.forest900 : AppColors.primaryDark,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
        ),
        titleTextStyle: const TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),

      // ── Scaffold ──────────────────────────────────────────────────────
      scaffoldBackgroundColor:
          isDark ? AppColors.forest950 : AppColors.green50,

      // ── Cards ─────────────────────────────────────────────────────────
      cardTheme: CardThemeData(
        color: isDark
            ? const Color(0x14FFFFFF)   // rgba(255,255,255,0.08)
            : Colors.white.withAlpha(204),
        shadowColor: isDark ? Colors.black54 : Colors.black12,
        elevation: isDark ? 0 : 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: isDark
                ? const Color(0x21FFFFFF)   // rgba(255,255,255,0.13)
                : const Color(0x1A166534),  // rgba(22,101,52,0.10)
            width: 1,
          ),
        ),
      ),

      // ── Elevated button ───────────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryDark,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.1,
          ),
          elevation: 0,
        ).copyWith(
          overlayColor: WidgetStateProperty.all(Colors.white12),
        ),
      ),

      // ── Filled button ─────────────────────────────────────────────────
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primaryDark,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),

      // ── Outlined button ───────────────────────────────────────────────
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor:
              isDark ? AppColors.green300 : AppColors.primaryDark,
          side: BorderSide(
            color: isDark ? AppColors.green400 : AppColors.primaryDark,
            width: 1.5,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),

      // ── Text button ───────────────────────────────────────────────────
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor:
              isDark ? AppColors.green300 : AppColors.primaryDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),

      // ── Input decoration ──────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark
            ? const Color(0x17FFFFFF)   // rgba(255,255,255,0.09)
            : Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: isDark
                ? const Color(0x21FFFFFF)
                : const Color(0xFFE5E7EB),
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: isDark
                ? const Color(0x21FFFFFF)
                : const Color(0xFFE5E7EB),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: isDark ? AppColors.green400 : AppColors.primaryDark,
            width: 2,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.coral500, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.coral400, width: 2),
        ),
        labelStyle: TextStyle(
          color: isDark ? AppColors.green300 : AppColors.forest700,
          fontWeight: FontWeight.w500,
        ),
        hintStyle: TextStyle(
          color: isDark
              ? AppColors.sage500.withAlpha(180)
              : AppColors.sage500,
        ),
        prefixIconColor:
            isDark ? AppColors.green400 : AppColors.primaryDark,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),

      // ── Bottom navigation bar ─────────────────────────────────────────
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        selectedItemColor:
            isDark ? AppColors.green400 : AppColors.primaryDark,
        unselectedItemColor:
            isDark ? AppColors.sage500 : Colors.grey.shade500,
        backgroundColor: isDark ? AppColors.forest900 : Colors.white,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
      ),

      // ── Chip ─────────────────────────────────────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: isDark
            ? const Color(0x21FFFFFF)
            : AppColors.green100,
        selectedColor: isDark ? AppColors.green800 : AppColors.green200,
        labelStyle: TextStyle(
          color: isDark ? AppColors.green200 : AppColors.forest800,
          fontWeight: FontWeight.w500,
        ),
        side: BorderSide(
          color: isDark ? AppColors.green700 : AppColors.green300,
          width: 1,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),

      // ── Divider ───────────────────────────────────────────────────────
      dividerTheme: DividerThemeData(
        color: isDark
            ? const Color(0x21FFFFFF)
            : const Color(0x1A166534),
        thickness: 1,
        space: 1,
      ),

      // ── List tile ─────────────────────────────────────────────────────
      listTileTheme: ListTileThemeData(
        iconColor: isDark ? AppColors.green400 : AppColors.primaryDark,
        textColor: isDark ? AppColors.green50 : AppColors.forest900,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),

      // ── SnackBar ──────────────────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        backgroundColor:
            isDark ? AppColors.forest800 : AppColors.forest900,
        contentTextStyle: const TextStyle(
          color: AppColors.green100,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        actionTextColor: AppColors.green300,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        elevation: 6,
      ),

      // ── Progress indicator ────────────────────────────────────────────
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: isDark ? AppColors.green400 : AppColors.primaryDark,
        linearTrackColor: isDark
            ? const Color(0x21FFFFFF)
            : AppColors.green100,
        circularTrackColor: isDark
            ? const Color(0x21FFFFFF)
            : AppColors.green100,
      ),

      // ── Switch ────────────────────────────────────────────────────────
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return Colors.white;
          }
          return isDark ? AppColors.sage500 : Colors.grey.shade400;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return isDark ? AppColors.green500 : AppColors.primaryDark;
          }
          return isDark
              ? const Color(0x33FFFFFF)
              : Colors.grey.shade300;
        }),
      ),

      // ── Dialog ────────────────────────────────────────────────────────
      dialogTheme: DialogThemeData(
        backgroundColor:
            isDark ? AppColors.forest800 : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        titleTextStyle: TextStyle(
          color: isDark ? AppColors.green100 : AppColors.forest900,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
        contentTextStyle: TextStyle(
          color: isDark ? AppColors.green200 : AppColors.forest700,
          fontSize: 14,
        ),
        elevation: 8,
      ),

      // ── FloatingActionButton ──────────────────────────────────────────
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: AppColors.primaryDark,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        elevation: 4,
      ),

      // ── TabBar ────────────────────────────────────────────────────────
      tabBarTheme: TabBarThemeData(
        labelColor:
            isDark ? AppColors.green300 : AppColors.primaryDark,
        unselectedLabelColor:
            isDark ? AppColors.sage500 : Colors.grey.shade500,
        indicatorColor:
            isDark ? AppColors.green400 : AppColors.primaryDark,
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle: const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 13),
        dividerColor: Colors.transparent,
      ),

      // ── Typography ────────────────────────────────────────────────────
      // "Clean Energy Reward" stack (docs/planning/02-design-mandate.md SS5):
      // Baloo 2 for display/headline/title (the rounded, friendly display
      // face confirmed by the real Figma reference, same family as
      // client/kiosk_web and client/web), IBM Plex Sans for body/label -
      // every color/weight/size choice below is unchanged from before,
      // google_fonts just layers the real family onto each existing style
      // rather than falling back to the platform default.
      textTheme: TextTheme(
        displayLarge: GoogleFonts.baloo2(
          textStyle: TextStyle(
            color: isDark ? AppColors.green50 : AppColors.forest900,
            fontWeight: FontWeight.w800,
          ),
        ),
        displayMedium: GoogleFonts.baloo2(
          textStyle: TextStyle(
            color: isDark ? AppColors.green50 : AppColors.forest900,
            fontWeight: FontWeight.w700,
          ),
        ),
        headlineLarge: GoogleFonts.baloo2(
          textStyle: TextStyle(
            color: isDark ? AppColors.green100 : AppColors.forest900,
            fontWeight: FontWeight.w700,
          ),
        ),
        headlineMedium: GoogleFonts.baloo2(
          textStyle: TextStyle(
            color: isDark ? AppColors.green100 : AppColors.forest800,
            fontWeight: FontWeight.w700,
          ),
        ),
        titleLarge: GoogleFonts.baloo2(
          textStyle: TextStyle(
            color: isDark ? AppColors.green100 : AppColors.forest800,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        titleMedium: GoogleFonts.baloo2(
          textStyle: TextStyle(
            color: isDark ? AppColors.green200 : AppColors.forest700,
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
        ),
        bodyLarge: GoogleFonts.ibmPlexSans(
          textStyle: TextStyle(
            color: isDark ? AppColors.green50 : AppColors.forest900,
            fontSize: 15,
          ),
        ),
        bodyMedium: GoogleFonts.ibmPlexSans(
          textStyle: TextStyle(
            color: isDark ? AppColors.green100 : AppColors.forest800,
            fontSize: 13,
          ),
        ),
        bodySmall: GoogleFonts.ibmPlexSans(
          textStyle: TextStyle(
            color: isDark ? AppColors.green200 : AppColors.sage600,
            fontSize: 12,
          ),
        ),
        labelLarge: GoogleFonts.ibmPlexSans(
          textStyle: TextStyle(
            color: isDark ? AppColors.green100 : AppColors.forest800,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  /// IBM Plex Mono, for every monetary amount, credit balance, and
  /// countdown — docs/planning/02-design-mandate.md SS5: "Credit balance is
  /// the hero number on Home — mono-tabular numerals." Flutter's TextTheme
  /// has no dedicated "mono" role, so numeric widgets opt in explicitly with
  /// `AppTheme.monoStyle(context)` rather than each screen picking its own
  /// font. `tabularFigures()` keeps digit widths equal so a changing balance
  /// doesn't visibly reflow character-by-character.
  static TextStyle monoStyle(
    BuildContext context, {
    double? fontSize,
    FontWeight fontWeight = FontWeight.w600,
    Color? color,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GoogleFonts.ibmPlexMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color ?? (isDark ? AppColors.green50 : AppColors.forest900),
    ).copyWith(
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }
}

// ============================================================================
// AppToast — thin SnackBar utility matching kiosk_web toast API
// ============================================================================
class AppToast {
  AppToast._();

  static void success(BuildContext context, String message,
      {String? title}) {
    _show(
      context,
      title: title ?? 'Success',
      message: message,
      icon: Icons.check_circle_rounded,
      iconColor: AppColors.green400,
      borderColor: AppColors.green700,
    );
  }

  static void error(BuildContext context, String message, {String? title}) {
    _show(
      context,
      title: title ?? 'Error',
      message: message,
      icon: Icons.error_rounded,
      iconColor: AppColors.coral400,
      borderColor: AppColors.coral600,
      duration: const Duration(seconds: 7),
    );
  }

  static void info(BuildContext context, String message, {String? title}) {
    _show(
      context,
      title: title ?? 'Info',
      message: message,
      icon: Icons.info_rounded,
      iconColor: AppColors.sky400,
      borderColor: AppColors.sky600,
      duration: const Duration(seconds: 5),
    );
  }

  static void warning(BuildContext context, String message, {String? title}) {
    _show(
      context,
      title: title ?? 'Warning',
      message: message,
      icon: Icons.warning_rounded,
      iconColor: AppColors.amber400,
      borderColor: AppColors.amber600,
      duration: const Duration(seconds: 6),
    );
  }

  static void _show(
    BuildContext context, {
    required String title,
    required String message,
    required IconData icon,
    required Color iconColor,
    required Color borderColor,
    Duration duration = const Duration(seconds: 4),
  }) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: duration,
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        elevation: 0,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        content: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.forest800,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: borderColor.withAlpha(100), width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(80),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(icon, color: iconColor, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: iconColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      message,
                      style: const TextStyle(
                        color: AppColors.green100,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
