-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `qr_code` VARCHAR(64) NULL,
    `profile_picture_url` VARCHAR(512) NULL,
    `credit_balance` INTEGER NOT NULL DEFAULT 0,
    `is_admin` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_qr_code_key`(`qr_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kiosks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `location` VARCHAR(255) NULL,
    `api_key` VARCHAR(64) NOT NULL,
    `status` ENUM('online', 'offline', 'error') NOT NULL DEFAULT 'offline',
    `last_seen_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `kiosks_api_key_key`(`api_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `kiosk_id` INTEGER NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,

    INDEX `sessions_user_id_idx`(`user_id`),
    INDEX `sessions_kiosk_id_idx`(`kiosk_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bottle_deposits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `brand` VARCHAR(60) NULL,
    `volume_ml` INTEGER NULL,
    `condition` ENUM('perfect', 'imperfect') NULL,
    `confidence` DOUBLE NULL,
    `credits_awarded` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('pending_bin', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending_bin',
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bottle_deposits_session_id_idx`(`session_id`),
    INDEX `bottle_deposits_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('EARN', 'SPEND') NOT NULL,
    `amount` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `ref_type` VARCHAR(60) NULL,
    `ref_id` INTEGER NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_transactions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `charging_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `kiosk_id` INTEGER NOT NULL,
    `port_number` INTEGER NOT NULL,
    `credits_used` INTEGER NOT NULL,
    `duration_seconds` INTEGER NOT NULL,
    `watt_snapshot` DOUBLE NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,
    `status` ENUM('active', 'completed', 'interrupted', 'error') NOT NULL DEFAULT 'active',

    INDEX `charging_sessions_user_id_idx`(`user_id`),
    INDEX `charging_sessions_kiosk_id_idx`(`kiosk_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device_commands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kiosk_id` INTEGER NOT NULL,
    `command_type` VARCHAR(60) NOT NULL,
    `payload` TEXT NULL,
    `status` ENUM('PENDING', 'ACKED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acked_at` DATETIME(3) NULL,

    INDEX `device_commands_kiosk_id_idx`(`kiosk_id`),
    INDEX `device_commands_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device_telemetry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kiosk_id` INTEGER NOT NULL,
    `port_data` TEXT NULL,
    `bin_level` INTEGER NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `device_telemetry_kiosk_id_idx`(`kiosk_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `key` VARCHAR(60) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_kiosk_id_fkey` FOREIGN KEY (`kiosk_id`) REFERENCES `kiosks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bottle_deposits` ADD CONSTRAINT `bottle_deposits_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charging_sessions` ADD CONSTRAINT `charging_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charging_sessions` ADD CONSTRAINT `charging_sessions_kiosk_id_fkey` FOREIGN KEY (`kiosk_id`) REFERENCES `kiosks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_commands` ADD CONSTRAINT `device_commands_kiosk_id_fkey` FOREIGN KEY (`kiosk_id`) REFERENCES `kiosks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_telemetry` ADD CONSTRAINT `device_telemetry_kiosk_id_fkey` FOREIGN KEY (`kiosk_id`) REFERENCES `kiosks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
