const fs = require('fs');
const path = require('path');
const htmlToDocx = require('html-to-docx');
const { marked } = require('marked');

async function convert() {
    const mdPath = 'C:\\Users\\Akshay\\.gemini\\antigravity\\brain\\98332538-a8af-4948-b820-a0f82b3b99ac\\performance_results.md';
    const outputPath = path.join(__dirname, '..', 'Performance_Evaluation_Report.docx');

    if (!fs.existsSync(mdPath)) {
        console.error('Markdown file not found at:', mdPath);
        return;
    }

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    
    // Clean up mermaid blocks for the docx which won't render them natively
    const cleanMd = mdContent.replace(/```mermaid[\s\S]*?```/g, '> [Diagram Omitted in DOCX - Ref Markdown for Interactive Charts]');
    
    const htmlContent = marked.parse(cleanMd);

    const docxBuffer = await htmlToDocx(htmlContent, null, {
        table: { row: { canSplit: true } },
        footer: true,
        pageNumber: true,
    });

    fs.writeFileSync(outputPath, docxBuffer);
    console.log('DOCX report generated successfully at:', outputPath);
}

convert().catch(console.error);
