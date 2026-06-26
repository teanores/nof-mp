import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserProfilePage } from "@/components/UserProfilePage";
import { NOF_MP_FOOTER_MARKER } from "@/lib/platform-version";
import type { ForgeProject, ForgeServiceLink } from "@/lib/types";

const platformApi = vi.hoisted(() => ({
  changeProfilePassword: vi.fn(),
  fetchProfileServiceLinks: vi.fn(),
  fetchPlatformProjects: vi.fn(),
  fetchPortalSession: vi.fn(),
  unlinkProfileService: vi.fn(),
  updatePortalProfile: vi.fn(),
}));

vi.mock("@/lib/platform-api", () => platformApi);

const session = {
  authenticated: true,
  loginUrl: "/login",
  preferences: { language: "ru" as const },
  user: {
    createdAt: "2026-06-01T00:00:00.000Z",
    experience: 10,
    id: "user-1",
    lastSeen: "2026-06-02T00:00:00.000Z",
    username: "teanore",
  },
};

function project(overrides: Partial<ForgeProject>): ForgeProject {
  return {
    access: { allowed: false, reason: "not_granted" },
    createdAt: "2026-06-01T00:00:00.000Z",
    description: "Project",
    key: "nof-tt",
    name: "Task Tracker",
    status: "active",
    visibility: "registered",
    ...overrides,
  };
}

