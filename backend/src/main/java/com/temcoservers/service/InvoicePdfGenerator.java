package com.temcoservers.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import jakarta.ejb.Stateless;

import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.Level;
import java.util.logging.Logger;

@Stateless
public class InvoicePdfGenerator {

    private static final Logger LOG = Logger.getLogger(InvoicePdfGenerator.class.getName());
    private static final String UPLOAD_DIR = "/opt/temcoservers/uploads/invoices";
    private static final String COMPANY_NAME = "Java Institute Holdings (Pvt) Ltd";
    private static final String PLATFORM_NAME = "TemcoServers Platform";
    private static final String DISCLAIMER = "IMPORTANT: This is an acknowledgement of your payment submission only. " +
            "Verification is pending and may take up to 24 hours as we reconcile with bank statements. " +
            "This document does not confirm receipt of funds. Banks are not yet connected via API for " +
            "automated verification — reconciliation is performed manually against bank statements.";

    /**
     * Generate a payment invoice PDF and return the relative URL path.
     */
    public String generateInvoice(String voucherId, String purchaserName, String referenceNo,
                                   double amount, String planLabel, String slipUrl) {
        try {
            // Ensure directory exists
            java.nio.file.Path dir = Paths.get(UPLOAD_DIR);
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }

            String filename = "INV-" + voucherId + ".pdf";
            java.nio.file.Path filePath = dir.resolve(filename);

            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            try (OutputStream os = Files.newOutputStream(filePath)) {
                PdfWriter writer = PdfWriter.getInstance(document, os);
                document.open();

                // --- Colors ---
                java.awt.Color brandBlue = new java.awt.Color(3, 54, 255);
                java.awt.Color darkGray = new java.awt.Color(51, 51, 51);
                java.awt.Color lightGray = new java.awt.Color(240, 240, 240);
                java.awt.Color warningOrange = new java.awt.Color(255, 140, 0);

                // --- Fonts ---
                Font titleFont = new Font(Font.HELVETICA, 22, Font.BOLD, brandBlue);
                Font headerFont = new Font(Font.HELVETICA, 12, Font.BOLD, darkGray);
                Font normalFont = new Font(Font.HELVETICA, 10, Font.NORMAL, darkGray);
                Font boldFont = new Font(Font.HELVETICA, 10, Font.BOLD, darkGray);
                Font smallFont = new Font(Font.HELVETICA, 8, Font.NORMAL, java.awt.Color.GRAY);
                Font warningFont = new Font(Font.HELVETICA, 9, Font.ITALIC, warningOrange);
                Font amountFont = new Font(Font.HELVETICA, 16, Font.BOLD, brandBlue);

                // --- PENDING VERIFICATION watermark (diagonal) ---
                PdfContentByte canvas = writer.getDirectContentUnder();
                canvas.saveState();
                PdfGState gs = new PdfGState();
                gs.setFillOpacity(0.15f);
                canvas.setGState(gs);
                canvas.beginText();
                canvas.setFontAndSize(BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, false), 52);
                canvas.setColorFill(new java.awt.Color(255, 100, 100));
                canvas.showTextAligned(Element.ALIGN_CENTER, "PENDING VERIFICATION",
                        PageSize.A4.getWidth() / 2, PageSize.A4.getHeight() / 2, 45);
                canvas.endText();
                canvas.restoreState();

                // --- Header with logo ---
                PdfPTable headerTable = new PdfPTable(2);
                headerTable.setWidthPercentage(100);
                headerTable.setWidths(new float[]{1, 2});

                // Logo cell
                PdfPCell logoCell;
                try {
                    Image logo = Image.getInstance(
                            getClass().getClassLoader().getResource("images/java-institute-logo.png"));
                    logo.scaleToFit(80, 80);
                    logoCell = new PdfPCell(logo);
                } catch (Exception e) {
                    LOG.log(Level.WARNING, "Could not load logo, using text fallback", e);
                    logoCell = new PdfPCell(new Phrase("JIAT", titleFont));
                }
                logoCell.setBorder(Rectangle.NO_BORDER);
                logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                headerTable.addCell(logoCell);

                // Company info cell
                Paragraph companyInfo = new Paragraph();
                companyInfo.add(new Chunk(COMPANY_NAME + "\n", headerFont));
                companyInfo.add(new Chunk(PLATFORM_NAME + "\n", normalFont));
                companyInfo.add(new Chunk("https://aihost.temcobank.com\n", smallFont));
                PdfPCell companyCell = new PdfPCell(companyInfo);
                companyCell.setBorder(Rectangle.NO_BORDER);
                companyCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                companyCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                headerTable.addCell(companyCell);

                document.add(headerTable);
                document.add(new Paragraph(" "));

                // --- Invoice Title ---
                Paragraph title = new Paragraph("PAYMENT ACKNOWLEDGEMENT", titleFont);
                title.setAlignment(Element.ALIGN_CENTER);
                document.add(title);
                document.add(new Paragraph(" "));

                // --- Invoice Details Table ---
                PdfPTable detailsTable = new PdfPTable(2);
                detailsTable.setWidthPercentage(100);
                detailsTable.setWidths(new float[]{1, 2});

                String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

                addDetailRow(detailsTable, "Invoice No:", voucherId, boldFont, normalFont, lightGray);
                addDetailRow(detailsTable, "Date:", now, boldFont, normalFont, null);
                addDetailRow(detailsTable, "Purchaser:", purchaserName, boldFont, normalFont, lightGray);
                addDetailRow(detailsTable, "Bank Reference:", referenceNo, boldFont, normalFont, null);
                addDetailRow(detailsTable, "Product:", planLabel, boldFont, normalFont, lightGray);
                addDetailRow(detailsTable, "Status:", "PENDING VERIFICATION", boldFont, warningFont, null);

                document.add(detailsTable);
                document.add(new Paragraph(" "));

                // --- Amount Box ---
                PdfPTable amountTable = new PdfPTable(1);
                amountTable.setWidthPercentage(60);
                amountTable.setHorizontalAlignment(Element.ALIGN_CENTER);

                Paragraph amountPara = new Paragraph();
                amountPara.setAlignment(Element.ALIGN_CENTER);
                amountPara.add(new Chunk("Amount Submitted\n", headerFont));
                amountPara.add(new Chunk(String.format("LKR %.2f", amount), amountFont));

                PdfPCell amountCell = new PdfPCell(amountPara);
                amountCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                amountCell.setPadding(15);
                amountCell.setBorderColor(brandBlue);
                amountCell.setBorderWidth(2);
                amountTable.addCell(amountCell);

                document.add(amountTable);
                document.add(new Paragraph(" "));

                // --- Disclaimer ---
                PdfPTable disclaimerTable = new PdfPTable(1);
                disclaimerTable.setWidthPercentage(100);

                Paragraph disclaimerPara = new Paragraph(DISCLAIMER, warningFont);
                disclaimerPara.setAlignment(Element.ALIGN_JUSTIFIED);

                PdfPCell disclaimerCell = new PdfPCell(disclaimerPara);
                disclaimerCell.setPadding(10);
                disclaimerCell.setBackgroundColor(new java.awt.Color(255, 248, 230));
                disclaimerCell.setBorderColor(warningOrange);
                disclaimerCell.setBorderWidth(1);
                disclaimerTable.addCell(disclaimerCell);

                document.add(disclaimerTable);
                document.add(new Paragraph(" "));

                // --- Bank Accounts ---
                Paragraph bankTitle = new Paragraph("Payment Accepted Via Bank Transfer To:", headerFont);
                document.add(bankTitle);
                document.add(new Paragraph(" ", smallFont));

                PdfPTable bankTable = new PdfPTable(3);
                bankTable.setWidthPercentage(100);
                bankTable.setWidths(new float[]{2, 2, 1.5f});

                // Bank table header
                addBankHeaderCell(bankTable, "Bank", boldFont, brandBlue);
                addBankHeaderCell(bankTable, "Account Name", boldFont, brandBlue);
                addBankHeaderCell(bankTable, "Account No", boldFont, brandBlue);

                // Bank rows
                addBankRow(bankTable, "Nations Trust Bank (Nawala)", COMPANY_NAME, "100270013028", normalFont, null);
                addBankRow(bankTable, "Sampath Bank (Gangodawila)", COMPANY_NAME, "013510007411", normalFont, lightGray);
                addBankRow(bankTable, "Commercial Bank (Reid Ave)", COMPANY_NAME, "8021668995", normalFont, null);

                document.add(bankTable);
                document.add(new Paragraph(" "));

                // --- Footer ---
                Paragraph footer = new Paragraph(
                        "Generated by " + PLATFORM_NAME + " on " + now + "\n" +
                        "This is a computer-generated document. No signature is required.",
                        smallFont);
                footer.setAlignment(Element.ALIGN_CENTER);
                document.add(footer);

                document.close();
            }

