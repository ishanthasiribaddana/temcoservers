package com.temcoservers.service;

import jakarta.annotation.PostConstruct;
import jakarta.ejb.Asynchronous;
import jakarta.ejb.Stateless;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

@Stateless
public class EmailService {

    private static final Logger LOG = Logger.getLogger(EmailService.class.getName());

    private String smtpHost;
    private int smtpPort;
    private String smtpUser;
    private String smtpPassword;
    private String fromEmail;
    private String fromName;
    private boolean configured;

    @PostConstruct
    public void init() {
        smtpHost = System.getenv("SMTP_HOST");
        String portStr = System.getenv("SMTP_PORT");
        smtpPort = (portStr != null && !portStr.isBlank()) ? Integer.parseInt(portStr) : 587;
        smtpUser = System.getenv("SMTP_USER");
        smtpPassword = System.getenv("SMTP_PASSWORD");
        fromEmail = System.getenv("SMTP_FROM_EMAIL");
        fromName = System.getenv("SMTP_FROM_NAME");

        if (fromEmail == null || fromEmail.isBlank()) fromEmail = smtpUser;
        if (fromName == null || fromName.isBlank()) fromName = "TemcoServers";

        configured = smtpHost != null && !smtpHost.isBlank()
                && smtpUser != null && !smtpUser.isBlank()
                && smtpPassword != null && !smtpPassword.isBlank();

        if (configured) {
            LOG.info("EmailService configured: " + smtpHost + ":" + smtpPort + " from=" + fromEmail);
        } else {
            LOG.warning("EmailService NOT configured — emails will be skipped. " +
                    "Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD env variables.");
        }
    }

    public boolean isConfigured() {
        return configured;
    }

    @Asynchronous
    public void sendEmailAsync(String toEmail, String subject, String textBody) {
        sendEmail(toEmail, subject, textBody);
    }

    @Asynchronous
    public void sendHtmlEmailAsync(String toEmail, String ccEmail, String subject, String htmlBody) {
        sendHtmlEmail(toEmail, ccEmail, subject, htmlBody);
    }

    public boolean sendHtmlEmail(String toEmail, String ccEmail, String subject, String htmlBody) {
        if (!configured) {
            LOG.fine("HTML email skipped (not configured): to=" + toEmail);
            return false;
        }
        if (toEmail == null || toEmail.isBlank()) {
            LOG.warning("HTML email skipped: recipient is null/blank");
            return false;
        }
        try {
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.host", smtpHost);
            props.put("mail.smtp.port", String.valueOf(smtpPort));
            props.put("mail.smtp.ssl.trust", smtpHost);
            props.put("mail.smtp.connectiontimeout", "10000");
            props.put("mail.smtp.timeout", "10000");

            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(smtpUser, smtpPassword);
                }
            });

            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(fromEmail, fromName));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail));
            if (ccEmail != null && !ccEmail.isBlank()) {
                message.setRecipients(Message.RecipientType.CC, InternetAddress.parse(ccEmail));
            }
            message.setSubject(subject);
            message.setContent(htmlBody, "text/html; charset=UTF-8");

            Transport.send(message);
            LOG.info("HTML email sent to " + toEmail + (ccEmail != null ? " CC:" + ccEmail : "") + ": " + subject);
            return true;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to send HTML email to " + toEmail + ": " + e.getMessage(), e);
            return false;
        }
    }

    public boolean sendEmail(String toEmail, String subject, String textBody) {
        if (!configured) {
            LOG.fine("Email skipped (not configured): to=" + toEmail + " subject=" + subject);
            return false;
        }

        if (toEmail == null || toEmail.isBlank()) {
            LOG.warning("Email skipped: recipient is null/blank");
            return false;
        }

        try {
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.host", smtpHost);
            props.put("mail.smtp.port", String.valueOf(smtpPort));
            props.put("mail.smtp.ssl.trust", smtpHost);
            props.put("mail.smtp.connectiontimeout", "10000");
            props.put("mail.smtp.timeout", "10000");

            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(smtpUser, smtpPassword);
                }
            });

            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(fromEmail, fromName));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail));
            message.setSubject(subject);
            message.setText(textBody);

            Transport.send(message);
            LOG.info("Email sent to " + toEmail + ": " + subject);
            return true;

        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to send email to " + toEmail + ": " + e.getMessage(), e);
            return false;
        }
    }
}
