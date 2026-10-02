"""Daily music theory lesson emailer.

Reads the practice log, asks Claude for a lesson built around the most recent
practice, emails it, and saves a copy under lessons/ so later lessons can build
on earlier ones instead of repeating them.

Environment variables:
  ANTHROPIC_API_KEY   Claude API key
  GMAIL_ADDRESS       Gmail account that sends the email
  GMAIL_APP_PASSWORD  16-character Gmail app password for that account
  TO_EMAIL            Recipient address
  DRY_RUN             If "1", print the lesson instead of emailing it
"""

import datetime
import os
import re
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo

import anthropic
import markdown

HERE = Path(__file__).parent
LOG_FILE = HERE / "practice-log.md"
LESSONS_DIR = HERE / "lessons"
TIMEZONE = ZoneInfo(os.environ.get("LESSON_TZ", "Asia/Kolkata"))
RECENT_ENTRIES = 7
PAST_LESSONS = 10

SYSTEM_PROMPT = """You are a warm, patient music theory teacher writing a short \
nightly lesson for one student. You base every lesson on what the student \
actually practiced, so theory always connects to their hands and ears.

Write the lesson in Markdown with these sections:
1. A title line starting with "# " that names today's concept.
2. **Today's practice, explained**: the theory behind what they practiced \
today (or most recently), answering any question they wrote down.
3. **The concept**: one new idea that grows naturally from their practice. \
Explain it simply, with a concrete example in note names.
4. **Fix the struggle**: practical advice for whatever they said was hard.
5. **Tomorrow's exercise**: one specific 10-15 minute exercise that applies \
the concept on their instrument.
6. **Quick quiz**: three short questions, with answers hidden at the very end \
under "Answers".

Keep it under 600 words. Don't repeat a concept already covered in the past \
lessons listed; build on them instead. If the student did not log practice \
today, say so kindly, base the lesson on their latest entry, and encourage \
them to log tonight's session."""


def parse_entries(text):
    """Split the log into (date, body) pairs from '## YYYY-MM-DD' headings."""
    parts = re.split(r"^## (\d{4}-\d{2}-\d{2})\s*$", text, flags=re.MULTILINE)
    return [(parts[i], parts[i + 1].strip()) for i in range(1, len(parts), 2)]


def past_lesson_titles():
    titles = []
    for path in sorted(LESSONS_DIR.glob("*.md"))[-PAST_LESSONS:]:
        first_line = path.read_text(encoding="utf-8").splitlines()[0:1]
        title = first_line[0].lstrip("# ").strip() if first_line else ""
        titles.append(f"- {path.stem}: {title}")
    return titles


def build_prompt(today):
    entries = parse_entries(LOG_FILE.read_text(encoding="utf-8"))
    if not entries:
        sys.exit("No practice entries found in practice-log.md")
    recent = entries[-RECENT_ENTRIES:]
    logged_today = recent[-1][0] == today.isoformat()

    log_text = "\n\n".join(f"### {date}\n{body}" for date, body in recent)
    past = past_lesson_titles()
    past_text = "\n".join(past) if past else "(none yet, this is the first lesson)"

    return (
        f"Today is {today.isoformat()}. "
        f"The student {'did' if logged_today else 'did NOT'} log practice today.\n\n"
        f"<practice_log>\n{log_text}\n</practice_log>\n\n"
        f"<past_lessons>\n{past_text}\n</past_lessons>\n\n"
        "Write tonight's lesson."
    )


def generate_lesson(prompt):
    client = anthropic.Anthropic()
    response = client.beta.messages.create(
        model="claude-opus-5-5",
        max_tokens=16000,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    if response.stop_reason == "refusal":
        sys.exit("Claude declined to write the lesson")
    lesson = "".join(b.text for b in response.content if b.type == "text").strip()
    if not lesson:
        sys.exit("Claude returned an empty lesson")
    return lesson


def send_email(subject, lesson_md):
    sender = os.environ["GMAIL_ADDRESS"]
    recipient = os.environ["TO_EMAIL"]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Music Theory Coach <{sender}>"
    msg["To"] = recipient
    msg.attach(MIMEText(lesson_md, "plain", "utf-8"))
    html_body = markdown.markdown(lesson_md, extensions=["extra"])
    html = (
        '<div style="font-family:Georgia,serif;max-width:640px;margin:auto;'
        'line-height:1.6;color:#222">' + html_body + "</div>"
    )
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(sender, os.environ["GMAIL_APP_PASSWORD"])
        smtp.sendmail(sender, [recipient], msg.as_string())


def main():
    today = datetime.datetime.now(TIMEZONE).date()
    lesson = generate_lesson(build_prompt(today))

    title_match = re.match(r"#\s*(.+)", lesson)
    title = title_match.group(1).strip() if title_match else "Tonight's lesson"
    subject = f"🎵 Music theory, {today:%d %b}: {title}"

    if os.environ.get("DRY_RUN") == "1":
        print(subject, "\n\n", lesson)
        return

    send_email(subject, lesson)
    LESSONS_DIR.mkdir(exist_ok=True)
    (LESSONS_DIR / f"{today.isoformat()}.md").write_text(lesson + "\n", encoding="utf-8")
    print(f"Sent: {subject}")


if __name__ == "__main__":
    main()
