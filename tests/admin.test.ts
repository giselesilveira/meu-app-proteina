import { describe, expect, it } from "vitest";
import { isAdminUser } from "@/lib/admin";
import { maskEmail, parseEmailList } from "@/lib/email";

const ENV = " Gisele@NutriGiseleSilveira.com.br , alinenmaia@outlook.com";
const confirmed = (email: string) => ({ email, email_confirmed_at: "2026-10-21T10:00:00Z" });

describe("ADMIN_EMAILS", () => {
  it("lê a lista tolerando espaços, maiúsculas e aspas", () => {
    expect(parseEmailList(ENV)).toEqual(["gisele@nutrigiselesilveira.com.br", "alinenmaia@outlook.com"]);
    expect(parseEmailList('"a@b.com", \'c@d.com\'')).toEqual(["a@b.com", "c@d.com"]);
    expect(parseEmailList(undefined)).toEqual([]);
  });

  it("reconhece admin com e-mail confirmado, sem depender de compra", () => {
    expect(isAdminUser(confirmed("gisele@nutrigiselesilveira.com.br"), ENV)).toBe(true);
    expect(isAdminUser(confirmed("ALINENMAIA@outlook.com"), ENV)).toBe(true);
  });

  it("nega quem não está na lista, e-mail não confirmado, sessão ausente ou lista vazia", () => {
    expect(isAdminUser(confirmed("aluna@example.com"), ENV)).toBe(false);
    expect(isAdminUser({ email: "gisele@nutrigiselesilveira.com.br", email_confirmed_at: null }, ENV)).toBe(false);
    expect(isAdminUser(null, ENV)).toBe(false);
    expect(isAdminUser(confirmed("gisele@nutrigiselesilveira.com.br"), "")).toBe(false);
    expect(isAdminUser(confirmed("gisele@nutrigiselesilveira.com.br.evil.com"), ENV)).toBe(false);
  });

  it("mascara e-mail nos logs", () => {
    expect(maskEmail("Gisele@nutrigiselesilveira.com.br")).toBe("gi***@nutrigiselesilveira.com.br");
    expect(maskEmail(null)).toBe("(sem e-mail)");
  });
});
