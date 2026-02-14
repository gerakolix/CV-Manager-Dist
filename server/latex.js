// LaTeX CV generator
// Generates a complete .tex file from profile, sections, and config data

// Template version — bump this when the LaTeX structure changes (new commands, fields, layout).
// Stored with each generated PDF so you can trace which template was used.
const TEMPLATE_VERSION = '2.0.0';

function getTemplateVersion() { return TEMPLATE_VERSION; }

function escapeLatex(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function processDescription(text) {
  if (!text) return '';
  const lines = text.split('\n').map(l => escapeLatex(l.trim())).filter(Boolean);
  return lines.join(' \\newline\n    ');
}

function processDescriptionWithThesis(text) {
  if (!text) return '';
  const lines = text.split('\n').map(line => {
    const thesisMatch = line.match(/^(Thesis|Thesis): "(.+)"$/);
    if (thesisMatch) {
      return escapeLatex(thesisMatch[1]) + ': \\textit{``' + escapeLatex(thesisMatch[2]) + "''}" ;
    }
    return escapeLatex(line.trim());
  }).filter(Boolean);
  return lines.join(' \\newline\n    ');
}

function l(profile, field, lang) {
  const langKey = field + (lang === 'de' ? 'De' : 'En');
  return profile[langKey] !== undefined ? profile[langKey] : (profile[field] || '');
}

// ── Publication citation formatters ─────────────────────────────────────────
function formatPublicationAPA(entry, getField) {
  const authors = getField(entry, 'authors');
  const year = getField(entry, 'year');
  const title = getField(entry, 'title');
  const journal = getField(entry, 'journal');
  const url = getField(entry, 'url');
  let tex = `\\noindent\\begin{tabularx}{\\textwidth}{@{}X@{}}
    \\textbf{${escapeLatex(authors)}} (${escapeLatex(year)}).\\\\[2pt]
    \\textit{${escapeLatex(title)}}. ${escapeLatex(journal)}.\\\\[2pt]`;
  if (url) tex += `\n    \\href{${url}}{${escapeLatex(url.replace(/^https?:\/\//, ''))}}`;
  tex += `\n\\end{tabularx}\n\n`;
  return tex;
}

function formatPublicationIEEE(entry, getField, index) {
  const authors = getField(entry, 'authors');
  const title = getField(entry, 'title');
  const journal = getField(entry, 'journal');
  const year = getField(entry, 'year');
  const url = getField(entry, 'url');
  let tex = `\\noindent\\begin{tabularx}{\\textwidth}{@{}X@{}}
    [${index}] ${escapeLatex(authors)}, ``${escapeLatex(title)},'' \\textit{${escapeLatex(journal)}}, ${escapeLatex(year)}.\\\\[2pt]`;
  if (url) tex += `\n    \\href{${url}}{${escapeLatex(url.replace(/^https?:\/\//, ''))}}`;
  tex += `\n\\end{tabularx}\n\n`;
  return tex;
}

function formatPublicationChicago(entry, getField) {
  const authors = getField(entry, 'authors');
  const year = getField(entry, 'year');
  const title = getField(entry, 'title');
  const journal = getField(entry, 'journal');
  const url = getField(entry, 'url');
  let tex = `\\noindent\\begin{tabularx}{\\textwidth}{@{}X@{}}
    ${escapeLatex(authors)}. ${escapeLatex(year)}. ``${escapeLatex(title)}.'' \\textit{${escapeLatex(journal)}}.\\\\[2pt]`;
  if (url) tex += `\n    \\href{${url}}{${escapeLatex(url.replace(/^https?:\/\//, ''))}}`;
  tex += `\n\\end{tabularx}\n\n`;
  return tex;
}

function formatPublicationMLA(entry, getField) {
  const authors = getField(entry, 'authors');
  const title = getField(entry, 'title');
  const journal = getField(entry, 'journal');
  const year = getField(entry, 'year');
  const url = getField(entry, 'url');
  let tex = `\\noindent\\begin{tabularx}{\\textwidth}{@{}X@{}}
    ${escapeLatex(authors)}. ``${escapeLatex(title)}.'' \\textit{${escapeLatex(journal)}}, ${escapeLatex(year)}.\\\\[2pt]`;
  if (url) tex += `\n    \\href{${url}}{${escapeLatex(url.replace(/^https?:\/\//, ''))}}`;
  tex += `\n\\end{tabularx}\n\n`;
  return tex;
}

function generateLatex(profile, sections, config) {
  const lang = config.language || 'en';
  const isDE = lang === 'de';
  const useLogos = config.useLogos || false;
  const citationStyle = config.citationStyle || 'apa';
  const sectionOrder = config.sectionOrder || Object.keys(sections);
  const enabledEntries = config.enabledEntries || {};
  const entryOrder = config.entryOrder || {};
  const overrides = config.overrides || {};
  const customEntries = config.customEntries || {};
  const profileOverrides = config.profileOverrides || {};

  // Merge profile with config-level overrides
  const mergedProfile = { ...profile };
  for (const [key, val] of Object.entries(profileOverrides)) {
    if (val !== '' && val !== undefined) mergedProfile[key] = val;
  }

  function getField(entry, field) {
    const override = overrides[entry.id];
    if (override && override[field] !== undefined && override[field] !== '') {
      return override[field];
    }
    return entry[field] !== undefined ? entry[field] : '';
  }

  function ef(entry, field) {
    const langField = field + (isDE ? 'De' : 'En');
    return getField(entry, langField) || getField(entry, field) || '';
  }

  let tex = '';

  // ── Preamble ─────────────────────────────────────────────────────────────
  tex += `\\documentclass[a4paper,10pt]{article}

%--- PACKAGES ---
\\usepackage[left=1.5cm, right=1.5cm, top=1.5cm, bottom=1.5cm]{geometry}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{tabularx}
\\usepackage{enumitem}
\\usepackage{graphicx}
\\usepackage{tikz}
\\usepackage{hyperref}
\\usepackage{etoolbox}
\\usepackage{needspace}

\\hypersetup{
    colorlinks=true,
    linkcolor=navyblue,
    urlcolor=navyblue,
    citecolor=navyblue,
    pdfborder={0 0 1}
}

%--- COLORS ---
\\definecolor{navyblue}{RGB}{0, 53, 107}
\\definecolor{graytext}{RGB}{80, 80, 80}

%--- FORMATTING ---
\\titleformat{\\section}
{\\Large\\bfseries\\color{navyblue}\\uppercase}
{}{0em}
{}[\\titlerule]
\\titlespacing{\\section}{0pt}{${isDE ? '8pt' : '12pt'}}{${isDE ? '4pt' : '6pt'}}

\\newcommand{\\entry}[4]{%
    \\needspace{3\\baselineskip}%
    \\noindent\\begin{tabularx}{\\textwidth}{@{}p{3.5cm} X@{}}
        \\textbf{#1} & \\textbf{#2}%
        \\ifblank{#3}{}{\\\\& \\textit{\\small #3}}%
        \\ifblank{#4}{}{\\\\& #4}%
    \\end{tabularx}
    \\vspace{${isDE ? '2pt' : '4pt'}}
}

\\newcommand{\\projectentry}[7]{%
    \\needspace{4\\baselineskip}%
    \\noindent\\begin{tabularx}{\\textwidth}{@{}p{3.5cm} X@{}}
        \\textbf{#7} & \\textbf{#3} --- \\textit{#4}\\\\[2pt]
`;

  if (useLogos) {
    tex += `        \\raisebox{-0.3\\height}{\\includegraphics[width=3cm, height=0.9cm, keepaspectratio]{#1}}%
`;
  } else {
    tex += `        \\textit{\\small #2}%
`;
  }

  tex += `        & #5\\\\[2pt]
        & \\textcolor{navyblue}{\\small\\textbf{Stack:}} {\\small #6}
    \\end{tabularx}
    \\vspace{${isDE ? '4pt' : '6pt'}}
}

\\setlist[itemize]{leftmargin=*, noitemsep, topsep=0pt}

\\begin{document}
`;

  // ── Photo (only if set) ──────────────────────────────────────────────────
  const photoFile = mergedProfile.photo;
  if (photoFile) {
    tex += `
%--- PHOTO ---
\\begin{tikzpicture}[remember picture, overlay]
    \\node[anchor=north east, inner sep=0pt, xshift=-1.5cm, yshift=-1.5cm]
        at (current page.north east) {%
        \\includegraphics[width=3.5cm, height=4.5cm, keepaspectratio]{${escapeLatex(photoFile)}}
    };
\\end{tikzpicture}
`;
  }

  tex += `
%--- HEADER ---
\\begin{minipage}{0.7\\textwidth}
    {\\Huge \\textbf{\\color{navyblue} ${escapeLatex(mergedProfile.name)}}}\\\\[0.2cm]
    {\\large ${escapeLatex(l(mergedProfile, 'title', lang))}}\\\\[0.3cm]

    \\textbf{${escapeLatex(l(mergedProfile, 'dateOfBirthLabel', lang))}:} ${escapeLatex(l(mergedProfile, 'dateOfBirth', lang))}\\\\
    \\textbf{${escapeLatex(l(mergedProfile, 'nationalityLabel', lang))}:} ${escapeLatex(l(mergedProfile, 'nationality', lang))}\\\\
    \\textbf{${escapeLatex(l(mergedProfile, 'locationLabel', lang))}:} ${escapeLatex(l(mergedProfile, 'location', lang))}\\\\
    \\textbf{${escapeLatex(l(mergedProfile, 'emailLabel', lang))}:} ${escapeLatex(mergedProfile.email)}`;

  if (mergedProfile.phone) {
    tex += `\\\\
    \\textbf{${escapeLatex(l(mergedProfile, 'phoneLabel', lang))}:} ${escapeLatex(mergedProfile.phone)}`;
  }

  tex += `
\\end{minipage}

\\vspace{0.8cm}

`;

  // ── Sections ─────────────────────────────────────────────────────────────
  for (const sectionKey of sectionOrder) {
    const section = sections[sectionKey];
    if (!section) continue;

    const enabled = enabledEntries[sectionKey] || [];
    const customs = customEntries[sectionKey] || [];
    const allItems = [...(section.items || []), ...customs];
    let orderedAll;
    const order = entryOrder[sectionKey];
    if (order && order.length > 0) {
      orderedAll = [];
      for (const id of order) { const item = allItems.find(i => i.id === id); if (item) orderedAll.push(item); }
      for (const item of allItems) { if (!order.includes(item.id)) orderedAll.push(item); }
    } else {
      orderedAll = allItems;
    }
    const items = orderedAll.filter(item => enabled.includes(item.id));
    if (items.length === 0) continue;

    const sectionLabel = isDE ? section.labelDe : section.labelEn;

    // Prevent page-break between section title and first entry
    tex += `%===============================================================================
\\needspace{5\\baselineskip}
\\section{${escapeLatex(sectionLabel)}}

`;

    if (section.type === 'entries') {
      for (const entry of items) {
        const dates = ef(entry, 'dates');
        const title = ef(entry, 'title');
        const subtitle = ef(entry, 'subtitle');
        const desc = ef(entry, 'description');
        const linkUrl = getField(entry, 'linkUrl');
        const linkText = ef(entry, 'linkText');

        let descLatex = processDescriptionWithThesis(desc);
        if (linkUrl && linkText) {
          descLatex += (descLatex ? ' \\newline\n    ' : '') +
            `\\href{${linkUrl}}{\\small ${escapeLatex(linkText)}}`;
        }

        tex += `\\entry{${escapeLatex(dates)}}
    {${escapeLatex(title)}}
    {${escapeLatex(subtitle)}}
    {${descLatex}}

`;
      }
    } else if (section.type === 'projects') {
      for (const entry of items) {
        const dates = getField(entry, 'dates');
        const company = getField(entry, 'company');
        const logo = getField(entry, 'logo');
        const title = ef(entry, 'title');
        const role = ef(entry, 'role');
        const desc = ef(entry, 'description');
        const stack = getField(entry, 'stack');

        tex += `\\projectentry{${escapeLatex(logo)}}
    {${escapeLatex(company)}}
    {${escapeLatex(title)}}
    {${escapeLatex(role)}}
    {${processDescription(desc)}}
    {${escapeLatex(stack)}}
    {${escapeLatex(dates)}}

`;
      }
    } else if (section.type === 'publications') {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i];
        if (citationStyle === 'ieee') {
          tex += formatPublicationIEEE(entry, getField, i + 1);
        } else if (citationStyle === 'chicago') {
          tex += formatPublicationChicago(entry, getField);
        } else if (citationStyle === 'mla') {
          tex += formatPublicationMLA(entry, getField);
        } else {
          // Default: APA
          tex += formatPublicationAPA(entry, getField);
        }
      }
    } else if (section.type === 'skills') {
      tex += `\\noindent\\begin{tabularx}{\\textwidth}{@{}p{3.5cm} X@{}}\n`;
      for (let i = 0; i < items.length; i++) {
        const entry = items[i];
        const label = ef(entry, 'label') || ef(entry, 'value');
        const value = ef(entry, 'value');
        const separator = i < items.length - 1 ? ' \\\\[8pt]' : '';
        tex += `    \\textbf{${escapeLatex(label)}} & ${escapeLatex(value)}${separator}\n`;
      }
      tex += `\\end{tabularx}

\\vspace{${isDE ? '0.2cm' : '0.4cm'}}

`;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const cvDate = l(mergedProfile, 'cvDate', lang);
  tex += `\\vfill
\\begin{flushright}
    \\small ${escapeLatex(l(mergedProfile, 'location', lang))}, ${cvDate ? escapeLatex(cvDate) : '\\today'}
\\end{flushright}

\\end{document}
`;

  return tex;
}

module.exports = { generateLatex, getTemplateVersion };
