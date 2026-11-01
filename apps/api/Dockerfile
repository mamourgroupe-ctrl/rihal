# ==========================================
# Stage 1: Base Image
# ==========================================
FROM node:20-alpine AS base
# تثبيت pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# ==========================================
# Stage 2: Install Dependencies (Monorepo aware)
# ==========================================
FROM base AS deps
WORKDIR /app
# نسخ ملفات التعريف فقط للاستفادة من Docker Cache
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
# تثبيت كل الاعتماديات
RUN pnpm install --frozen-lockfile

# ==========================================
# Stage 3: Build the Application
# ==========================================
FROM base AS builder
WORKDIR /app
# نسخ الاعتماديات من المرحلة السابقة
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
# نسخ باقي كود المشروع
COPY . .
# بناء تطبيق الـ API
RUN pnpm --filter @rihal/api build
# تقليم الاعتماديات لتشمل اعتماديات الإنتاج فقط
RUN pnpm --filter @rihal/api prune --prod

# ==========================================
# Stage 4: Production Runner (Minimal Image)
# ==========================================
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# إنشاء مستخدم غير جذري (Non-root) لأغراض الأمان
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# نسخ الملفات المترجمة فقط من مرحلة البناء
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json

USER nestjs
EXPOSE 3000

# تشغيل التطبيق
CMD ["node", "dist/main.js"]
