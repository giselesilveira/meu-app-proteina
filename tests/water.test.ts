import { describe, expect, it } from "vitest";
import { formatWater, parseWaterMl, waterGoalMl, waterProgress, weightOnDate } from "@/lib/water";

describe("meta de água", () => {
  it("é 35 ml por kg", () => {
    expect(waterGoalMl(70)).toBe(2450);
    expect(waterGoalMl(68.4)).toBe(2394);
    expect(waterGoalMl(100)).toBe(3500);
  });

  it("calcula progresso e o que falta", () => {
    expect(waterProgress(2450, 1000)).toEqual({ goal: 2450, consumed: 1000, remaining: 1450, percent: 41, reached: false });
    const done = waterProgress(2450, 2600);
    expect(done.remaining).toBe(0);
    expect(done.percent).toBe(100);
    expect(done.reached).toBe(true);
  });
});

describe("peso atual", () => {
  const targets = [
    { effective_date: "2026-11-16", weight_kg: 80 },
    { effective_date: "2026-11-25", weight_kg: 77 },
  ];
  const checkins = [
    { checkin_date: "2026-11-20", weight_kg: 78.5 },
    { checkin_date: "2026-11-23", weight_kg: null },
  ];

  it("usa o registro mais recente até a data", () => {
    expect(weightOnDate("2026-11-18", 80, targets, checkins)).toBe(80);
    expect(weightOnDate("2026-11-21", 80, targets, checkins)).toBe(78.5);
    expect(weightOnDate("2026-11-24", 80, targets, checkins)).toBe(78.5);
    expect(weightOnDate("2026-11-26", 80, targets, checkins)).toBe(77);
  });

  it("no mesmo dia, vale o peso da Evolução", () => {
    expect(weightOnDate("2026-11-20", 80, [{ effective_date: "2026-11-20", weight_kg: 79 }], checkins)).toBe(78.5);
  });

  it("sem registros, usa o peso do perfil", () => {
    expect(weightOnDate("2026-11-18", 72, [], [])).toBe(72);
  });
});

describe("formatação e digitação", () => {
  it("formata ml e litros", () => {
    expect(formatWater(750)).toBe("750 ml");
    expect(formatWater(2450)).toBe("2,45 L");
    expect(formatWater(2000)).toBe("2 L");
  });

  it("aceita só quantidades válidas", () => {
    expect(parseWaterMl("300")).toBe(300);
    expect(parseWaterMl(" 250,4 ")).toBe(250);
    expect(parseWaterMl("0")).toBeNull();
    expect(parseWaterMl("6000")).toBeNull();
    expect(parseWaterMl("abc")).toBeNull();
    expect(parseWaterMl("")).toBeNull();
  });
});
