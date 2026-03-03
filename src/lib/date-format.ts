const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function daysInMonth(month: number, year: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function isValidDateParts(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(month, year)) return false;
  return true;
}

function toDmy(day: number, month: number, year: number): string {
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function parseMonthName(input: string): number | null {
  const normalized = input.trim().toLowerCase();
  return MONTH_NAME_TO_NUMBER[normalized] || null;
}

export function isValidDmyDate(value: string): boolean {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  return isValidDateParts(day, month, year);
}

export function normalizeToDmyDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isValidDmyDate(trimmed)) return trimmed;

  const dayMonthYear = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dayMonthYear) {
    let day = Number.parseInt(dayMonthYear[1], 10);
    let month = Number.parseInt(dayMonthYear[2], 10);
    const year = Number.parseInt(dayMonthYear[3], 10);

    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }

    if (isValidDateParts(day, month, year)) {
      return toDmy(day, month, year);
    }
  }

  const isoYearMonthDay = trimmed.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:[T\s].*)?$/);
  if (isoYearMonthDay) {
    const year = Number.parseInt(isoYearMonthDay[1], 10);
    const month = Number.parseInt(isoYearMonthDay[2], 10);
    const day = Number.parseInt(isoYearMonthDay[3], 10);
    if (isValidDateParts(day, month, year)) {
      return toDmy(day, month, year);
    }
  }

  const dayMonthNameYear = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (dayMonthNameYear) {
    const day = Number.parseInt(dayMonthNameYear[1], 10);
    const month = parseMonthName(dayMonthNameYear[2]);
    const year = Number.parseInt(dayMonthNameYear[3], 10);
    if (month && isValidDateParts(day, month, year)) {
      return toDmy(day, month, year);
    }
  }

  return trimmed;
}
