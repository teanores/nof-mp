# Shared Media Storage ADR

Status: accepted implementation baseline for nof-mp; production provisioning is owned by nof-infra.

## Decision

NOF user media uses self-hosted MinIO on home-bl through the S3-compatible API.

- One private bucket per service, starting with `nof-mp` and `nof-ht`.
- No public bucket listing.
- Browser uploads use short-lived server-signed presigned PUT URLs.
- Reads use short-lived server-signed presigned GET URLs.
- v1 accepts images only: `image/png`, `image/jpeg`, `image/webp`.
- v1 maximum object size is 5 MB.
- The application validates extension, MIME type and magic bytes before issuing an upload URL.
- Current initials/fallback avatars remain valid until profile avatar persistence is shipped.

## nof-mp API Draft

`POST /api/profile/avatar/upload-url`

Request JSON:

```json
{
  "fileName": "avatar.png",
  "contentType": "image/png",
  "sizeBytes": 1024,
  "magicBytesBase64": "iVBORw0KGgo="
}
```

Response JSON:

```json
{
  "bucket": "nof-mp",
  "objectKey": "avatars/<user-id>/<uuid>.png",
  "uploadUrl": "https://...",
  "expiresInSeconds": 300
}
```

`POST /api/profile/avatar/read-url`

Request JSON:

```json
{ "objectKey": "avatars/<user-id>/<uuid>.png" }
```

Response JSON:

```json
{
  "readUrl": "https://...",
  "expiresInSeconds": 300
}
```

## Runtime Names

Names only; do not store real values here.

- `NOF_MEDIA_S3_ENDPOINT`
- `NOF_MEDIA_S3_REGION`
- `NOF_MEDIA_S3_ACCESS_KEY_ID`
- `NOF_MEDIA_S3_SECRET_ACCESS_KEY`
- `NOF_MEDIA_S3_BUCKET_NOF_MP`

`NOF_MEDIA_S3_SECRET_ACCESS_KEY` is secret and must stay server-side.

## nof-infra Handoff

nof-infra owns:

- MinIO deployment and backup integration on home-bl;
- private `nof-mp` bucket provisioning;
- Kubernetes Secret/ConfigMap wiring for the runtime names above;
- production rollout runbook.

## Follow-Up

Persisting the selected avatar object key on the user profile requires a schema-backed profile field and owner-visible profile UX. Do not overload `about_me` or user preferences for this value.
