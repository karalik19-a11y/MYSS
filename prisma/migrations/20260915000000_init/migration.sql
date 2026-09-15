-- MYSS — начальная миграция

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'review', 'verified', 'published');
CREATE TYPE "Confidence" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "SourceType" AS ENUM ('interview', 'book', 'official_site', 'talk', 'podcast', 'documentary', 'article', 'archive', 'academic', 'public_profile', 'other');
CREATE TYPE "Reliability" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "SectionKind" AS ENUM ('summary', 'interesting', 'how', 'principles', 'habits', 'thinking', 'cases', 'mistakes', 'quotes', 'takeaways', 'today');
CREATE TYPE "FavoriteKind" AS ENUM ('person', 'quote', 'case_study', 'principle');
CREATE TYPE "Era" AS ENUM ('ancient', 'medieval', 'early_modern', 'modern', 'contemporary');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "languageCode" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_interests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "descriptor" TEXT,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "era" "Era" NOT NULL DEFAULT 'contemporary',
    "birthYear" INTEGER,
    "deathYear" INTEGER,
    "shortBio" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "confidence" "Confidence" NOT NULL DEFAULT 'medium',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "imageSource" TEXT,
    "imageCredit" TEXT,
    "imageAlt" TEXT,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "searchText" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "person_categories" (
    "personId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "person_categories_pkey" PRIMARY KEY ("personId", "categoryId")
);

CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "intro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_sections" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "kind" "SectionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "personId" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "url" TEXT,
    "publishedAt" TEXT,
    "type" "SourceType" NOT NULL DEFAULT 'other',
    "accessedAt" TIMESTAMP(3),
    "notes" TEXT,
    "reliability" "Reliability" NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "confidence" "Confidence" NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claim_sources" (
    "claimId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    CONSTRAINT "claim_sources_pkey" PRIMARY KEY ("claimId", "sourceId")
);

CREATE TABLE "facts" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "context" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "confidence" "Confidence" NOT NULL DEFAULT 'medium',
    "claimId" TEXT,
    CONSTRAINT "facts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "principles" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "confidence" "Confidence" NOT NULL DEFAULT 'medium',
    "claimId" TEXT,
    CONSTRAINT "principles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "habits" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "principleTag" TEXT,
    "timeOfDay" TEXT,
    "durationMin" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "confidence" "Confidence" NOT NULL DEFAULT 'medium',
    "claimId" TEXT,
    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "context" TEXT,
    "isVerbatim" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "confidence" "Confidence" NOT NULL DEFAULT 'medium',
    "sourceId" TEXT,
    "claimId" TEXT,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "year" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "confidence" "Confidence" NOT NULL DEFAULT 'medium',
    "claimId" TEXT,
    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mistakes" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "consequence" TEXT,
    "lesson" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "confidence" "Confidence" NOT NULL DEFAULT 'medium',
    "claimId" TEXT,
    CONSTRAINT "mistakes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "reason" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_completed_sections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_completed_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "FavoriteKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personId" TEXT,
    "quoteId" TEXT,
    "caseId" TEXT,
    "principleId" TEXT,
    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "wakeTime" TEXT NOT NULL,
    "sleepTime" TEXT NOT NULL,
    "constraints" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_routines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "routine_items" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "ideaSource" TEXT,
    "whyThisPerson" TEXT,
    "howAdapted" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "habitId" TEXT,
    CONSTRAINT "routine_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "personId" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");
