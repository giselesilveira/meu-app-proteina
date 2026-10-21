import { describe, expect, it } from "vitest";
import {
  accessLastDay,
  accessPeriodEnd,
  accessState,
  addCalendarMonths,
  endOfAccessDay,
  formatAccessUntil,
  zonedMidnight,
} from "@/lib/access-period";

const sp = (iso: string) => new Date(`${iso}-03:00`); // horário de São Paulo (sem horário de verão desde 2019)

describe("6 meses de calendário a partir da aprovação", () => {
  it("dia comum", () => {
    expect(accessLastDay(sp("2026-03-15T14:30:00"))).toBe("2026-09-15");
    expect(formatAccessUntil(accessPeriodEnd(sp("2026-03-15T14:30:00")))).toBe("15/09/2026");
  });
  it("31 de agosto vira 28 de fevereiro em ano comum", () => {
    expect(accessLastDay(sp("2026-08-31T10:00:00"))).toBe("2027-02-28");
  });
  it("31 de agosto vira 29 de fevereiro em ano bissexto", () => {
    expect(accessLastDay(sp("2027-08-31T10:00:00"))).toBe("2028-02-29");
  });
  it("outros fins de mês", () => {
    expect(addCalendarMonths("2026-12-31", 6)).toBe("2027-06-30");
    expect(addCalendarMonths("2026-03-31", 6)).toBe("2026-09-30");
    expect(addCalendarMonths("2026-02-28", 6)).toBe("2026-08-28");
    expect(addCalendarMonths("2026-08-30", 6)).toBe("2027-02-28");
    expect(addCalendarMonths("2026-07-15", 6)).toBe("2027-01-15");
  });
  it("aprovação às 23h30 de São Paulo conta pela data local, não pela data UTC", () => {
    const late = sp("2026-08-31T23:30:00"); // já é 01/09 em UTC
    expect(late.toISOString()).toBe("2026-09-01T02:30:00.000Z");
    expect(accessLastDay(late)).toBe("2027-02-28");
  });
  it("o acesso vale até o fim do último dia (expira às 00h00 do dia seguinte em São Paulo)", () => {
    const end = accessPeriodEnd(sp("2026-03-15T14:30:00"));
    expect(end.toISOString()).toBe("2026-09-16T03:00:00.000Z");
    expect(endOfAccessDay("2028-02-29").toISOString()).toBe("2028-03-01T03:00:00.000Z");
    expect(zonedMidnight(2026, 1, 1).toISOString()).toBe("2026-01-01T03:00:00.000Z");
  });
});

describe("situação do acesso", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  it("ativo, expirado e revogado", () => {
    expect(accessState({ status: "active", access_expires_at: null }, now)).toBe("active");
    expect(accessState({ status: "active", access_expires_at: "2026-10-23T03:00:00Z" }, now)).toBe("active");
    expect(accessState({ status: "active", access_expires_at: "2026-10-22T03:00:00Z" }, now)).toBe("expired");
    expect(accessState({ status: "revoked", access_expires_at: "2027-01-01T03:00:00Z" }, now)).toBe("revoked");
  });
});
