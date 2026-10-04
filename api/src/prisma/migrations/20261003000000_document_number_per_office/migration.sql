-- DropIndex
DROP INDEX "Document_documentNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Document_originatingOfficeId_documentNumber_key" ON "Document"("originatingOfficeId", "documentNumber");