describe("user profile MCP access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
    platformApi.fetchPortalSession.mockResolvedValue(session);
    platformApi.changeProfilePassword.mockResolvedValue(undefined);
    platformApi.fetchPlatformProjects.mockResolvedValue([]);
    platformApi.fetchProfileServiceLinks.mockResolvedValue([]);
    platformApi.updatePortalProfile.mockResolvedValue({ aboutMe: "Описание обновлено", id: "user-1", username: "TeAnore" });
    platformApi.unlinkProfileService.mockResolvedValue({
      serviceKey: "nof-ht",
      serviceName: "Habit Tracker",
      status: "not_connected",
      canUnlink: false,
      openHref: "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
    });
  });

  it("hides MCP setup when the user has no accessible projects and no active tokens", async () => {
    render(<UserProfilePage />);

    await screen.findByRole("heading", { name: "Профиль" });
    await waitFor(() => expect(platformApi.fetchPlatformProjects).toHaveBeenCalled());

    expect(screen.queryByText("MCP-ключи доступа")).not.toBeInTheDocument();
    expect(screen.queryByText("Доступ агентов к проектам")).not.toBeInTheDocument();
    expect(screen.queryByText("НАСТРОЙКА MCP-КЛИЕНТОВ")).not.toBeInTheDocument();
  });

  it("renders the full profile from the server session without falling back to login", async () => {
    render(<UserProfilePage initialSession={session} />);

    await screen.findByRole("heading", { name: "teanore" });

    expect(platformApi.fetchPortalSession).not.toHaveBeenCalled();
    expect(screen.getByText("Основные параметры")).toBeInTheDocument();
    expect(screen.getByLabelText("Имя")).toHaveValue("teanore");
    expect(screen.getByLabelText("О себе")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Сохранить профиль" })).toBeDisabled();
    expect(screen.queryByText("Идентичность портала")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Персональные настройки" })).toBeInTheDocument();
    expect(screen.getByText("Безопасность аккаунта")).toBeInTheDocument();
    expect(screen.getByLabelText("Текущий пароль")).toHaveAttribute("name", "currentPassword");
    expect(screen.getByLabelText("Новый пароль")).toHaveAttribute("name", "newPassword");
    expect(screen.getByLabelText("Повтори новый пароль")).toHaveAttribute("name", "repeatedPassword");
    expect(screen.queryByText("Источник")).not.toBeInTheDocument();
    expect(screen.queryByText("SOURCE")).not.toBeInTheDocument();
    expect(screen.getByText("email:")).toBeInTheDocument();
    expect(screen.getByText("telegram:")).toBeInTheDocument();
    expect(screen.queryByText("Восстановление:")).not.toBeInTheDocument();
    expect(screen.queryByText("нужна реальная почта")).not.toBeInTheDocument();
    expect(screen.getByText("Уровень")).toBeInTheDocument();
    expect(screen.getByText("Ранг")).toBeInTheDocument();
    expect(screen.getByText("ID пользователя")).toBeInTheDocument();
    expect(screen.getByText("Создан")).toBeInTheDocument();
    expect(screen.getByText("Последний вход")).toBeInTheDocument();
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("SOURCE");
    expect(document.body).not.toHaveTextContent("EMAIL");
    expect(document.body).not.toHaveTextContent("TG");
    expect(document.body).not.toHaveTextContent("RECOVERY");
    expect(document.body).not.toHaveTextContent("LEVEL");
    expect(document.body).not.toHaveTextContent("RANK");
    expect(document.body).not.toHaveTextContent("USER ID");
    expect(document.body).not.toHaveTextContent("CREATED");
    expect(document.body).not.toHaveTextContent("LAST SEEN");
    expect(screen.queryByText("Требуется вход")).not.toBeInTheDocument();
    expect(screen.queryByText("Вход в платформу")).not.toBeInTheDocument();
  });

  it("lets the signed-in user edit their own profile display data", async () => {
    render(<UserProfilePage initialSession={session} />);

    await screen.findByRole("heading", { name: "teanore" });

    await userEvent.clear(screen.getByLabelText("Имя"));
    await userEvent.type(screen.getByLabelText("Имя"), "TeAnore");
    await userEvent.type(screen.getByLabelText("О себе"), "Описание обновлено");
    await userEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));

    await waitFor(() =>
      expect(platformApi.updatePortalProfile).toHaveBeenCalledWith({
        aboutMe: "Описание обновлено",
        username: "TeAnore",
      }),
    );
    expect(await screen.findByText("Профиль сохранён.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "TeAnore" })).toBeInTheDocument();
  });

  it("keeps account recovery diagnostics out of the regular user profile", async () => {
    render(
      <UserProfilePage
        initialSession={{
          ...session,
          user: {
            ...session.user,
            email: "owner@example.com",
          },
        }}
      />,
    );

    await screen.findByRole("heading", { name: "teanore" });

    expect(screen.queryByText("Восстановление:")).not.toBeInTheDocument();
    expect(screen.queryByText("доступно по email")).not.toBeInTheDocument();
  });

  it("uses public copy on the login-required profile fallback", async () => {
    platformApi.fetchPortalSession.mockResolvedValue({
      authenticated: false,
      loginUrl: "/login?next=%2Fprofile",
    });

    render(<UserProfilePage />);

    await screen.findByText("Вход в платформу");

    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login?next=%2Fprofile");
    expect(document.body).toHaveTextContent("Войди, чтобы открыть профиль, настройки и доступные разделы платформы.");
    expect(document.body).not.toHaveTextContent("Dragon Forge");
    expect(document.body).not.toHaveTextContent("Python");
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
  });

  it("uses the public login route when the session response has no login URL", async () => {
    platformApi.fetchPortalSession.mockResolvedValue({
      authenticated: false,
    });

    render(<UserProfilePage />);

    await screen.findByText("Вход в платформу");

    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login");
    expect(document.body).not.toHaveTextContent("192.168.1.51");
    expect(document.body).not.toHaveTextContent("30500");
  });

  it("shows MCP setup as a Task Tracker-owned handoff for granted tracker access", async () => {
    platformApi.fetchPlatformProjects.mockResolvedValue([
      project({ access: { allowed: true, reason: "member" }, key: "nof-tt", name: "Task Tracker" }),
      project({ access: { allowed: false, reason: "not_granted" }, key: "nof-mp", name: "NOF Main Platform" }),
    ]);

    render(<UserProfilePage />);

    await screen.findByText("MCP-ключи доступа");

    expect(screen.getByText("MCP-доступ агентов")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть управление MCP в Task Tracker" })).toHaveAttribute(
      "href",
      "https://task-tracker.forgath.ru/profile",
    );
    expect(screen.getByText("nof-tt")).toBeInTheDocument();
    expect(screen.queryByText("nof-mp")).not.toBeInTheDocument();
    expect(screen.getAllByText(/https:\/\/task-tracker\.forgath\.ru\/api\/mcp/)).toHaveLength(2);
    expect(screen.getByText(/nof-tt-mcp/)).toBeInTheDocument();
    expect(screen.getByText(/nof-mp не хранит и не показывает значения MCP-ключей/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ВЫПУСТИТЬ MCP-КЛЮЧ" })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("192.168.1.51");
    expect(document.body).not.toHaveTextContent("30510");
  });

  it("does not render legacy platform-stored MCP token inventory", async () => {
    platformApi.fetchPlatformProjects.mockResolvedValue([project({ access: { allowed: true, reason: "member" }, key: "nof-tt", name: "Task Tracker" })]);

    render(<UserProfilePage />);

    await screen.findByText("MCP-ключи доступа");

    expect(document.body).toHaveTextContent("хранилище секретов агента");
    expect(document.body).toHaveTextContent("HTTP MCP-сервер");
    expect(document.body).toHaveTextContent("Одна точка доступа Task Tracker принимает проектные ключи разных проектов.");
    expect(document.body).not.toHaveTextContent("NOF_TT_MCP_TOKEN");
    expect(document.body).not.toHaveTextContent("nof_tt_1234");
    expect(document.body).not.toHaveTextContent("secret storage");
    expect(document.body).not.toHaveTextContent("HTTP MCP server");
    expect(document.body).not.toHaveTextContent("project-scoped");
    expect(screen.queryByRole("heading", { name: "Сервисы платформы" })).not.toBeInTheDocument();
  });

  it("shows connected NOF services and allows unlinking a service account", async () => {
    platformApi.fetchProfileServiceLinks.mockResolvedValue([
      {
        serviceKey: "nof-ht",
        serviceName: "Habit Tracker",
        status: "connected",
        accountEmail: "habit@example.com",
        accountLabel: "Habit User",
        linkedAt: "2026-06-11T10:00:00.000Z",
        canUnlink: true,
        openHref: "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
      },
    ]);

    render(<UserProfilePage initialSession={session} />);

    await screen.findByRole("heading", { name: "Подключённые сервисы" });

    expect(screen.getByText("Habit Tracker")).toBeInTheDocument();
    expect(screen.getByText("Подключён")).toBeInTheDocument();
    expect(screen.getByText("habit@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть Habit Tracker" })).toHaveAttribute(
      "href",
      "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
    );

    await userEvent.click(screen.getByRole("button", { name: "Отключить Habit Tracker" }));

    await waitFor(() => expect(platformApi.unlinkProfileService).toHaveBeenCalledWith("nof-ht"));
    expect(screen.getByText("Не подключён")).toBeInTheDocument();
  });

  it("prevents duplicate service unlink requests while the unlink is pending", async () => {
    platformApi.fetchProfileServiceLinks.mockResolvedValue([
      {
        serviceKey: "nof-ht",
        serviceName: "Habit Tracker",
        status: "connected",
        accountEmail: "habit@example.com",
        accountLabel: "Habit User",
        linkedAt: "2026-06-11T10:00:00.000Z",
        canUnlink: true,
        openHref: "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
      },
    ]);

    let resolveUnlink: (link: ForgeServiceLink) => void = () => undefined;
    platformApi.unlinkProfileService.mockReturnValue(
      new Promise<ForgeServiceLink>((resolve) => {
        resolveUnlink = resolve;
      }),
    );

    render(<UserProfilePage initialSession={session} />);

    const unlinkButton = await screen.findByRole("button", { name: "Отключить Habit Tracker" });

    await userEvent.click(unlinkButton);

    expect(await screen.findByRole("button", { name: "Отключаем связь Habit Tracker" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Отключаем связь Habit Tracker" }));
    expect(platformApi.unlinkProfileService).toHaveBeenCalledTimes(1);

    resolveUnlink({
      serviceKey: "nof-ht",
      serviceName: "Habit Tracker",
      status: "not_connected",
      accountEmail: undefined,
      accountLabel: undefined,
      linkedAt: undefined,
      canUnlink: false,
      openHref: "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
    });

    await waitFor(() => expect(screen.getByText("Не подключён")).toBeInTheDocument());
  });

  it("lets the signed-in user change the platform password from profile", async () => {
    render(<UserProfilePage initialSession={session} />);

    await screen.findByText("Безопасность аккаунта");

    expect(screen.getByText("Правила пароля")).toBeInTheDocument();
    expect(screen.getByText("Минимум 12 символов")).toBeInTheDocument();
    expect(screen.getByText("Есть строчная буква")).toBeInTheDocument();
    expect(screen.getByText("Есть заглавная буква")).toBeInTheDocument();
    expect(screen.getByText("Есть цифра")).toBeInTheDocument();
    expect(screen.getByText("Есть спецсимвол")).toBeInTheDocument();
    expect(screen.getByText("Нет пробелов и обратной кавычки")).toBeInTheDocument();
    expect(screen.getByText("Отличается от текущего пароля")).toBeInTheDocument();
    expect(screen.getByText("Повтор пароля совпадает")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Текущий пароль"), "CurrentHorse1!");
    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    await userEvent.click(screen.getByRole("button", { name: "Сменить пароль" }));

    await waitFor(() =>
      expect(platformApi.changeProfilePassword).toHaveBeenCalledWith({
        currentPassword: "CurrentHorse1!",
        newPassword: "NextHorse22!",
      }),
    );
    expect(screen.getByText("Пароль изменён. При следующем входе используй новый пароль.")).toBeInTheDocument();
  });

  it("updates the password checklist while the user types a new password", async () => {
    render(<UserProfilePage initialSession={session} />);

    await screen.findByText("Безопасность аккаунта");

    const submit = screen.getByRole("button", { name: "Сменить пароль" });
    const lengthRule = screen.getByText("Минимум 12 символов").closest("li");
    const digitRule = screen.getByText("Есть цифра").closest("li");
    const safeCharsRule = screen.getByText("Нет пробелов и обратной кавычки").closest("li");
    const repeatedMatchRule = screen.getByText("Повтор пароля совпадает").closest("li");

    expect(submit).toBeDisabled();
    expect(submit).not.toHaveClass("bg-forge-accent");
    expect(lengthRule).toHaveTextContent("-Минимум 12 символов");
    expect(digitRule).toHaveTextContent("-Есть цифра");
    expect(safeCharsRule).toHaveTextContent("+Нет пробелов и обратной кавычки");
    expect(repeatedMatchRule).toHaveTextContent("-Повтор пароля совпадает");

    await userEvent.type(screen.getByLabelText("Текущий пароль"), "CurrentHorse1!");
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");

    expect(lengthRule).toHaveTextContent("+Минимум 12 символов");
    expect(digitRule).toHaveTextContent("+Есть цифра");
    expect(safeCharsRule).toHaveTextContent("+Нет пробелов и обратной кавычки");
    expect(repeatedMatchRule).toHaveTextContent("-Повтор пароля совпадает");
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    expect(repeatedMatchRule).toHaveTextContent("+Повтор пароля совпадает");
    expect(submit).toBeEnabled();
    expect(submit).toHaveClass("bg-forge-accent");

    await userEvent.clear(screen.getByLabelText("Новый пароль"));
    await userEvent.type(screen.getByLabelText("Новый пароль"), "Next Horse22!");

    expect(safeCharsRule).toHaveTextContent("-Нет пробелов и обратной кавычки");
    expect(submit).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Повтори новый пароль"));
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "OtherHorse22!");
    expect(repeatedMatchRule).toHaveTextContent("-Повтор пароля совпадает");
    expect(submit).toBeDisabled();
  });

  it("lets users reveal profile password fields independently", async () => {
    render(<UserProfilePage initialSession={session} />);

    await screen.findByText("Безопасность аккаунта");

    const currentPassword = screen.getByLabelText("Текущий пароль");
    const newPassword = screen.getByLabelText("Новый пароль");
    const repeatedPassword = screen.getByLabelText("Повтори новый пароль");

    expect(currentPassword).toHaveAttribute("type", "password");
    expect(newPassword).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Показать текущий пароль" }));

    expect(currentPassword).toHaveAttribute("type", "text");
    expect(newPassword).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Показать новый пароль" }));
    await userEvent.click(screen.getByRole("button", { name: "Показать повтор пароля" }));

    expect(currentPassword).toHaveAttribute("type", "text");
    expect(newPassword).toHaveAttribute("type", "text");
    expect(repeatedPassword).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Скрыть текущий пароль" }));
    await userEvent.click(screen.getByRole("button", { name: "Скрыть новый пароль" }));
    await userEvent.click(screen.getByRole("button", { name: "Скрыть повтор пароля" }));

    expect(currentPassword).toHaveAttribute("type", "password");
    expect(newPassword).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");
  });

  it("does not call the password API when new passwords do not match", async () => {
    render(<UserProfilePage initialSession={session} />);

    await screen.findByText("Безопасность аккаунта");

    await userEvent.type(screen.getByLabelText("Текущий пароль"), "CurrentHorse1!");
    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "OtherHorse22!");

    expect(screen.getByRole("button", { name: "Сменить пароль" })).toBeDisabled();
    expect(platformApi.changeProfilePassword).not.toHaveBeenCalled();
  });

  it("does not call the password API when the new password equals the current password", async () => {
    render(<UserProfilePage initialSession={session} />);

    await screen.findByText("Безопасность аккаунта");

    await userEvent.type(screen.getByLabelText("Текущий пароль"), "CurrentHorse1!");
    await userEvent.type(screen.getByLabelText("Новый пароль"), "CurrentHorse1!");
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "CurrentHorse1!");

    expect(screen.getByText("Отличается от текущего пароля").closest("li")).toHaveTextContent("-Отличается от текущего пароля");

    expect(screen.getByRole("button", { name: "Сменить пароль" })).toBeDisabled();
    expect(platformApi.changeProfilePassword).not.toHaveBeenCalled();
  });

  it("shows a local password form error when the password API rejects the change", async () => {
    platformApi.changeProfilePassword.mockRejectedValue(new Error("invalid_current_password"));

    render(<UserProfilePage initialSession={session} />);

    await screen.findByText("Безопасность аккаунта");

    await userEvent.type(screen.getByLabelText("Текущий пароль"), "WrongHorse1!");
    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    await userEvent.click(screen.getByRole("button", { name: "Сменить пароль" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Текущий пароль указан неверно.");
  });
});
