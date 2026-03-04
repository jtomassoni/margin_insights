-- CreateTable
CREATE TABLE "cost_snapshots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_snapshot_lines" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "unit_type" TEXT NOT NULL,
    "cost_per_unit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "cost_snapshot_lines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cost_snapshot_lines" ADD CONSTRAINT "cost_snapshot_lines_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "cost_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
