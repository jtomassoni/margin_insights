-- CreateTable
CREATE TABLE "liquor_variance_entries" (
    "id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "item_name" TEXT NOT NULL,
    "bought_bottles" INTEGER NOT NULL,
    "sold_bottles" INTEGER NOT NULL,
    "begin_on_hand_bottles" INTEGER,
    "end_on_hand_bottles" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquor_variance_entries_pkey" PRIMARY KEY ("id")
);
