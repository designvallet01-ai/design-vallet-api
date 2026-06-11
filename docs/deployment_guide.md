# Design Vallet - Deployment & Security Guide

This document contains step-by-step production setup guidelines for S3 permissions, MySQL schemas, Razorpay webhooks, and Flutter secure compilations.

---

## 1. Database Setup
Initialize the tables by running the schema script against your production MySQL server:

```bash
mysql -u root -p < database/schema.sql
# Populate demo data for testing
mysql -u root -p < database/seed.sql
```

Ensure indexes are verified and check foreign key constraints are mapping properly.

---

## 2. Storage Setup (AWS S3 or Cloudflare R2)
You require two storage buckets:

### Private Original Bucket (e.g. `design-vallet-originals-private`)
* **Purpose:** Stores original high-resolution uploads.
* **Access Control:** Block all public access. Only backend application IAM role has `PutObject` and `GetObject` permissions.
* **IAM Policy Example:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::design-vallet-originals-private/*"
    }
  ]
}
```

### Public Preview Bucket (e.g. `design-vallet-previews-public`)
* **Purpose:** Stores watermarked lower-resolution previews.
* **Access Control:** Enable public read actions on items.
* **Bucket Policy Example:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::design-vallet-previews-public/*"
    }
  ]
}
```

---

## 3. Razorpay Webhooks Configuration
To handle events like user app closure during payment captures:
1. Log in to the **Razorpay Dashboard**.
2. Navigate to **Settings** > **Webhooks**.
3. Select **Add New Webhook**.
4. Configure:
   * **Webhook URL:** `https://your-domain.com/api/payments/webhook`
   * **Secret:** Your custom secret (sets `RAZORPAY_WEBHOOK_SECRET` in `.env`).
   * **Active Events:** Select `payment.captured` and `payment.failed`.

---

## 4. Flutter Mobile Security Configuration

### A. SSL Certificate Pinning Fingerprint Extraction
To extract your production API server's SHA-256 certificate hash to place inside `lib/services/api_service.dart`:

```bash
openssl s_client -connect your-domain.com:443 -showcerts < /dev/null | openssl x509 -outform der | openssl dgst -sha256 -binary | openssl enc -base64
```

### B. Disable Screenshots & Screen Recording
Verify that the `android/app/src/main/kotlin/.../MainActivity.kt` file contains:

```kotlin
window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
```

This prevents Android layout screenshot captures, displaying a black frame on screenshot commands or screen recording logs.

### C. Build Production APK
Generate release-ready bundle packages:

```bash
cd mobile
flutter clean
flutter pub get
# Build optimized split-apks
flutter build apk --target-platform android-arm64 --split-per-abi
```

---

## 5. Backend Deployment (PM2 Ecosystem)
For server resilience, deployment is managed with `PM2` node processes:

Create `ecosystem.config.json` in `backend/`:

```json
{
  "apps": [
    {
      "name": "design-vallet-api",
      "script": "server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": 5000
      }
    }
  ]
}
```

Run process logs:
```bash
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```
