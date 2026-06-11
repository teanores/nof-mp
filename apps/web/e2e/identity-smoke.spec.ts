import crypto from "node:crypto";

import { expect, test } from "@playwright/test";

const localUserId = "10000000-0000-4000-8000-000000000003";
const localUsername = "local_user";
const authSecret = "nof-local-dragon-forge-secret-change-me";

function encodePart(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signAuthToken(payload: object, secret: string): string {
  const header = encodePart({ alg: "HS256", typ: "JWT" });
  const body = encodePart(payload);
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

test("profile account smoke: service links section and password change work locally", async ({ context, page }) => {
  const token = signAuthToken(
    {
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: localUserId,
      username: localUsername,
    },
    authSecret,
  );

  await context.addCookies([
    {
      domain: "127.0.0.1",
      httpOnly: true,
      name: "auth_token",
      path: "/",
      sameSite: "Lax",
      value: token,
    },
  ]);

  await page.goto("/profile");

  await expect(page.getByRole("heading", { name: "Профиль" })).toBeVisible();
  await expect(page.getByRole("heading", { name: localUsername })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Подключённые сервисы" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Habit Tracker" })).toBeVisible();
  await expect(page.getByText("Проверка недоступна")).toBeVisible();
  await expect(page.getByText("Безопасность аккаунта")).toBeVisible();

  await page.getByLabel("Текущий пароль").fill("UserLocal123!");
  await page.getByLabel("Новый пароль", { exact: true }).fill("UserLocal124!");
  await page.getByLabel("Повтори новый пароль").fill("UserLocal124!");
  await page.getByRole("button", { name: "Сменить пароль" }).click();

  await expect(page.getByText("Пароль изменён. При следующем входе используй новый пароль.")).toBeVisible();

  const oldPasswordResponse = await page.request.post("/api/profile/password", {
    data: {
      currentPassword: "UserLocal123!",
      newPassword: "UserLocal125!",
    },
  });
  expect(oldPasswordResponse.status()).toBe(400);
  await expect(oldPasswordResponse.json()).resolves.toMatchObject({ error: "invalid_current_password" });
});
