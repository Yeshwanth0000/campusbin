export type ResendUsage = {
  connected: boolean;
  sentToday: number;
  sentThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  cappedAtPageLimit: boolean;
  error: string | null;
};

const DAILY_LIMIT = 100;
const MONTHLY_LIMIT = 3000;
// Resend's list endpoint returns newest-first, so we stop as soon as we see
// an email older than the start of the month — this bounds real API calls to
// however many emails were actually sent this month, not the account's full
// history. This hard cap is a last-resort safety net for the rare month that
// blows past the plan limit anyway (shouldn't happen since Resend itself
// rejects sends past the plan cap).
const MAX_PAGES = 15;
const PAGE_SIZE = 100;

// IST has no daylight saving and is a fixed +5:30 offset, so this doesn't
// need a timezone library — campus activity is what we care about, not UTC.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istStartOfDay(now: Date): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

function istStartOfMonth(now: Date): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const startOfMonthIst = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1, 0, 0, 0, 0));
  return new Date(startOfMonthIst.getTime() - IST_OFFSET_MS);
}

type ResendEmail = { id: string; created_at: string };
type ResendListResponse = { data: ResendEmail[]; has_more?: boolean };

export async function getResendUsage(): Promise<ResendUsage> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      connected: false,
      sentToday: 0,
      sentThisMonth: 0,
      dailyLimit: DAILY_LIMIT,
      monthlyLimit: MONTHLY_LIMIT,
      cappedAtPageLimit: false,
      error: null,
    };
  }

  const now = new Date();
  const startOfDay = istStartOfDay(now);
  const startOfMonth = istStartOfMonth(now);

  let sentToday = 0;
  let sentThisMonth = 0;
  let after: string | null = null;
  let cappedAtPageLimit = false;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL("https://api.resend.com/emails");
      url.searchParams.set("limit", String(PAGE_SIZE));
      if (after) url.searchParams.set("after", after);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        // Admin-only, infrequently visited page — a short cache keeps repeat
        // loads cheap without needing a separate cron/cache layer.
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        return {
          connected: true,
          sentToday: 0,
          sentThisMonth: 0,
          dailyLimit: DAILY_LIMIT,
          monthlyLimit: MONTHLY_LIMIT,
          cappedAtPageLimit: false,
          error: `Resend API returned ${res.status}`,
        };
      }

      const body = (await res.json()) as ResendListResponse;
      const emails = body.data ?? [];
      if (emails.length === 0) break;

      let sawOlderThanMonth = false;
      for (const email of emails) {
        const createdAt = new Date(email.created_at);
        if (createdAt >= startOfMonth) {
          sentThisMonth++;
          if (createdAt >= startOfDay) sentToday++;
        } else {
          sawOlderThanMonth = true;
        }
      }

      // Either condition means this month is fully counted, even when it
      // happens on the final allowed page — so this exit is never "partial".
      if (sawOlderThanMonth || !body.has_more) break;
      after = emails[emails.length - 1].id;
      if (page === MAX_PAGES - 1) cappedAtPageLimit = true;
    }
  } catch (err) {
    return {
      connected: true,
      sentToday: 0,
      sentThisMonth: 0,
      dailyLimit: DAILY_LIMIT,
      monthlyLimit: MONTHLY_LIMIT,
      cappedAtPageLimit: false,
      error: err instanceof Error ? err.message : "Failed to reach Resend",
    };
  }

  return {
    connected: true,
    sentToday,
    sentThisMonth,
    dailyLimit: DAILY_LIMIT,
    monthlyLimit: MONTHLY_LIMIT,
    cappedAtPageLimit,
    error: null,
  };
}
