-- AlterTable: Add status tracking to bottle_deposits
-- This adds the DepositStatus enum column so credits are only awarded
-- after the bin sensor confirms the bottle landed.
ALTER TABLE `bottle_deposits`
  ADD COLUMN `status` ENUM('pending_bin', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending_bin';

-- CreateIndex
CREATE INDEX `bottle_deposits_status_idx` ON `bottle_deposits`(`status`);
