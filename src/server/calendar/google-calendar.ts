type GoogleCalendarEventDate = {
  date?: string;
  dateTime?: string;
};

type GoogleCalendarEvent = {
  summary?: string;
  description?: string;
  start?: GoogleCalendarEventDate;
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEvent[];
};

export type WeeklyCalendarSummary = {
  title: string;
  worshipDate: string | null;
  socialLeader: string | null;
  pulpitLeader: string | null;
  weeklySchedules: string[];
};

/**
 * 구글 캘린더에서 금주 예배 이벤트를 조회하고 화면용 정보로 파싱한다.
 */
export async function getWeeklyCalendarSummary(
  sundayStartDate: Date,
  nextSundayDate: Date,
): Promise<WeeklyCalendarSummary | null> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

  if (!calendarId || !apiKey) {
    return null;
  }

  const requestUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
  );
  const nextSundayEndDate = new Date(nextSundayDate);
  nextSundayEndDate.setUTCDate(nextSundayEndDate.getUTCDate() + 1);

  requestUrl.searchParams.set('key', apiKey);
  requestUrl.searchParams.set('timeMin', sundayStartDate.toISOString());
  requestUrl.searchParams.set('timeMax', nextSundayEndDate.toISOString());
  requestUrl.searchParams.set('singleEvents', 'true');
  requestUrl.searchParams.set('orderBy', 'startTime');
  requestUrl.searchParams.set('maxResults', '20');

  const response = await fetch(requestUrl.toString(), {
    next: {
      revalidate: 60 * 60 * 24 * 7,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleCalendarEventsResponse;
  const event = pickBestWeeklyEvent(payload.items ?? []);

  if (!event) {
    return null;
  }

  const title = (event.summary ?? '').trim();
  const description = (event.description ?? '').trim();

  return {
    title,
    worshipDate: extractEventDate(event.start),
    socialLeader: extractRoleFromTitle(title, '사회'),
    pulpitLeader: extractRoleFromTitle(title, '단상'),
    weeklySchedules: extractWeeklySchedules(description),
  };
}

/**
 * 이벤트 시작값에서 YYYY-MM-DD 날짜를 추출한다.
 */
function extractEventDate(start: GoogleCalendarEventDate | undefined): string | null {
  if (!start) {
    return null;
  }

  if (start.date) {
    return start.date;
  }

  if (!start.dateTime) {
    return null;
  }

  const matched = start.dateTime.match(/^(\d{4}-\d{2}-\d{2})/);
  return matched?.[1] ?? null;
}

/**
 * 금주 후보 이벤트 중 화면에 쓸 데이터가 있는 이벤트를 우선 선택한다.
 */
function pickBestWeeklyEvent(events: GoogleCalendarEvent[]): GoogleCalendarEvent | null {
  if (events.length === 0) {
    return null;
  }

  for (const event of events) {
    const summary = (event.summary ?? '').trim();
    const description = (event.description ?? '').trim();

    if (/사회|단상/.test(summary) || /주간\s*일정/.test(description)) {
      return event;
    }
  }

  for (const event of events) {
    const summary = (event.summary ?? '').trim();
    const description = (event.description ?? '').trim();

    if (summary || description) {
      return event;
    }
  }

  return events[0];
}

/**
 * 이벤트 제목에서 역할별 담당자를 추출한다.
 */
function extractRoleFromTitle(title: string, roleLabel: '사회' | '단상'): string | null {
  if (!title) {
    return null;
  }

  const roleValueByLabel = new Map<string, string>();
  const titleSegments = title.split('/').map((segment) => segment.trim());

  for (const segment of titleSegments) {
    const matched = segment.match(/^(사회|단상)\s*[:：]\s*(.+)$/u);

    if (!matched) {
      continue;
    }

    const parsedLabel = matched[1].trim();
    const parsedValue = matched[2].trim();

    if (parsedValue) {
      roleValueByLabel.set(parsedLabel, parsedValue);
    }
  }

  const segmentedParsedValue = roleValueByLabel.get(roleLabel);

  if (segmentedParsedValue) {
    return segmentedParsedValue;
  }

  const escapedRoleLabel = roleLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const candidates = [
    new RegExp(
      `\\[?\\s*${escapedRoleLabel}\\s*\\]?\\s*[:：\\-]?\\s*([^|,/·\\\\n]+?)(?=\\s*(?:\\||\\/|,|·|$))`,
    ),
    new RegExp(`${escapedRoleLabel}\\s*[:：\\-]\\s*([^|,/·\\\\n]+)`),
  ];

  for (const pattern of candidates) {
    const matched = title.match(pattern);

    if (matched?.[1]) {
      const parsed = matched[1].trim();

      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * 이벤트 설명에서 주간일정 라인을 파싱한다.
 */
function extractWeeklySchedules(description: string): string[] {
  if (!description) {
    return [];
  }

  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const scheduleHeaderIndex = lines.findIndex((line) => /^\[?\s*주간\s*일정\s*\]?$/i.test(line));
  const scheduleLines = scheduleHeaderIndex >= 0 ? lines.slice(scheduleHeaderIndex + 1) : lines;

  return scheduleLines
    .map((line) => line.replace(/^\d+[.)]\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}