            LOG.info("Invoice PDF generated: " + filePath);
            return "/uploads/invoices/" + filename;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Failed to generate invoice PDF", e);
            return null;
        }
    }

    private void addDetailRow(PdfPTable table, String label, String value,
                               Font labelFont, Font valueFont, java.awt.Color bgColor) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPadding(6);
        if (bgColor != null) labelCell.setBackgroundColor(bgColor);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPadding(6);
        if (bgColor != null) valueCell.setBackgroundColor(bgColor);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addBankHeaderCell(PdfPTable table, String text, Font font, java.awt.Color bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, new Font(Font.HELVETICA, 10, Font.BOLD, java.awt.Color.WHITE)));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(6);
        cell.setBorderWidth(0);
        table.addCell(cell);
    }

    private void addBankRow(PdfPTable table, String bank, String name, String accNo,
                             Font font, java.awt.Color bgColor) {
        String[] values = {bank, name, accNo};
        for (String val : values) {
            PdfPCell cell = new PdfPCell(new Phrase(val, font));
            cell.setPadding(5);
            cell.setBorderWidth(0.5f);
            cell.setBorderColor(java.awt.Color.LIGHT_GRAY);
            if (bgColor != null) cell.setBackgroundColor(bgColor);
            table.addCell(cell);
        }
    }

    /**
     * Generate a PAID receipt PDF for PayPal payments.
     * Unlike bank slip acknowledgements, this is a confirmed payment receipt.
     */
    public String generatePayPalReceipt(String voucherId, String purchaserName,
                                         double amount, String currency, String planLabel,
                                         String paypalOrderId, String captureId, String payerEmail) {
        try {
            java.nio.file.Path dir = Paths.get(UPLOAD_DIR);
            if (!Files.exists(dir)) Files.createDirectories(dir);

            String filename = "REC-" + voucherId + ".pdf";
            java.nio.file.Path filePath = dir.resolve(filename);

            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            try (OutputStream os = Files.newOutputStream(filePath)) {
                PdfWriter writer = PdfWriter.getInstance(document, os);
                document.open();

                java.awt.Color brandBlue = new java.awt.Color(3, 54, 255);
                java.awt.Color successGreen = new java.awt.Color(22, 163, 74);
                java.awt.Color darkGray = new java.awt.Color(51, 51, 51);
                java.awt.Color lightGray = new java.awt.Color(240, 240, 240);

                Font titleFont = new Font(Font.HELVETICA, 22, Font.BOLD, brandBlue);
                Font headerFont = new Font(Font.HELVETICA, 12, Font.BOLD, darkGray);
                Font normalFont = new Font(Font.HELVETICA, 10, Font.NORMAL, darkGray);
                Font boldFont = new Font(Font.HELVETICA, 10, Font.BOLD, darkGray);
                Font smallFont = new Font(Font.HELVETICA, 8, Font.NORMAL, java.awt.Color.GRAY);
                Font successFont = new Font(Font.HELVETICA, 12, Font.BOLD, successGreen);
                Font amountFont = new Font(Font.HELVETICA, 16, Font.BOLD, brandBlue);

                // --- PAID watermark (diagonal) ---
                PdfContentByte canvas = writer.getDirectContentUnder();
                canvas.saveState();
                PdfGState gs = new PdfGState();
                gs.setFillOpacity(0.08f);
                canvas.setGState(gs);
                canvas.beginText();
                canvas.setFontAndSize(BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, false), 72);
                canvas.setColorFill(successGreen);
                canvas.showTextAligned(Element.ALIGN_CENTER, "PAID",
                        PageSize.A4.getWidth() / 2, PageSize.A4.getHeight() / 2, 45);
                canvas.endText();
                canvas.restoreState();

                // --- Header ---
                PdfPTable headerTable = new PdfPTable(2);
                headerTable.setWidthPercentage(100);
                headerTable.setWidths(new float[]{1, 2});

                PdfPCell logoCell;
                try {
                    Image logo = Image.getInstance(
                            getClass().getClassLoader().getResource("images/java-institute-logo.png"));
                    logo.scaleToFit(80, 80);
                    logoCell = new PdfPCell(logo);
                } catch (Exception e) {
                    logoCell = new PdfPCell(new Phrase("JIAT", titleFont));
                }
                logoCell.setBorder(Rectangle.NO_BORDER);
                logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                headerTable.addCell(logoCell);

                Paragraph companyInfo = new Paragraph();
                companyInfo.add(new Chunk(COMPANY_NAME + "\n", headerFont));
                companyInfo.add(new Chunk(PLATFORM_NAME + "\n", normalFont));
                companyInfo.add(new Chunk("https://aihost.temcobank.com\n", smallFont));
                PdfPCell companyCell = new PdfPCell(companyInfo);
                companyCell.setBorder(Rectangle.NO_BORDER);
                companyCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                companyCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                headerTable.addCell(companyCell);

                document.add(headerTable);
                document.add(new Paragraph(" "));

                // --- Title ---
                Paragraph title = new Paragraph("PAYMENT RECEIPT", titleFont);
                title.setAlignment(Element.ALIGN_CENTER);
                document.add(title);
                document.add(new Paragraph(" "));

                // --- Details ---
                PdfPTable detailsTable = new PdfPTable(2);
                detailsTable.setWidthPercentage(100);
                detailsTable.setWidths(new float[]{1, 2});

                String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

                addDetailRow(detailsTable, "Receipt No:", voucherId, boldFont, normalFont, lightGray);
                addDetailRow(detailsTable, "Date:", now, boldFont, normalFont, null);
                addDetailRow(detailsTable, "Customer:", purchaserName, boldFont, normalFont, lightGray);
                addDetailRow(detailsTable, "Product:", planLabel, boldFont, normalFont, null);
                addDetailRow(detailsTable, "Payment Method:", "PayPal", boldFont, normalFont, lightGray);
                addDetailRow(detailsTable, "PayPal Order:", paypalOrderId != null ? paypalOrderId : "-", boldFont, normalFont, null);
                addDetailRow(detailsTable, "Capture ID:", captureId != null ? captureId : "-", boldFont, normalFont, lightGray);
                addDetailRow(detailsTable, "Payer Email:", payerEmail != null ? payerEmail : "-", boldFont, normalFont, null);
                addDetailRow(detailsTable, "Status:", "PAID", boldFont, successFont, lightGray);

                document.add(detailsTable);
                document.add(new Paragraph(" "));

                // --- Amount Box ---
                PdfPTable amountTable = new PdfPTable(1);
                amountTable.setWidthPercentage(60);
                amountTable.setHorizontalAlignment(Element.ALIGN_CENTER);

                Paragraph amountPara = new Paragraph();
                amountPara.setAlignment(Element.ALIGN_CENTER);
                amountPara.add(new Chunk("Amount Paid\n", headerFont));
                amountPara.add(new Chunk(String.format("%s %.2f", currency != null ? currency : "USD", amount), amountFont));

                PdfPCell amountCell = new PdfPCell(amountPara);
                amountCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                amountCell.setPadding(15);
                amountCell.setBorderColor(successGreen);
                amountCell.setBorderWidth(2);
                amountTable.addCell(amountCell);

                document.add(amountTable);
                document.add(new Paragraph(" "));

                // --- Confirmation Note ---
                PdfPTable noteTable = new PdfPTable(1);
                noteTable.setWidthPercentage(100);
                Paragraph notePara = new Paragraph(
                        "This payment has been confirmed via PayPal. Your subscription is now active. " +
                        "If you have any questions, please contact support@temcobank.com.",
                        new Font(Font.HELVETICA, 9, Font.NORMAL, successGreen));
                notePara.setAlignment(Element.ALIGN_JUSTIFIED);
                PdfPCell noteCell = new PdfPCell(notePara);
                noteCell.setPadding(10);
                noteCell.setBackgroundColor(new java.awt.Color(240, 253, 244));
                noteCell.setBorderColor(successGreen);
                noteCell.setBorderWidth(1);
                noteTable.addCell(noteCell);
                document.add(noteTable);
                document.add(new Paragraph(" "));

                // --- Footer ---
                Paragraph footer = new Paragraph(
                        "Generated by " + PLATFORM_NAME + " on " + now + "\n" +
                        "This is a computer-generated document. No signature is required.",
                        smallFont);
                footer.setAlignment(Element.ALIGN_CENTER);
                document.add(footer);

                document.close();
            }

            LOG.info("PayPal receipt PDF generated: " + filePath);
            return "/uploads/invoices/" + filename;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Failed to generate PayPal receipt PDF", e);
            return null;
        }
    }
}
