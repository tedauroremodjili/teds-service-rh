-- AlterTable
ALTER TABLE `document_products` ADD COLUMN `cost_price` DECIMAL(14, 2) NULL;

-- AlterTable
ALTER TABLE `document_sale_lines` ADD COLUMN `unit_cost` DECIMAL(14, 2) NULL;

-- AlterTable
ALTER TABLE `remuneration_rules` MODIFY `mode` ENUM('POURCENTAGE', 'MONTANT_FIXE', 'MARGE') NOT NULL;
