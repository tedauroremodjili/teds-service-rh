-- DropForeignKey
ALTER TABLE `document_sales` DROP FOREIGN KEY `document_sales_seller_id_fkey`;

-- AlterTable
ALTER TABLE `document_sales` MODIFY `seller_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `document_sales` ADD CONSTRAINT `document_sales_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
