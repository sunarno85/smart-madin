-- CreateEnum
CREATE TYPE "PpdbStatus" AS ENUM ('BARU', 'VERIFIED', 'ACCEPTED', 'WAITLISTED', 'REJECTED', 'ENROLLED');

-- AlterTable
ALTER TABLE "academic_years" ADD COLUMN     "ppdb_open" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ppdb_registrations" (
    "id" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "target_year_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "nik" TEXT,
    "nisn" TEXT,
    "birth_place" TEXT,
    "birth_date" TIMESTAMP(3),
    "address" TEXT,
    "previous_school" TEXT,
    "father_name" TEXT,
    "mother_name" TEXT,
    "parent_phone" TEXT,
    "status" "PpdbStatus" NOT NULL DEFAULT 'BARU',
    "notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "student_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppdb_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ppdb_registrations_registration_number_key" ON "ppdb_registrations"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "ppdb_registrations_student_id_key" ON "ppdb_registrations"("student_id");

-- CreateIndex
CREATE INDEX "ppdb_registrations_target_year_id_idx" ON "ppdb_registrations"("target_year_id");

-- CreateIndex
CREATE INDEX "ppdb_registrations_status_idx" ON "ppdb_registrations"("status");

-- CreateIndex
CREATE INDEX "ppdb_registrations_full_name_idx" ON "ppdb_registrations"("full_name");

-- AddForeignKey
ALTER TABLE "ppdb_registrations" ADD CONSTRAINT "ppdb_registrations_target_year_id_fkey" FOREIGN KEY ("target_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppdb_registrations" ADD CONSTRAINT "ppdb_registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
