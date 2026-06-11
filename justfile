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

local-env:
  npm run local:identity-env

local-users:
  npm run local:identity-users

bootstrap-db:
  npm run local:bootstrap-db

seed-identity:
  npm run local:seed-identity

reset-identity:
  npm run local:reset-identity

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

deploy-command ref:
  Write-Host "Production deploy is gated by current-chat owner approval."
  Write-Host "After approval, use nof-infra release-builder for service nof-mp and ref {{ref}}."
  Write-Host "SSH command:"
  Write-Host 'ssh nofadminhbl@192.168.1.51 "/opt/nof-release-builder/nof-release-builder.sh deploy nof-mp {{ref}}"'
