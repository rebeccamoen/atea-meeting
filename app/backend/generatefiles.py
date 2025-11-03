# app/backend/generatefiles.py
from __future__ import annotations
from pathlib import Path
import io, datetime, re
from typing import Tuple
from bs4 import BeautifulSoup
from docx import Document
from htmldocx import HtmlToDocx

TEMPLATE_PATH = (Path(__file__).resolve().parent / "templates" / "template.docx")

# Matches bare numeric footnote markers like ^1, [1], or just 1 in <sup>
_CITATION_SUP_RE = re.compile(r"^\^?\[?\d+[a-z]?\]?$", re.I)

def _remove_empty_paragraphs(soup: BeautifulSoup) -> None:
    for p in list(soup.find_all("p")):
        text = (p.get_text() or "").replace("\xa0", " ").strip()
        only_br = all(getattr(c, "name", None) == "br" for c in p.contents) and len(p.contents) > 0
        if not text and (only_br or not p.find()):
            p.decompose()

def _sanitize_and_prepare_html(html: str) -> str:
    """
    Keep structure; remove unsafe/noisy bits for Word:
      - drop <script>/<style>
      - drop ALL <a> (including their inner text)
      - drop <sup> that are just numeric markers (citations)
      - drop empty paragraphs
    """
    soup = BeautifulSoup(html or "", "html.parser")

    # 1) scripts/styles
    for tag in soup(["script", "style"]):
        tag.decompose()

    # 2) remove all links entirely (including their text)
    for a in list(soup.find_all("a")):
        a.decompose()
        # to keep link text but remove the hyperlink, swap a.decompose() to a.unwrap()

    # 3) remove bare-number superscripts like 1, [1], ^1
    for sup in list(soup.find_all("sup")):
        if _CITATION_SUP_RE.fullmatch((sup.get_text() or "").strip()):
            sup.decompose()

    # 4) tidy paragraphs
    _remove_empty_paragraphs(soup)

    return str(soup)

def build_docx_from_html(html: str) -> Tuple[io.BytesIO, str, str]:
    doc = Document(str(TEMPLATE_PATH)) if TEMPLATE_PATH.exists() else Document()

    safe_html = _sanitize_and_prepare_html(html)

    # Convert HTML → DOCX while preserving bold/italics/headings/lists/tables
    HtmlToDocx().add_html_to_document(safe_html, doc)

    out = io.BytesIO()
    doc.save(out)
    out.seek(0)

    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"anbudsbot-{stamp}.docx"
    mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return out, filename, mimetype

def build_from_request_json(data: dict) -> Tuple[io.BytesIO, str, str]:
    html = data.get("html") or ""
    return build_docx_from_html(html)
