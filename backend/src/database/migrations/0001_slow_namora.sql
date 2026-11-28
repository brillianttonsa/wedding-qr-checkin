ALTER TABLE "invitations" DROP CONSTRAINT "invitations_guest_id_unique";--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "qr_file_name" varchar(255);--> statement-breakpoint
UPDATE "invitations" SET "qr_file_name" = 'invitation_' || "id"::text || '.png';--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "qr_file_name" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_qr_file_name_uq" ON "invitations" USING btree ("qr_file_name");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_one_active_per_guest_uq" ON "invitations" USING btree ("guest_id") WHERE "invitations"."status" = 'ACTIVE';