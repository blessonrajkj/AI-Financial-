import os
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(36, 762, "PARIVIEW — MASTER PROJECT DOCUMENTATION & REPORT")
            self.drawRightString(576, 762, "CONFIDENTIAL & PROPRIETARY")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(36, 754, 576, 754)

        # Footer
        self.setFont("Helvetica", 8)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(36, 45, 576, 45)
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawString(36, 32, "PariView Platform — Your money. Your view. Your future.")
        self.drawRightString(576, 32, page_str)
        self.restoreState()


def convert_md_inline_to_html(text):
    """Convert basic markdown inline formatting (**bold**, *italic*, `code`) to ReportLab HTML tags."""
    if not text:
        return ""
    # Escape HTML special chars
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Bold **text** or __text__
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.*?)__', r'<b>\1</b>', text)
    # Italic *text* or _text_
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    # Code `text`
    text = re.sub(r'`(.*?)`', r'<font face="Courier" color="#334155" size="8.5"><b>\1</b></font>', text)
    return text


def parse_markdown_to_flowables(md_content, styles):
    flowables = []
    lines = md_content.splitlines()

    i = 0
    in_code_block = False
    code_lines = []
    
    in_table = False
    table_lines = []

    def flush_table(t_lines):
        if not t_lines:
            return None
        # Process markdown table
        rows = []
        for line in t_lines:
            if re.match(r'^\s*\|?\s*:?-+:?\s*\|', line):
                continue # Skip divider row
            cells = [c.strip() for c in line.strip('|').split('|')]
            rows.append(cells)

        if not rows:
            return None

        # Build ReportLab Table
        is_header = True
        formatted_rows = []
        num_cols = max(len(r) for r in rows)

        for row_idx, r in enumerate(rows):
            formatted_row = []
            # Fill missing columns
            while len(r) < num_cols:
                r.append("")
            for cell_idx, c in enumerate(r):
                cell_html = convert_md_inline_to_html(c)
                if row_idx == 0:
                    p = Paragraph(cell_html, styles['TableHeader'])
                else:
                    p = Paragraph(cell_html, styles['TableCell'])
                formatted_row.append(p)
            formatted_rows.append(formatted_row)

        col_width = 540.0 / num_cols if num_cols > 0 else 100
        # Customize col widths for known tables if desired
        col_widths = [col_width] * num_cols

        t = Table(formatted_rows, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4F46E5')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ]))
        return t

    while i < len(lines):
        line = lines[i]

        # Handle Code Blocks
        if line.strip().startswith("```"):
            if in_code_block:
                # Flush code block
                code_text = "\n".join(code_lines)
                code_html = convert_md_inline_to_html(code_text)
                p = Paragraph(code_html.replace("\n", "<br/>").replace(" ", "&nbsp;"), styles['CodeBlock'])
                flowables.append(p)
                flowables.append(Spacer(1, 8))
                code_lines = []
                in_code_block = False
            else:
                if in_table:
                    t_flowable = flush_table(table_lines)
                    if t_flowable:
                        flowables.append(t_flowable)
                        flowables.append(Spacer(1, 10))
                    table_lines = []
                    in_table = False
                in_code_block = True
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Handle Tables
        if "|" in line and line.strip().startswith("|") and line.strip().endswith("|"):
            in_table = True
            table_lines.append(line)
            i += 1
            continue
        elif in_table:
            t_flowable = flush_table(table_lines)
            if t_flowable:
                flowables.append(t_flowable)
                flowables.append(Spacer(1, 10))
            table_lines = []
            in_table = False

        stripped = line.strip()
        if not stripped:
            i += 1
            continue

        # Horizontal Rule
        if stripped in ["---", "***", "___"]:
            flowables.append(Spacer(1, 4))
            flowables.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E2E8F0'), spaceAfter=10, spaceBefore=4))
            i += 1
            continue

        # Headings
        if stripped.startswith("# "):
            h_text = convert_md_inline_to_html(stripped[2:])
            flowables.append(Paragraph(h_text, styles['DocTitle']))
            flowables.append(Spacer(1, 6))
        elif stripped.startswith("## "):
            h_text = convert_md_inline_to_html(stripped[3:])
            flowables.append(Spacer(1, 8))
            flowables.append(Paragraph(h_text, styles['Heading1Custom']))
            flowables.append(Spacer(1, 6))
        elif stripped.startswith("### "):
            h_text = convert_md_inline_to_html(stripped[4:])
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph(h_text, styles['Heading2Custom']))
            flowables.append(Spacer(1, 4))
        elif stripped.startswith("#### "):
            h_text = convert_md_inline_to_html(stripped[5:])
            flowables.append(Paragraph(h_text, styles['Heading3Custom']))
            flowables.append(Spacer(1, 4))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            item_text = convert_md_inline_to_html(stripped[2:])
            flowables.append(Paragraph(f"• &nbsp; {item_text}", styles['BulletCustom']))
            flowables.append(Spacer(1, 3))
        elif re.match(r'^\d+\.\s', stripped):
            item_text = convert_md_inline_to_html(re.sub(r'^\d+\.\s', '', stripped))
            num = stripped.split('.')[0]
            flowables.append(Paragraph(f"<b>{num}.</b> &nbsp; {item_text}", styles['BulletCustom']))
            flowables.append(Spacer(1, 3))
        else:
            p_text = convert_md_inline_to_html(stripped)
            flowables.append(Paragraph(p_text, styles['BodyCustom']))
            flowables.append(Spacer(1, 6))

        i += 1

    if in_table:
        t_flowable = flush_table(table_lines)
        if t_flowable:
            flowables.append(t_flowable)
            flowables.append(Spacer(1, 10))

    return flowables


def build_pdf_from_markdown(md_file_path, pdf_file_path):
    with open(md_file_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    doc = SimpleDocTemplate(
        pdf_file_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        'Heading1Custom',
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#4F46E5'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        'Heading2Custom',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        'Heading3Custom',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        'BodyCustom',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        'BulletCustom',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=12,
        spaceAfter=3
    ))
    styles.add(ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    ))
    styles.add(ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    ))
    styles.add(ParagraphStyle(
        'CodeBlock',
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1E293B'),
        backColor=colors.HexColor('#F1F5F9'),
        borderColor=colors.HexColor('#CBD5E1'),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    ))

    flowables = parse_markdown_to_flowables(md_content, styles)
    doc.build(flowables, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Generated PDF: {pdf_file_path}")


if __name__ == "__main__":
    docs_dir = os.path.join(os.path.dirname(__file__), "..", "docs")
    files_to_convert = [
        ("PARIVIEW_MASTER_PROJECT_REPORT.md", "PARIVIEW_MASTER_PROJECT_REPORT.pdf"),
        ("PARIVIEW_EXECUTIVE_SUMMARY.md", "PARIVIEW_EXECUTIVE_SUMMARY.pdf"),
        ("PARIVIEW_ARCHITECTURE.md", "PARIVIEW_ARCHITECTURE.pdf")
    ]

    for md_name, pdf_name in files_to_convert:
        md_path = os.path.abspath(os.path.join(docs_dir, md_name))
        pdf_path = os.path.abspath(os.path.join(docs_dir, pdf_name))
        if os.path.exists(md_path):
            build_pdf_from_markdown(md_path, pdf_path)
        else:
            print(f"[ERROR] File not found: {md_path}")
