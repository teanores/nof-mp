set shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]
set quiet := true

default:
  just --list

status:
  git status --short --branch

install:
  npm install

dev:
  npm run dev

test:
  npm run test

test-identity:
  npm run test:identity

test-password-reset:
  npm --workspace @nof/nof-mp-web run test -- public-password-reset-route.test.ts password-reset-delivery.test.ts platform-password-reset-repository.test.ts password-reset-page.test.tsx internal-email-password-reset-route.test.ts

local-env:
  npm run local:identity-env

identity-env:
  npm run local:identity-env

local-users:
  npm run local:identity-users

identity-users:
  npm run local:identity-users

db-up:
  npm run local:db-up

db-down:
  npm run local:db-down

db-reset:
  npm run local:db-reset

db-logs:
  npm run local:db-logs

bootstrap-db:
  npm run local:bootstrap-db

seed-identity:
  $env:NOF_LOCAL_DATABASE_URL='postgresql://nof_local:nof_local@localhost:15432/nof_local'; npm run local:seed-identity

reset-identity:
  $env:NOF_LOCAL_DATABASE_URL='postgresql://nof_local:nof_local@localhost:15432/nof_local'; npm run local:reset-identity

local-ready:
  just db-up
  $env:NOF_LOCAL_DATABASE_URL='postgresql://nof_local:nof_local@localhost:15432/nof_local'; npm run local:seed-identity
  npm run test:identity

smoke-identity:
  just db-up
  $env:NOF_LOCAL_DATABASE_URL='postgresql://nof_local:nof_local@localhost:15432/nof_local'; npm run local:reset-identity
  $env:NOF_LOCAL_DATABASE_URL='postgresql://nof_local:nof_local@localhost:15432/nof_local'; npm run smoke:identity

check:
  npm run check

build:
  npm run build

verify:
  npm run test:identity
  npm run check
  npm run build
  git diff --check

release-brief:
  Write-Host "Prepare owner-facing release briefing before merge/deploy:"
  Write-Host "1. What changed"
  Write-Host "2. What was verified"
  Write-Host "3. What approval enables"
  Write-Host "4. Exact post-deploy UAT scenarios"
  Write-Host "5. Local identity gate result for account/auth changes"
  Write-Host "Run before account/auth deploy requests:"
  Write-Host "  just test-identity"
  Write-Host "  just local-ready"

deploy-command ref:
  Write-Host "Production deploy is gated by current-chat owner approval."
  Write-Host "After approval, use nof-infra release-builder for service nof-mp and ref {{ref}}."
  Write-Host "SSH command:"
  Write-Host 'ssh nofadminhbl@192.168.1.51 "/opt/nof-release-builder/nof-release-builder.sh deploy nof-mp {{ref}}"'
