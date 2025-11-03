# app/backend/feedback.py
import os
import html
from datetime import datetime
from zoneinfo import ZoneInfo
from azure.communication.email.aio import EmailClient as AioEmailClient

OSLO_TZ = ZoneInfo("Europe/Oslo")

# Nøkkel -> visningstekst som matcher Dropdown-alternativene i UI
CATEGORY_LABELS = {
    "feil_svar": "Feil eller uklart svar",
    "forbedringsforslag": "Forslag til forbedring",
    "manglende_dokumentasjon": "Manglende dokumentasjon",
    "utdatert_informasjon": "Utdatert informasjon",
    "teknisk_problem": "Teknisk feil eller error",
    "annet": "Annet",
}

def _now_oslo_str() -> str:
    # Norsk stil: 25.08.2025 kl. 14:07
    return datetime.now(OSLO_TZ).strftime("%d.%m.%Y kl. %H:%M")

def _normalize_name(name: str | None) -> str:
    name = (name or "").strip()
    return name or "Anonym"

def _normalize_email(email: str | None) -> str | None:
    email = (email or "").strip()
    return email or None

def _category_label(category_key: str | None) -> tuple[str, str]:
    key = (category_key or "").strip() or "annet"
    if key not in CATEGORY_LABELS:
        key = "annet"
    return key, CATEGORY_LABELS[key]

def render_feedback_html(name: str | None, email: str | None, message: str, category_key: str | None) -> str:
    ts = _now_oslo_str()
    safe_name = html.escape(_normalize_name(name))
    safe_email = html.escape(_normalize_email(email) or "")
    _, category_text = _category_label(category_key)
    safe_category_text = html.escape(category_text)
    safe_message = html.escape(message or "")

    email_fragment = f" &lt;{safe_email}&gt;" if safe_email else ""

    return f"""
<div style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.1);font-family:Segoe UI,Arial,sans-serif;">
  <div style="background-color:#173669;color:#ffffff;padding:16px;text-align:center;">
    <h1 style="margin:0;font-size:1.5em;">Anbudsbot – Tilbakemelding</h1>
  </div>

  <div style="padding:16px;color:#333333;">
    <p style="margin:0 0 12px;"><strong>Dato/tid:</strong> {ts}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tbody>
        <tr>
          <td style="padding:8px 4px;font-weight:bold;width:30%;background:#f9f9f9;">Fra:</td>
          <td style="padding:8px 4px;">{safe_name}{email_fragment}</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;font-weight:bold;width:30%;background:#f9f9f9;">Kategori:</td>
          <td style="padding:8px 4px;">{safe_category_text}</td>
        </tr>
      </tbody>
    </table>

    <div style="background-color:#EEF3F9;padding:12px;border-radius:4px;">
      <strong>Tilbakemelding:</strong><br><br>
      <div style="white-space:pre-wrap; margin-bottom: 1em;">{safe_message}</div>
    </div>
  </div>

  <div style="background-color:#f4f4f4;color:#666666;text-align:center;padding:12px;font-size:0.85em;">
    Denne meldingen ble generert automatisk av Anbudsbot.
  </div>
</div>"""

async def send_feedback_email(name: str | None, email_addr: str | None, message: str, category_key: str | None) -> dict:
    cs = os.getenv("FEEDBACK_CONNECTION_STRING")
    sender = os.getenv("FEEDBACK_SENDER")
    recipients_raw = os.getenv("FEEDBACK_TO")
    if not cs or not sender or not recipients_raw:
        raise RuntimeError("Email service not configured (FEEDBACK_CONNECTION_STRING/FEEDBACK_* missing)")

    # Same idea as Microsoft docs: build a concrete list of "to" recipients
    # FEEDBACK_TO supports comma or semicolon separated emails
    to_recipients = [
        {"address": addr.strip()}
        for addr in recipients_raw.replace(";", ",").split(",")
        if addr.strip()
    ]
    if not to_recipients:
        raise RuntimeError("No valid recipients found in FEEDBACK_TO")

    norm_name = _normalize_name(name)
    norm_email = _normalize_email(email_addr)
    key, category_text = _category_label(category_key)
    ts = _now_oslo_str()
    # Emnefelt: [Anbudsbot] Tilbakemelding – <Kategori> (<Navn>)
    subject = f"[Anbudsbot] Tilbakemelding – {category_text} ({norm_name})"
    # Plain text med norsk datoformat. Ikke ta med e-post hvis den ikke er oppgitt.
    from_line = f"Fra: {norm_name}" + (f" <{norm_email}>" if norm_email else "")
    plain_text = (
        f"Dato/tid: {ts}\n"
        f"{from_line}\n\n"
        f"Kategori: {category_text} ({key})\n"
        f"{message or ''}"
    )

    email_message = {
        "senderAddress": sender,
        "recipients": {
            "to": to_recipients
        },
        "content": {
            "subject": subject,
            "plainText": plain_text,
            "html": render_feedback_html(norm_name, norm_email, message, key),
        },
    }

    client = AioEmailClient.from_connection_string(cs)
    try:
        # Rask non-blocking send (ikke vent på ferdigstilt status)
        await client.begin_send(email_message)
    finally:
        await client.close()

    return {"ok": True, "status": "queued"}
