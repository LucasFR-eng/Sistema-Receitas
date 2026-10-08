-- AlterTable
ALTER TABLE "users" ADD COLUMN "plan" INTEGER NOT NULL DEFAULT 0;

-- Só aceita os planos que existem: evita um valor errado ao mudar o plano direto pelo banco
ALTER TABLE "users" ADD CONSTRAINT "users_plan_check" CHECK ("plan" IN (0, 1, 2));