CREATE INDEX "users_telegramId_idx" ON "users"("telegramId");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_slug_idx" ON "categories"("slug");
CREATE UNIQUE INDEX "user_interests_userId_categoryId_key" ON "user_interests"("userId", "categoryId");
CREATE INDEX "user_interests_userId_idx" ON "user_interests"("userId");
CREATE UNIQUE INDEX "people_slug_key" ON "people"("slug");
CREATE INDEX "people_slug_idx" ON "people"("slug");
CREATE INDEX "people_name_idx" ON "people"("name");
CREATE INDEX "people_country_idx" ON "people"("country");
CREATE INDEX "people_status_idx" ON "people"("status");
CREATE INDEX "people_era_idx" ON "people"("era");
CREATE INDEX "person_categories_categoryId_idx" ON "person_categories"("categoryId");
CREATE INDEX "person_categories_personId_idx" ON "person_categories"("personId");
CREATE UNIQUE INDEX "courses_personId_key" ON "courses"("personId");
CREATE UNIQUE INDEX "course_sections_courseId_kind_key" ON "course_sections"("courseId", "kind");
CREATE INDEX "course_sections_courseId_idx" ON "course_sections"("courseId");
CREATE INDEX "sources_personId_idx" ON "sources"("personId");
CREATE INDEX "claims_personId_idx" ON "claims"("personId");
CREATE INDEX "claims_status_idx" ON "claims"("status");
CREATE INDEX "facts_personId_idx" ON "facts"("personId");
CREATE INDEX "principles_personId_idx" ON "principles"("personId");
CREATE INDEX "habits_personId_idx" ON "habits"("personId");
CREATE INDEX "quotes_personId_idx" ON "quotes"("personId");
CREATE INDEX "cases_personId_idx" ON "cases"("personId");
CREATE INDEX "mistakes_personId_idx" ON "mistakes"("personId");
CREATE UNIQUE INDEX "recommendations_fromId_toId_key" ON "recommendations"("fromId", "toId");
CREATE INDEX "recommendations_fromId_idx" ON "recommendations"("fromId");
CREATE UNIQUE INDEX "user_progress_userId_personId_key" ON "user_progress"("userId", "personId");
CREATE INDEX "user_progress_userId_idx" ON "user_progress"("userId");
CREATE INDEX "user_progress_personId_idx" ON "user_progress"("personId");
CREATE UNIQUE INDEX "user_completed_sections_userId_sectionId_key" ON "user_completed_sections"("userId", "sectionId");
CREATE INDEX "user_completed_sections_userId_idx" ON "user_completed_sections"("userId");
CREATE UNIQUE INDEX "favorites_userId_kind_personId_quoteId_caseId_principleId_key" ON "favorites"("userId", "kind", "personId", "quoteId", "caseId", "principleId");
CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");
CREATE INDEX "daily_routines_userId_idx" ON "daily_routines"("userId");
CREATE INDEX "routine_items_routineId_idx" ON "routine_items"("routineId");
CREATE INDEX "usage_events_personId_createdAt_idx" ON "usage_events"("personId", "createdAt");
CREATE INDEX "usage_events_type_createdAt_idx" ON "usage_events"("type", "createdAt");

-- Индекс под поиск. Используется обычный btree, который работает на любой
-- сборке PostgreSQL и не требует расширений.
-- Для очень больших объёмов можно дополнительно включить триграммный индекс:
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
--   CREATE INDEX "people_searchText_trgm_idx"
--     ON "people" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "people_searchText_idx" ON "people" ("searchText");

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_categories" ADD CONSTRAINT "person_categories_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_categories" ADD CONSTRAINT "person_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sources" ADD CONSTRAINT "sources_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_sources" ADD CONSTRAINT "claim_sources_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_sources" ADD CONSTRAINT "claim_sources_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facts" ADD CONSTRAINT "facts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facts" ADD CONSTRAINT "facts_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "principles" ADD CONSTRAINT "principles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "principles" ADD CONSTRAINT "principles_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "habits" ADD CONSTRAINT "habits_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habits" ADD CONSTRAINT "habits_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_toId_fkey" FOREIGN KEY ("toId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_completed_sections" ADD CONSTRAINT "user_completed_sections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_completed_sections" ADD CONSTRAINT "user_completed_sections_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_principleId_fkey" FOREIGN KEY ("principleId") REFERENCES "principles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_routines" ADD CONSTRAINT "daily_routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_routines" ADD CONSTRAINT "daily_routines_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "daily_routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
