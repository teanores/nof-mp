import crypto from "node:crypto";

import { expect, test } from "@playwright/test";

const localUserId = "10000000-0000-4000-8000-000000000003";
const localUsername = "local_user";
const authSecret = "nof-local-nof-service-secret-change-me";

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

test("registration entry smoke stays local and exposes controlled fallback states", async ({ page }) => {
  await page.goto("/register");

  await expect(page.getByRole("heading", { name: "Стойка регистрации" })).toBeVisible();
  await expect(page.getByLabel("Логин")).toBeVisible();
  await expect(page.getByLabel("Электронная почта")).toBeVisible();
  await expect(page.getByLabel("Пароль", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Повтори пароль")).toBeVisible();
  await expect(page.getByRole("checkbox")).toBeDisabled();
  await expect(page.getByRole("link", { name: "Юридические аспекты" })).toHaveAttribute("href", "/legal");

  await page.getByRole("button", { name: "Показать пароль" }).click();
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveAttribute("type", "text");
  await expect(page.getByLabel("Повтори пароль")).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Скрыть пароль" }).click();
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Показать повтор пароля" }).click();
  await expect(page.getByLabel("Повтори пароль")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Скрыть повтор пароля" }).click();
  await expect(page.getByLabel("Повтори пароль")).toHaveAttribute("type", "password");

  await page.getByLabel("Логин").fill("local_new_user");
  await page.getByLabel("Электронная почта").fill("local-new@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("NewLocal123!");
  await page.getByLabel("Повтори пароль").fill("NewLocal123!");
  await page.getByRole("button", { name: "Получить код" }).click();

  await expect(page).toHaveURL(/\/register\?error=unavailable$/);
  await expect(page.getByText("Регистрация временно недоступна")).toBeVisible();
});
