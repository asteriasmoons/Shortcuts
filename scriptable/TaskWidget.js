// Tasks Widget for Scriptable
// Black background + gradient cards (#9a2dfe → #00d7ea) + no emojis

// ============ CONFIGURATION ============
const API_BASE_URL = "YOUR_API_LINK";
const AUTH_TOKEN   = "YOUR_API_KEY";

const SHOW_ACTIVE_TASKS   = true;
const SHOW_UPCOMING_TASKS = true;

const FAMILY = config.widgetFamily || "large";
const MAX_TASKS_TO_SHOW =
  FAMILY === "small"  ? 5 :
  FAMILY === "medium" ? 5 :
  5;

// ============ FONT SETTINGS ============
const HEADER_FONT = "Satisfy Regular";  
const BODY_FONT   = "Poppins-Light";

const HEADER_SIZE = 24;
const BODY_SIZE   = 14;
const COUNT_SIZE  = 16;

// ============ API HELPERS ============
async function fetchTasks(scope) {
  const request = new Request(`${API_BASE_URL}/tasks?scope=${scope}`);
  if (AUTH_TOKEN) {
    request.headers = { "Authorization": `Bearer ${AUTH_TOKEN}` };
  }
  const response = await request.loadJSON();
  return response.items || [];
}

async function getTasks() {
  try {
    let combined = [];

    if (SHOW_ACTIVE_TASKS) {
      combined = combined.concat(await fetchTasks("active"));
    }
    if (SHOW_UPCOMING_TASKS) {
      combined = combined.concat(await fetchTasks("upcoming"));
    }

    const filtered = combined.filter(t => {
      const info = t.taskInfo || {};
      const hasDate = info.scheduleDate || info.deadlineDate;
      const notDone = !["done", "canceled", "cancelled"].includes(info.state);
      return hasDate && notDone;
    });

    const sorted = filtered.sort((a, b) => {
      const A = a.taskInfo?.scheduleDate || a.taskInfo?.deadlineDate;
      const B = b.taskInfo?.scheduleDate || b.taskInfo?.deadlineDate;
      return new Date(A) - new Date(B);
    });

    return sorted.slice(0, MAX_TASKS_TO_SHOW);

  } catch (e) {
    console.error("ERROR fetching tasks:", e);
    return [];
  }
}

// ============ TEXT UTIL ============

function cleanMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/<\/?callout>/gi, "")
    .replace(/-\s*\[[xX\s]\]\s*/g, "")
    .replace(/>\s*-\s*/g, "")
    .replace(/<\/?[^>]+>/g, "")
    .trim();
}

// ============ DATE HELPERS ============

function formatDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const task  = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diff = Math.floor((task - today) / 86400000);

  if (diff === 0)  return "Today";
  if (diff === 1)  return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1)   return `${Math.abs(diff)}d overdue`;
  if (diff <= 7)   return `${diff}d`;

  return `${m}/${d}`;
}

function isOverdue(str) {
  const [y, m, d] = str.split("-").map(Number);
  const date   = new Date(y, m - 1, d);
  const now    = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date < today;
}

// ============ WIDGET CREATION ============

async function createWidget(tasks) {
  const widget = new ListWidget();

  // 🖤 Widget background: pure black
  widget.backgroundColor = new Color("#000000");
  widget.setPadding(16, 16, 16, 16);

  // HEADER
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const title = header.addText("Tasks");
  title.font = new Font(HEADER_FONT, HEADER_SIZE);
  title.textColor = new Color("#00d7ea"); // aqua header

  header.addSpacer();

  const count = header.addText(String(tasks.length));
  count.font = new Font(BODY_FONT, COUNT_SIZE);
  count.textColor = new Color("#9a2dfe"); // purple count

  widget.addSpacer(12);

  // EMPTY STATE (no emoji)
  if (tasks.length === 0) {
    const empty = widget.addText("No upcoming tasks");
    empty.font = new Font(BODY_FONT, 15);
    empty.textColor = Color.gray();
    empty.centerAlignText();
    return widget;
  }

  // TASK CARDS
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];

    // ---------- CARD CONTAINER ----------
    const card = widget.addStack();
    card.layoutHorizontally();
    card.cornerRadius = 12;
    card.setPadding(10, 12, 10, 12);

    // 🌈 Card gradient: purple → aqua
    const cardGrad = new LinearGradient();
    cardGrad.colors = [
      new Color("#9a2dfe"),
      new Color("#00d7ea")
    ];
    cardGrad.locations = [0, 1];
    card.backgroundGradient = cardGrad;

    // ---------- INNER ROW ----------
    const row = card.addStack();
    row.layoutHorizontally();
    row.spacing = 10;

    // Checkbox look
    const box = row.addStack();
    box.size = new Size(20, 20);
    box.cornerRadius = 4;
    box.borderWidth = 2;
    box.borderColor = Color.black(); // outline against gradient

    // Text column
    const textCol = row.addStack();
    textCol.layoutVertically();

    const cleaned = cleanMarkdown(t.markdown);
    const titleTxt = textCol.addText(cleaned || "Untitled");
    titleTxt.font = new Font(BODY_FONT, BODY_SIZE);
    titleTxt.textColor = Color.white();
    titleTxt.lineLimit = 2;

    row.addSpacer();

    // DATE INFO (no emojis)
    const info     = t.taskInfo || {};
    const schedule = info.scheduleDate;
    const deadline = info.deadlineDate;

    if (schedule || deadline) {
      const dStack = row.addStack();
      dStack.layoutVertically();
      dStack.spacing = 2;

      if (schedule) {
        const sText = dStack.addText("Scheduled: " + formatDate(schedule));
        sText.font = new Font(BODY_FONT, 11);
        sText.textColor = isOverdue(schedule)
          ? Color.red()
          : new Color("#00d7ea"); // aqua
      }

      if (deadline) {
        const dText = dStack.addText("Due: " + formatDate(deadline));
        dText.font = new Font(BODY_FONT, 11);
        dText.textColor = isOverdue(deadline)
          ? Color.red()
          : new Color("#9a2dfe"); // purple
      }
    }

    // Space between cards
    if (i < tasks.length - 1) widget.addSpacer(8);
  }

  widget.addSpacer();

  // FOOTER
  const df = new DateFormatter();
  df.dateFormat = "h:mm a";

  const footer = widget.addText(`Updated ${df.string(new Date())}`);
  footer.font = new Font(BODY_FONT, 10);
  footer.textColor = Color.gray();
  footer.centerAlignText();

  return widget;
}

// ============ MAIN ============

async function run() {
  const tasks  = await getTasks();
  const widget = await createWidget(tasks);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentLarge();
  }

  Script.complete();
}

await run();
