package com.temcoservers.service;

import com.temcoservers.entity.GeneralUserProfile;
import com.temcoservers.entity.UserLogin;
import jakarta.ejb.EJB;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.mindrot.jbcrypt.BCrypt;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;
import java.util.logging.Logger;

@Stateless
public class AuthService {

    private static final Logger LOG = Logger.getLogger(AuthService.class.getName());

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    @EJB
    private EmailService emailService;

    private static final String JWT_SECRET = System.getenv("JWT_SECRET") != null
            ? System.getenv("JWT_SECRET")
            : "TemcoServers-JWT-Secret-2026-Change-In-Production";

    private static final long TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

    public Map<String, Object> authenticate(String username, String password) {
        TypedQuery<UserLogin> query = em.createQuery(
                "SELECT ul FROM UserLogin ul " +
                "JOIN FETCH ul.generalUserProfile " +
                "JOIN FETCH ul.userRole " +
                "WHERE ul.username = :username AND ul.isActive = 1",
                UserLogin.class
        );
        query.setParameter("username", username);

        List<UserLogin> results = query.getResultList();
        if (results.isEmpty()) {
            throw new SecurityException("Invalid username or password");
        }

        UserLogin userLogin = results.get(0);

        // BCrypt password verification
        if (!BCrypt.checkpw(password, userLogin.getPassword())) {
            throw new SecurityException("Invalid username or password");
        }

        GeneralUserProfile profile = userLogin.getGeneralUserProfile();
        String roleName = userLogin.getUserRole().getRoleName();

        String token = generateToken(
                userLogin.getLoginId(),
                profile.getGupId(),
                username,
                roleName
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", token);
        result.put("loginId", userLogin.getLoginId());
        result.put("gupId", profile.getGupId());
        result.put("username", username);
        result.put("role", roleName);
        result.put("firstName", profile.getFirstName());
        result.put("lastName", profile.getLastName());
        result.put("email", profile.getEmail());
        result.put("mobile", profile.getMobilePhone());
        result.put("profileImage", profile.getImg());

        return result;
    }

    public Map<String, Object> getUserFromToken(String token) {
        var claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .build()
                .parseSignedClaims(token)
                .getPayload();

        int gupId = claims.get("gupId", Integer.class);

        GeneralUserProfile profile = em.find(GeneralUserProfile.class, gupId);
        if (profile == null) {
            throw new SecurityException("User not found");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("loginId", claims.get("loginId", Integer.class));
        result.put("gupId", profile.getGupId());
        result.put("username", claims.getSubject());
        result.put("role", claims.get("role", String.class));
        result.put("firstName", profile.getFirstName());
        result.put("lastName", profile.getLastName());
        result.put("email", profile.getEmail());
        result.put("mobile", profile.getMobilePhone());
        result.put("profileImage", profile.getImg());

        return result;
    }

    public Map<String, Object> impersonateUser(int targetGupId, int adminLoginId) {
        // Find active user_login for the target gupId
        TypedQuery<UserLogin> query = em.createQuery(
                "SELECT ul FROM UserLogin ul " +
                "JOIN FETCH ul.generalUserProfile " +
                "JOIN FETCH ul.userRole " +
                "WHERE ul.generalUserProfile.gupId = :gupId AND ul.isActive = 1",
                UserLogin.class
        );
        query.setParameter("gupId", targetGupId);

        List<UserLogin> results = query.getResultList();
        if (results.isEmpty()) {
            throw new SecurityException("User not found or inactive");
        }

        UserLogin userLogin = results.get(0);
        GeneralUserProfile profile = userLogin.getGeneralUserProfile();
        String roleName = userLogin.getUserRole().getRoleName();

        // Generate a short-lived token (30 minutes) with impersonation claim
        String token = Jwts.builder()
                .subject(userLogin.getUsername())
                .claim("loginId", userLogin.getLoginId())
                .claim("gupId", profile.getGupId())
                .claim("role", roleName)
                .claim("impersonatedBy", adminLoginId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 30 * 60 * 1000)) // 30 min
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", token);
        result.put("loginId", userLogin.getLoginId());
        result.put("gupId", profile.getGupId());
        result.put("username", userLogin.getUsername());
        result.put("role", roleName);
        result.put("firstName", profile.getFirstName());
        result.put("lastName", profile.getLastName());
        result.put("email", profile.getEmail());
        result.put("mobile", profile.getMobilePhone());
        result.put("profileImage", profile.getImg());
        result.put("impersonating", true);

        return result;
    }

    private static final int SERVER_CUSTOMER_ROLE_ID = 57;
    private static final int DEFAULT_SI_ID = 505;

    @SuppressWarnings("unchecked")
    public Map<String, Object> lookupByNic(String nic) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT gup_id, first_name, last_name, email, mobile_phone " +
                "FROM general_user_profile WHERE nic = :nic")
                .setParameter("nic", nic.trim()).getResultList();
        if (rows.isEmpty()) return null;

