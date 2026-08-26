-- Add ASSIGNED status to the document workflow

ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'assigned' AFTER 'routed';
