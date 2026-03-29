# Store Readiness

This repository now includes the minimum app-side work needed to move toward App Store and Google Play submission:

- mobile bundle IDs and package names in `app.json`
- release asset placeholders in `assets/`
- `eas.json` build profiles
- in-app account deletion request flow
- draft privacy policy and account deletion policy content under `docs/`

Manual work still required before submission:

- replace placeholder support contact details in `docs/privacy-policy.md`
- publish the privacy policy and account deletion pages at public HTTPS URLs
- verify `com.ceptecari.mobile` is the final unique bundle/package identifier you want to keep
- create store listings, screenshots, descriptions, and final branded assets
- run Supabase migration deployment in the target project