        Object[] r = rows.get(0);
        int gupId = ((Number) r[0]).intValue();

        // Check if a user_login already exists for this GUP
        Number loginCount = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM user_login WHERE general_user_profilegup_id = :gupId AND is_active = 1")
                .setParameter("gupId", gupId).getSingleResult();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("gupId", gupId);
        result.put("firstName", r[1]);
        result.put("lastName", r[2]);
        result.put("email", r[3]);
        result.put("mobile", r[4]);
        result.put("hasAccount", loginCount.intValue() > 0);
        return result;
    }

    // =========================================================================
    // OTP — Registration Email Verification
    // =========================================================================

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int OTP_MAX_REQUESTS_PER_HOUR = 3;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @SuppressWarnings("unchecked")
    public Map<String, Object> sendOtp(String nic, String email) {
        // Rate limit: max 3 OTP requests per NIC per hour
        Number recentCount = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM ts_registration_otp " +
                "WHERE nic = :nic AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)")
                .setParameter("nic", nic).getSingleResult();
        if (recentCount.intValue() >= OTP_MAX_REQUESTS_PER_HOUR) {
            throw new IllegalStateException("Too many OTP requests. Please try again later.");
        }

        // Generate 6-digit OTP
        String otpCode = String.format("%06d", SECURE_RANDOM.nextInt(1000000));

        // Store in DB
        em.createNativeQuery(
                "INSERT INTO ts_registration_otp (nic, email, otp_code, expires_at) " +
                "VALUES (:nic, :email, :otp, DATE_ADD(NOW(), INTERVAL :mins MINUTE))")
                .setParameter("nic", nic)
                .setParameter("email", email)
                .setParameter("otp", otpCode)
                .setParameter("mins", OTP_EXPIRY_MINUTES)
                .executeUpdate();

        // Load the HTML template
        List<Object[]> tplRows = em.createNativeQuery(
                "SELECT subject, content FROM email_template WHERE name = 'TXN_REGISTRATION_OTP'")
                .getResultList();

        // CC admin during staging period (remove after Sep 2026)
        String adminCc = "ishantha@gmail.com";

        boolean sent = false;
        if (!tplRows.isEmpty()) {
            String subject = (String) tplRows.get(0)[0];
            String htmlBody = ((String) tplRows.get(0)[1]).replace("{{OTP_CODE}}", otpCode);
            sent = emailService.sendHtmlEmail(email, adminCc, subject, htmlBody);
        } else {
            // Fallback: plain text if template not found
            sent = emailService.sendEmail(email,
                    "TemcoServers — Your Verification Code",
                    "Your OTP code is: " + otpCode + "\nThis code expires in " + OTP_EXPIRY_MINUTES + " minutes.");
        }

        // Mask email for frontend display
        String masked = maskEmail(email);

        LOG.info("OTP sent for NIC=" + nic + " to=" + masked + " delivered=" + sent);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sent", sent);
        result.put("maskedEmail", masked);
        result.put("expiresInMinutes", OTP_EXPIRY_MINUTES);
        return result;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> verifyOtp(String nic, String otpCode) {
        // Find latest unexpired, unverified OTP for this NIC
        List<Object[]> rows = em.createNativeQuery(
                "SELECT id, otp_code, attempts, email FROM ts_registration_otp " +
                "WHERE nic = :nic AND verified = 0 AND expires_at > NOW() " +
                "ORDER BY created_at DESC LIMIT 1")
                .setParameter("nic", nic).getResultList();

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("OTP expired or not found. Please request a new one.");
        }

        int otpId = ((Number) rows.get(0)[0]).intValue();
        String storedOtp = (String) rows.get(0)[1];
        int attempts = ((Number) rows.get(0)[2]).intValue();

        if (attempts >= 5) {
            throw new IllegalArgumentException("Too many failed attempts. Please request a new OTP.");
        }

        // Increment attempt count
        em.createNativeQuery("UPDATE ts_registration_otp SET attempts = attempts + 1 WHERE id = :id")
                .setParameter("id", otpId).executeUpdate();

        if (!storedOtp.equals(otpCode.trim())) {
            throw new SecurityException("Invalid OTP code. " + (4 - attempts) + " attempts remaining.");
        }

        // Mark verified
        em.createNativeQuery("UPDATE ts_registration_otp SET verified = 1 WHERE id = :id")
                .setParameter("id", otpId).executeUpdate();

        // Generate short-lived verification token (10 min) to pass to /register
        String verificationToken = Jwts.builder()
                .subject(nic)
                .claim("purpose", "registration_otp_verified")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 10 * 60 * 1000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("verified", true);
        result.put("verificationToken", verificationToken);
        return result;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@");
        String local = parts[0];
        if (local.length() <= 2) return local.charAt(0) + "***@" + parts[1];
        return local.substring(0, 2) + "***@" + parts[1];
    }

    // =========================================================================
    // Registration
    // =========================================================================

    public Map<String, Object> registerUser(Map<String, Object> data) {
        String username = ((String) data.get("username")).trim();
        String password = (String) data.get("password");
        String firstName = ((String) data.get("firstName")).trim();
        String lastName = ((String) data.get("lastName")).trim();
        String email = data.get("email") != null ? ((String) data.get("email")).trim() : null;
        String mobile = data.get("mobile") != null ? ((String) data.get("mobile")).trim() : null;
        String nic = data.get("nic") != null ? ((String) data.get("nic")).trim() : null;
        Integer existingGupId = data.get("gupId") != null ? ((Number) data.get("gupId")).intValue() : null;
        String verificationToken = data.get("verificationToken") != null ? (String) data.get("verificationToken") : null;

        // If linking to existing student profile, OTP verification token is REQUIRED
        if (existingGupId != null) {
            if (verificationToken == null || verificationToken.isBlank()) {
                throw new SecurityException("Email verification is required to link to an existing profile.");
            }
            try {
                var claims = Jwts.parser()
                        .verifyWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                        .build()
                        .parseSignedClaims(verificationToken)
                        .getPayload();
                String purpose = claims.get("purpose", String.class);
                if (!"registration_otp_verified".equals(purpose)) {
                    throw new SecurityException("Invalid verification token.");
                }
            } catch (SecurityException e) {
                throw e;
            } catch (Exception e) {
                throw new SecurityException("Verification token expired or invalid. Please verify your email again.");
            }
        }

        // Validate username uniqueness
        Number usernameExists = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM user_login WHERE username = :u")
                .setParameter("u", username).getSingleResult();
        if (usernameExists.intValue() > 0) {
            throw new IllegalArgumentException("Username already taken");
        }

        int gupId;
        if (existingGupId != null) {
            // Link to existing JIAT student profile — verify it exists
            Number gupExists = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM general_user_profile WHERE gup_id = :id")
                    .setParameter("id", existingGupId).getSingleResult();
            if (gupExists.intValue() == 0) {
                throw new IllegalArgumentException("Profile not found");
            }
            // Check no active login already exists for this GUP
            Number loginExists = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM user_login WHERE general_user_profilegup_id = :gupId AND is_active = 1")
                    .setParameter("gupId", existingGupId).getSingleResult();
            if (loginExists.intValue() > 0) {
                throw new IllegalArgumentException("An account already exists for this profile. Please login instead.");
            }
            gupId = existingGupId;
        } else {
            // Create new general_user_profile
            em.createNativeQuery(
                    "INSERT INTO general_user_profile (first_name, last_name, email, mobile_phone, nic, is_active, profile_created_date, created_at) " +
                    "VALUES (:fn, :ln, :email, :mobile, :nic, 1, CURDATE(), NOW())")
                    .setParameter("fn", firstName)
                    .setParameter("ln", lastName)
                    .setParameter("email", email)
                    .setParameter("mobile", mobile)
                    .setParameter("nic", nic)
                    .executeUpdate();
            gupId = ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).intValue();
        }

        // Create user_login with Server Customer role
        String hashed = BCrypt.hashpw(password, BCrypt.gensalt(12));
        em.createNativeQuery(
                "INSERT INTO user_login (username, password, is_active, general_user_profilegup_id, " +
                "user_role_ur_id, system_interface_si_id, max_login_attempt, count_attempt, is_first_time) " +
                "VALUES (:u, :p, 1, :gup, :role, :si, 5, 0, 1)")
                .setParameter("u", username)
                .setParameter("p", hashed)
                .setParameter("gup", gupId)
                .setParameter("role", SERVER_CUSTOMER_ROLE_ID)
                .setParameter("si", DEFAULT_SI_ID)
                .executeUpdate();

        // Auto-assign default privilege (View = 44)
        Number newLoginId = (Number) em.createNativeQuery(
                "SELECT login_id FROM user_login WHERE username = :u")
                .setParameter("u", username).getSingleResult();
        em.createNativeQuery(
                "INSERT INTO user_login_has_privileges (privileges_id, user_login_login_id) VALUES (44, :lid)")
                .setParameter("lid", newLoginId.intValue()).executeUpdate();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Account created successfully");
        result.put("username", username);
        result.put("gupId", gupId);
        return result;
    }

    private String generateToken(int loginId, int gupId, String username, String role) {
        return Jwts.builder()
                .subject(username)
                .claim("loginId", loginId)
                .claim("gupId", gupId)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + TOKEN_EXPIRY_MS))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
