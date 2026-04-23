-- AlterTable: add EXPIRED to CommandStatus enum
ALTER TABLE `device_commands` MODIFY COLUMN `status` ENUM('PENDING', 'ACKED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';
