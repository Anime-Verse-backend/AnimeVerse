# Configuration and Environment Variables

This file explains how to set up the necessary environment variables for the AnimeVerse application to run correctly, both for local development and for a live production deployment.

## What is a `.env` file?

A `.env` file is used to store secret keys and configuration variables that your application needs. This file is **private** and **should never be shared or committed to version control** (like Git). It allows you to have different settings for your local development environment and your live production server.

## Instructions

1.  **Create a new file** in the root directory of the project and name it `.env`.
2.  **Copy the variables** from the template below into your new `.env` file.
3.  **Replace the placeholder values** with your own actual settings. The examples below show how you might fill them for both a local setup and a cloud-based (production) setup.

---

## Environment Variables Template

Copy the following content into your `.env` file and fill in the values based on your setup.

```env
# ----------------------------------
# BACKEND (PYTHON/FLASK) CONFIGURATION
# ----------------------------------

# --- Database Connection ---
# These are the credentials for your MySQL database.
#
# LOCAL EXAMPLE:
# DB_USER=your_database_user
# DB_PASSWORD=your_database_password
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_NAME=anime_db
# DB_SSL_CA=
#
# CLOUD DATABASE EXAMPLE (e.g., from Aiven, PlanetScale):
# DB_USER=avnadmin
# DB_PASSWORD=your_database_password
# DB_HOST=your-project-name.a.aivencloud.com
# DB_PORT=27296
# DB_NAME=defaultdb
# DB_SSL_CA=ca.pem  # <-- For cloud deployments, you'll need to add this file as a "Secret File" in your hosting provider (like Render).

DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=defaultdb
DB_SSL_CA=

# --- Security ---
# A long, random, and secret string used for signing JWT tokens.
# See the section below on how to generate a secure key.
JWT_SECRET_KEY="a_very_long_and_super_secret_string_for_jwt"

# --- Initial Owner Account ---
# These credentials will be used to create or update the main owner account on startup.
# It is highly recommended to set these to secure, private values in production.
# If these variables are not set, the application will use default (insecure) credentials.
OWNER_EMAIL=owner@animeverse.com
OWNER_PASSWORD=strong_owner_password_123

# --- Email Service (Resend) - Optional ---
# Required for the "Forgot Password" feature to work.
# Get this from your Resend account dashboard.
RESEND_API_KEY=""
# This is the email address that will appear as the sender.
# If you are using Resend's free plan, you MUST use 'onboarding@resend.dev'.
# For custom domains, verify your domain in Resend and use your own email.
FROM_EMAIL="onboarding@resend.dev"


# ----------------------------------
# FRONTEND & BACKEND URLS
# ----------------------------------

# --- URL of your frontend app ---
# This is used to generate links in emails (e.g., password reset).
#
# LOCAL EXAMPLE: FRONTEND_URL="http://localhost:3000"
# PRODUCTION EXAMPLE (Vercel): FRONTEND_URL="https://your-frontend-app.vercel.app"
FRONTEND_URL="http://localhost:3000"

# --- URL of your backend API (For Frontend) ---
# This is the public web address where your Python backend is running.
# The Next.js app uses this to make API calls.
#
# LOCAL EXAMPLE: NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
# PRODUCTION EXAMPLE (Render): NEXT_PUBLIC_API_URL="https://your-backend-app.onrender.com"
NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"

# --- URL of your backend API (For Backend itself) ---
# This is needed so the backend can generate correct, absolute URLs for uploaded files.
# It MUST be the same value as NEXT_PUBLIC_API_URL.
#
# LOCAL EXAMPLE: BACKEND_PUBLIC_URL="http://127.0.0.1:8000"
# PRODUCTION EXAMPLE (Render): BACKEND_PUBLIC_URL="https://your-backend-app.onrender.com"
BACKEND_PUBLIC_URL="http://127.0.0.1:8000"

```

---

## How to Generate a Secure `JWT_SECRET_KEY`

This key is critical for security. It should be a long, random string that is impossible to guess. **Do not use a simple password.** Here are two easy ways to generate one:

### Method 1: Use an Online Generator (Easiest)

1. Go to a secure password generator website like [1Password's Generator](https://1password.com/password-generator/).
2. Set the length to be very long (e.g., 50+ characters).
3. Include numbers and symbols.
4. Copy the generated password and paste it as your `JWT_SECRET_KEY`.
   - **Example:** `JWT_SECRET_KEY="A9$f!z&k#Pq@5mE*bV7gH2jR8sL4wY1xZ^nC(uI)oO"`

### Method 2: Use Your Terminal

If you're comfortable with the command line, this is a great option.

1. Open your terminal (Command Prompt, PowerShell, or bash).
2. Run the following command:
   ```bash
   openssl rand -base64 32
   ```
3. Copy the output and paste it as your key.
   - **Example:** `JWT_SECRET_KEY="kZb/nQ3aWm+8qGjR7sL4wY1xZ^nC(uI)oO/pE="`

---

### Important Note on SSL for Cloud Databases

Cloud database providers like Aiven require a secure SSL connection. To enable this:

1.  **Download the CA Certificate:** Your database provider will give you a `ca.pem` file. Download it.
2.  **Add the Secret File:** When deploying your backend to a hosting service like Render, you will need to add this as a "Secret File".
    - **Filename:** `ca.pem`
    - **Contents:** Open the downloaded `ca.pem` file in a text editor. Copy the **entire contents** and paste it into the contents field. This **must** include the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines.
3.  **Set the Environment Variable:** In your `.env` file (or your hosting service's environment settings), set the `DB_SSL_CA` variable to the name of the file: `DB_SSL_CA=ca.pem`.

The application is already configured to use this file if the variable is set.
