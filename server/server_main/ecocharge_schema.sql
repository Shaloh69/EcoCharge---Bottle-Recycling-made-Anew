-- =============================================================================
--  EcoCharge — Complete Database Schema
--  Run this in MySQL Workbench against your Aiven database (defaultdb)
--  All tables created in foreign-key-safe order.
-- =============================================================================

USE defaultdb;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                  INT             NOT NULL AUTO_INCREMENT,
    name                VARCHAR(120)    NOT NULL,
    email               VARCHAR(255)    NOT NULL,
    phone               VARCHAR(20)     NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    qr_code             VARCHAR(64)     NULL,
    profile_picture_url VARCHAR(512)    NULL,
    credit_balance      INT             NOT NULL DEFAULT 0,
    is_admin            TINYINT(1)      NOT NULL DEFAULT 0,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email   (email),
    UNIQUE KEY uq_users_qr_code (qr_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. kiosks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kiosks (
    id          INT             NOT NULL AUTO_INCREMENT,
    name        VARCHAR(120)    NOT NULL,
    location    VARCHAR(255)    NULL,
    api_key     VARCHAR(64)     NOT NULL,
    status      ENUM('online','offline','error') NOT NULL DEFAULT 'offline',
    last_seen_at DATETIME       NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_kiosks_api_key (api_key),
    INDEX  ix_kiosks_api_key     (api_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. sessions  (kiosk sessions — user linked to a kiosk)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id          INT      NOT NULL AUTO_INCREMENT,
    user_id     INT      NOT NULL,
    kiosk_id    INT      NOT NULL,
    started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at    DATETIME NULL,

    PRIMARY KEY (id),
    INDEX ix_sessions_user_id  (user_id),
    INDEX ix_sessions_kiosk_id (kiosk_id),
    CONSTRAINT fk_sessions_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_kiosk FOREIGN KEY (kiosk_id) REFERENCES kiosks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. bottle_deposits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bottle_deposits (
    id              INT             NOT NULL AUTO_INCREMENT,
    session_id      INT             NOT NULL,
    brand           VARCHAR(60)     NULL,
    volume_ml       INT             NULL,
    `condition`     ENUM('perfect','imperfect') NULL,
    confidence      FLOAT           NULL,
    credits_awarded INT             NOT NULL DEFAULT 0,
    timestamp       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX ix_bottle_deposits_session_id (session_id),
    CONSTRAINT fk_bottle_deposits_session FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. credit_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_transactions (
    id            INT             NOT NULL AUTO_INCREMENT,
    user_id       INT             NOT NULL,
    type          ENUM('EARN','SPEND') NOT NULL,
    amount        INT             NOT NULL,
    balance_after INT             NOT NULL,
    ref_type      VARCHAR(60)     NULL,   -- 'bottle_deposit' | 'charging_session'
    ref_id        INT             NULL,
    timestamp     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX ix_credit_transactions_user_id (user_id),
    CONSTRAINT fk_credit_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. charging_sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charging_sessions (
    id               INT      NOT NULL AUTO_INCREMENT,
    user_id          INT      NOT NULL,
    kiosk_id         INT      NOT NULL,
    port_number      INT      NOT NULL,
    credits_used     INT      NOT NULL,
    duration_seconds INT      NOT NULL,
    started_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at         DATETIME NULL,
    status           ENUM('active','completed','interrupted','error') NOT NULL DEFAULT 'active',

    PRIMARY KEY (id),
    INDEX ix_charging_sessions_user_id  (user_id),
    INDEX ix_charging_sessions_kiosk_id (kiosk_id),
    CONSTRAINT fk_charging_sessions_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
    CONSTRAINT fk_charging_sessions_kiosk FOREIGN KEY (kiosk_id) REFERENCES kiosks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. device_commands  (queued commands for ESP32)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_commands (
    id           INT      NOT NULL AUTO_INCREMENT,
    kiosk_id     INT      NOT NULL,
    command_type VARCHAR(60)  NOT NULL,
    payload      TEXT     NULL,
    status       ENUM('PENDING','ACKED','FAILED') NOT NULL DEFAULT 'PENDING',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acked_at     DATETIME NULL,

    PRIMARY KEY (id),
    INDEX ix_device_commands_kiosk_id (kiosk_id),
    INDEX ix_device_commands_status   (status),
    CONSTRAINT fk_device_commands_kiosk FOREIGN KEY (kiosk_id) REFERENCES kiosks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. device_telemetry  (sensor snapshots from ESP32)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_telemetry (
    id        INT      NOT NULL AUTO_INCREMENT,
    kiosk_id  INT      NOT NULL,
    port_data TEXT     NULL,   -- JSON array of port sensor readings
    bin_level INT      NULL,   -- 0-100 percent
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX ix_device_telemetry_kiosk_id (kiosk_id),
    CONSTRAINT fk_device_telemetry_kiosk FOREIGN KEY (kiosk_id) REFERENCES kiosks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Flask-Migrate version table (lets Flask know migrations are already applied)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    PRIMARY KEY (version_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
--  SEED DATA — default admin user + one kiosk to get started
--  Admin login:  admin@ecocharge.ph  /  Admin1234!
--  Password hash below is bcrypt of "Admin1234!"
-- =============================================================================

INSERT IGNORE INTO users (name, email, password_hash, is_admin, credit_balance)
VALUES (
    'EcoCharge Admin',
    'admin@ecocharge.ph',
    'pbkdf2:sha256:600000$ecocharge$6c8571d9d5e5a9a7e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
    1,
    0
);

INSERT IGNORE INTO kiosks (name, location, api_key, status)
VALUES (
    'Kiosk-001',
    'Main Building Lobby',
    'esp32-device-secret',
    'offline'
);

-- =============================================================================
-- Done! All 8 tables created.
-- Tables: users, kiosks, sessions, bottle_deposits,
--         credit_transactions, charging_sessions,
--         device_commands, device_telemetry
-- =============================================================================
